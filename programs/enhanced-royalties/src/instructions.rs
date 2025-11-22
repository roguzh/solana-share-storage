use crate::account::{ErrorCode, ShareHolder, ShareStorage, SplShareStorage};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeShareStorage<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ShareStorage::INIT_SPACE,
        seeds = [b"share_storage", admin.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub share_storage: Account<'info, ShareStorage>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct SetHolders<'info> {
    #[account(
        mut,
        seeds = [b"share_storage", share_storage.admin.as_ref(), share_storage.name.as_bytes()],
        bump,
        has_one = admin
    )]
    pub share_storage: Account<'info, ShareStorage>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct DistributeShare<'info> {
    #[account(
        mut,
        seeds = [b"share_storage", share_storage.admin.as_ref(), share_storage.name.as_bytes()],
        bump
    )]
    pub share_storage: Account<'info, ShareStorage>,
    pub system_program: Program<'info, System>,
    // holder_accounts will be passed as remaining_accounts
    // The order must match the order in share_storage.holders
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct ToggleEnabled<'info> {
    #[account(
        mut,
        seeds = [b"share_storage", share_storage.admin.as_ref(), share_storage.name.as_bytes()],
        bump,
        has_one = admin
    )]
    pub share_storage: Account<'info, ShareStorage>,
    pub admin: Signer<'info>,
}

pub fn initialize_share_storage(ctx: Context<InitializeShareStorage>, name: String) -> Result<()> {
    // Validate name length
    require!(name.len() > 0 && name.len() <= 32, ErrorCode::InvalidName);

    let share_storage = &mut ctx.accounts.share_storage;

    share_storage.admin = ctx.accounts.admin.key();
    share_storage.name = name.clone();
    share_storage.enabled = true;
    share_storage.last_distributed_at = 0;
    share_storage.total_distributed = 0;
    share_storage.holders = Vec::new();

    msg!(
        "ShareStorage '{}' initialized by admin: {}",
        name,
        ctx.accounts.admin.key()
    );
    Ok(())
}

pub fn set_holders(
    ctx: Context<SetHolders>,
    _name: String, // Used for PDA derivation in accounts
    holders: Vec<ShareHolder>,
) -> Result<()> {
    let share_storage = &mut ctx.accounts.share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    // Validate maximum number of holders
    require!(holders.len() <= 16, ErrorCode::TooManyHolders);

    // Calculate total basis points and validate it equals exactly 10,000
    let total_basis_points: u32 = holders.iter().map(|h| h.share_basis_points as u32).sum();
    require!(
        total_basis_points == 10000,
        ErrorCode::InvalidShareDistribution
    );

    // Check for duplicate holders
    for i in 0..holders.len() {
        for j in i + 1..holders.len() {
            require!(
                holders[i].pubkey != holders[j].pubkey,
                ErrorCode::HolderAlreadyExists
            );
        }
    }

    // Set the new holders (replaces all existing holders)
    share_storage.holders = holders.clone();

    msg!(
        "Set {} holders for '{}' with exactly 10,000 basis points total",
        holders.len(),
        share_storage.name
    );
    Ok(())
}

pub fn distribute_share(ctx: Context<DistributeShare>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.share_storage;

    // Check if ShareStorage is enabled
    require!(share_storage.enabled, ErrorCode::ShareStorageDisabled);

    // Check that we have holders
    require!(!share_storage.holders.is_empty(), ErrorCode::NoHolders);

    // Verify we have the correct number of remaining accounts (one for each holder)
    require!(
        ctx.remaining_accounts.len() == share_storage.holders.len(),
        ErrorCode::InvalidHolderAccounts
    );

    // Get PDA info before borrowing issues
    let name_bytes = share_storage.name.clone();
    let current_balance = share_storage.to_account_info().lamports();
    let holders = share_storage.holders.clone(); // Clone to avoid borrow issues

    // Reserve minimum rent to keep account alive
    let rent_exempt_minimum =
        Rent::get()?.minimum_balance(share_storage.to_account_info().data_len());

    // Calculate distributable amount
    if current_balance <= rent_exempt_minimum {
        msg!(
            "No funds available for distribution in '{}' (balance: {}, rent minimum: {})",
            name_bytes,
            current_balance,
            rent_exempt_minimum
        );
        return Ok(());
    }

    let distributable_amount = current_balance - rent_exempt_minimum;

    let mut total_distributed = 0u64;
    let total_basis_points = 10000u32; // Always 10,000 since we enforce this

    // Distribute to each holder
    for (i, holder) in holders.iter().enumerate() {
        let holder_account_info = &ctx.remaining_accounts[i];

        // Verify the holder account matches the expected pubkey
        require!(
            holder_account_info.key() == holder.pubkey,
            ErrorCode::InvalidHolderAccount
        );

        // Calculate this holder's share
        let holder_share = (distributable_amount as u128 * holder.share_basis_points as u128
            / total_basis_points as u128) as u64;

        if holder_share > 0 {
            // Transfer lamports directly using **sub_lamports and **add_lamports
            share_storage.to_account_info().sub_lamports(holder_share)?;
            holder_account_info.add_lamports(holder_share)?;

            total_distributed += holder_share;

            msg!(
                "Distributed {} lamports to holder {} ({}% share)",
                holder_share,
                holder.pubkey,
                holder.share_basis_points as f64 / 100.0
            );
        }
    }

    // Handle any remainder due to rounding
    let remainder = distributable_amount - total_distributed;
    if remainder > 0 {
        // Give remainder to the first holder
        let first_holder_account = &ctx.remaining_accounts[0];

        share_storage.to_account_info().sub_lamports(remainder)?;
        first_holder_account.add_lamports(remainder)?;
        total_distributed += remainder;

        msg!(
            "Distributed {} lamports remainder to first holder {}",
            remainder,
            holders[0].pubkey
        );
    }

    // Update storage - track the distribution
    let clock = Clock::get()?;
    share_storage.total_distributed = share_storage
        .total_distributed
        .checked_add(total_distributed)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    share_storage.last_distributed_at = clock.unix_timestamp;

    msg!(
        "Successfully distributed {} lamports among {} holders in '{}'",
        total_distributed,
        holders.len(),
        name_bytes
    );
    Ok(())
}

pub fn enable_share_storage(ctx: Context<ToggleEnabled>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    share_storage.enabled = true;
    msg!("ShareStorage '{}' enabled", share_storage.name);
    Ok(())
}

pub fn disable_share_storage(ctx: Context<ToggleEnabled>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    share_storage.enabled = false;
    msg!("ShareStorage '{}' disabled", share_storage.name);
    Ok(())
}

// ============= SPL Share Storage Instructions =============

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeSplShareStorage<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + SplShareStorage::INIT_SPACE,
        seeds = [b"spl_share_storage", admin.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub spl_share_storage: Account<'info, SplShareStorage>,
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = spl_share_storage,
        seeds = [b"spl_token_vault", spl_share_storage.key().as_ref()],
        bump
    )]
    pub token_vault: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct SetSplHolders<'info> {
    #[account(
        mut,
        seeds = [b"spl_share_storage", spl_share_storage.admin.as_ref(), spl_share_storage.name.as_bytes()],
        bump,
        has_one = admin
    )]
    pub spl_share_storage: Account<'info, SplShareStorage>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct DistributeSplShare<'info> {
    #[account(
        mut,
        seeds = [b"spl_share_storage", spl_share_storage.admin.as_ref(), spl_share_storage.name.as_bytes()],
        bump,
        has_one = token_mint
    )]
    pub spl_share_storage: Account<'info, SplShareStorage>,
    #[account(
        mut,
        seeds = [b"spl_token_vault", spl_share_storage.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = spl_share_storage
    )]
    pub token_vault: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    // holder_token_accounts will be passed as remaining_accounts
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct ToggleSplEnabled<'info> {
    #[account(
        mut,
        seeds = [b"spl_share_storage", spl_share_storage.admin.as_ref(), spl_share_storage.name.as_bytes()],
        bump,
        has_one = admin
    )]
    pub spl_share_storage: Account<'info, SplShareStorage>,
    pub admin: Signer<'info>,
}

pub fn initialize_spl_share_storage(
    ctx: Context<InitializeSplShareStorage>,
    name: String,
) -> Result<()> {
    // Validate name length
    require!(name.len() > 0 && name.len() <= 32, ErrorCode::InvalidName);

    let share_storage = &mut ctx.accounts.spl_share_storage;

    share_storage.admin = ctx.accounts.admin.key();
    share_storage.token_mint = ctx.accounts.token_mint.key();
    share_storage.name = name.clone();
    share_storage.enabled = true;
    share_storage.last_distributed_at = 0;
    share_storage.total_distributed = 0;
    share_storage.holders = Vec::new();

    msg!(
        "SplShareStorage '{}' initialized by admin: {} with token vault: {}",
        name,
        ctx.accounts.admin.key(),
        ctx.accounts.token_vault.key()
    );
    Ok(())
}

pub fn set_spl_holders(
    ctx: Context<SetSplHolders>,
    _name: String,
    holders: Vec<ShareHolder>,
) -> Result<()> {
    let share_storage = &mut ctx.accounts.spl_share_storage;
    // Admin authorization is enforced by has_one = admin constraint

    // Validate maximum number of holders
    require!(holders.len() <= 16, ErrorCode::TooManyHolders);

    // Calculate total basis points and validate it equals exactly 10,000
    let total_basis_points: u32 = holders.iter().map(|h| h.share_basis_points as u32).sum();
    require!(
        total_basis_points == 10000,
        ErrorCode::InvalidShareDistribution
    );

    // Check for duplicate holders
    for i in 0..holders.len() {
        for j in i + 1..holders.len() {
            require!(
                holders[i].pubkey != holders[j].pubkey,
                ErrorCode::HolderAlreadyExists
            );
        }
    }

    // Set the new holders (replaces all existing holders)
    share_storage.holders = holders.clone();

    msg!(
        "Set {} holders for '{}' with exactly 10,000 basis points total",
        holders.len(),
        share_storage.name
    );
    Ok(())
}

pub fn distribute_spl_share<'info>(ctx: Context<'_, '_, '_, 'info, DistributeSplShare<'info>>, _name: String) -> Result<()> {
    let spl_share_storage = &ctx.accounts.spl_share_storage;
    
    // Check if SplShareStorage is enabled
    require!(spl_share_storage.enabled, ErrorCode::ShareStorageDisabled);
    
    // Check that we have holders
    require!(!spl_share_storage.holders.is_empty(), ErrorCode::NoHolders);
    
    // Verify we have the correct number of remaining accounts (one token account for each holder)
    require!(
        ctx.remaining_accounts.len() == spl_share_storage.holders.len(),
        ErrorCode::InvalidHolderAccounts
    );
    
    let holders = spl_share_storage.holders.clone();
    let vault_balance = ctx.accounts.token_vault.amount;
    let storage_name = spl_share_storage.name.clone();
    let token_mint_key = ctx.accounts.token_mint.key();
    
    // Check if we have tokens to distribute
    if vault_balance == 0 {
        msg!("No tokens available for distribution in '{}'", storage_name);
        return Ok(());
    }
    
    let mut total_distributed = 0u64;
    let total_basis_points = 10000u32;
    
    // Get PDA seeds for signing
    let admin_key = spl_share_storage.admin;
    let name_bytes = storage_name.as_bytes();
    let bump = ctx.bumps.spl_share_storage;
    let seeds = &[
        b"spl_share_storage".as_ref(),
        admin_key.as_ref(),
        name_bytes,
        &[bump],
    ];
    let signer = &[&seeds[..]];
    
    // Get account infos once to avoid lifetime issues
    let token_vault_info = ctx.accounts.token_vault.to_account_info();
    let authority_info = ctx.accounts.spl_share_storage.to_account_info();
    let token_program_info = ctx.accounts.token_program.to_account_info();
    
    // Distribute to each holder
    for (i, holder) in holders.iter().enumerate() {
        let holder_token_account = &ctx.remaining_accounts[i];
        
        // Validate it's the correct ATA for this holder
        let expected_ata = get_associated_token_address(&holder.pubkey, &token_mint_key);
        require!(
            holder_token_account.key() == expected_ata,
            ErrorCode::InvalidHolderAccount
        );
        
        // Calculate this holder's share
        let holder_share = (vault_balance as u128 * holder.share_basis_points as u128 
            / total_basis_points as u128) as u64;
        
        if holder_share > 0 {
            // Transfer tokens using CPI
            token::transfer(
                CpiContext::new_with_signer(
                    token_program_info.clone(),
                    Transfer {
                        from: token_vault_info.clone(),
                        to: holder_token_account.clone(),
                        authority: authority_info.clone(),
                    },
                    signer,
                ),
                holder_share,
            )?;
            
            total_distributed += holder_share;
            
            msg!(
                "Distributed {} tokens to holder {} ({}% share)",
                holder_share,
                holder.pubkey,
                holder.share_basis_points as f64 / 100.0
            );
        }
    }
    
    // Handle any remainder due to rounding
    let remainder = vault_balance - total_distributed;
    if remainder > 0 {
        // Validate first holder's ATA again for remainder
        let first_holder_token_account = &ctx.remaining_accounts[0];
        let expected_ata = get_associated_token_address(&holders[0].pubkey, &token_mint_key);
        require!(
            first_holder_token_account.key() == expected_ata,
            ErrorCode::InvalidHolderAccount
        );
        
        token::transfer(
            CpiContext::new_with_signer(
                token_program_info.clone(),
                Transfer {
                    from: token_vault_info.clone(),
                    to: first_holder_token_account.clone(),
                    authority: authority_info.clone(),
                },
                signer,
            ),
            remainder,
        )?;
        
        total_distributed += remainder;
        
        msg!(
            "Distributed {} tokens remainder to first holder {}",
            remainder,
            holders[0].pubkey
        );
    }
    
    // Update storage - track the distribution
    let clock = Clock::get()?;
    let spl_share_storage = &mut ctx.accounts.spl_share_storage;
    spl_share_storage.total_distributed = spl_share_storage
        .total_distributed
        .checked_add(total_distributed)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    spl_share_storage.last_distributed_at = clock.unix_timestamp;
    
    msg!(
        "Successfully distributed {} tokens among {} holders in '{}'",
        total_distributed,
        holders.len(),
        storage_name
    );
    Ok(())
}

pub fn enable_spl_share_storage(ctx: Context<ToggleSplEnabled>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.spl_share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    share_storage.enabled = true;
    msg!("ShareStorage '{}' enabled", share_storage.name);
    Ok(())
}

pub fn disable_spl_share_storage(ctx: Context<ToggleSplEnabled>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.spl_share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    share_storage.enabled = false;
    msg!("ShareStorage '{}' disabled", share_storage.name);
    Ok(())
}
