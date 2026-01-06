use crate::account::{ErrorCode, ShareHolder, ShareStorage, TokenDistributionRecord};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

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

/// Distribute SOL from the share storage to holders
#[derive(Accounts)]
#[instruction(name: String)]
pub struct DistributeSol<'info> {
    #[account(
        mut,
        seeds = [b"share_storage", share_storage.admin.as_ref(), share_storage.name.as_bytes()],
        bump
    )]
    pub share_storage: Account<'info, ShareStorage>,
    pub system_program: Program<'info, System>,
}

/// Distribute SPL tokens from the share storage to holders
#[derive(Accounts)]
#[instruction(name: String)]
pub struct DistributeTokens<'info> {
    #[account(
        mut,
        seeds = [b"share_storage", share_storage.admin.as_ref(), share_storage.name.as_bytes()],
        bump
    )]
    pub share_storage: Account<'info, ShareStorage>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = share_storage,
        associated_token::token_program = token_program,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    /// Token distribution record - tracks per-mint distribution stats
    /// Created on first distribution for this mint
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + TokenDistributionRecord::INIT_SPACE,
        seeds = [b"token_dist", share_storage.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub token_distribution_record: Account<'info, TokenDistributionRecord>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
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

    Ok(())
}

/// Distribute SOL from the share storage to holders
pub fn distribute_sol<'info>(
    ctx: Context<'_, '_, 'info, 'info, DistributeSol<'info>>,
    _name: String,
) -> Result<()> {
    require!(
        ctx.accounts.share_storage.enabled,
        ErrorCode::ShareStorageDisabled
    );
    require!(
        !ctx.accounts.share_storage.holders.is_empty(),
        ErrorCode::NoHolders
    );
    require!(
        ctx.remaining_accounts.len() == ctx.accounts.share_storage.holders.len(),
        ErrorCode::InvalidHolderAccounts
    );

    let holders = ctx.accounts.share_storage.holders.clone();
    let share_storage_info = ctx.accounts.share_storage.to_account_info();
    let current_balance = share_storage_info.lamports();
    let rent_exempt_minimum = Rent::get()?.minimum_balance(share_storage_info.data_len());

    if current_balance <= rent_exempt_minimum {
        return Ok(());
    }

    let distributable_amount = current_balance - rent_exempt_minimum;
    let mut sol_distributed = 0u64;
    let total_basis_points = 10000u32;

    // Distribute to each holder
    for (i, holder) in holders.iter().enumerate() {
        let holder_account_info = &ctx.remaining_accounts[i];

        require!(
            holder_account_info.key() == holder.pubkey,
            ErrorCode::InvalidHolderAccount
        );

        let holder_share = (distributable_amount as u128 * holder.share_basis_points as u128
            / total_basis_points as u128) as u64;

        if holder_share > 0 {
            share_storage_info.sub_lamports(holder_share)?;
            holder_account_info.add_lamports(holder_share)?;
            sol_distributed += holder_share;
        }
    }

    // Handle any remainder due to rounding
    let remainder = distributable_amount - sol_distributed;
    if remainder > 0 {
        let first_holder_account = &ctx.remaining_accounts[0];
        share_storage_info.sub_lamports(remainder)?;
        first_holder_account.add_lamports(remainder)?;
        sol_distributed += remainder;
    }

    // Update share storage stats
    let share_storage = &mut ctx.accounts.share_storage;
    share_storage.total_distributed = share_storage
        .total_distributed
        .checked_add(sol_distributed)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    share_storage.last_distributed_at = Clock::get()?.unix_timestamp;

    Ok(())
}

/// Distribute SPL tokens from the share storage to holders
pub fn distribute_tokens<'info>(
    ctx: Context<'_, '_, 'info, 'info, DistributeTokens<'info>>,
    _name: String,
) -> Result<()> {
    require!(
        ctx.accounts.share_storage.enabled,
        ErrorCode::ShareStorageDisabled
    );
    require!(
        !ctx.accounts.share_storage.holders.is_empty(),
        ErrorCode::NoHolders
    );
    require!(
        ctx.remaining_accounts.len() == ctx.accounts.share_storage.holders.len(),
        ErrorCode::InvalidHolderAccounts
    );

    let name_bytes = ctx.accounts.share_storage.name.clone();
    let admin_key = ctx.accounts.share_storage.admin;
    let holders = ctx.accounts.share_storage.holders.clone();
    let bump = ctx.bumps.share_storage;

    let token_account_info = ctx.accounts.token_account.to_account_info();
    let token_program_info = ctx.accounts.token_program.to_account_info();
    let share_storage_info = ctx.accounts.share_storage.to_account_info();
    let token_amount = ctx.accounts.token_account.amount;
    let expected_mint = ctx.accounts.token_mint.key();
    let decimals = ctx.accounts.token_mint.decimals;
    let mint_info = ctx.accounts.token_mint.to_account_info();

    if token_amount == 0 {
        return Ok(());
    }

    // Validate all holder token accounts before distribution
    for (i, holder) in holders.iter().enumerate() {
        let holder_token_account_info = &ctx.remaining_accounts[i];
        
        let holder_token_account: InterfaceAccount<TokenAccount> = 
            InterfaceAccount::try_from(holder_token_account_info)?;
        
        require!(
            holder_token_account.mint == expected_mint,
            ErrorCode::InvalidTokenMint
        );
        require!(
            holder_token_account.owner == holder.pubkey,
            ErrorCode::InvalidTokenOwner
        );
        require!(
            !holder_token_account.is_frozen(),
            ErrorCode::TokenAccountFrozen
        );
    }

    let distributable_amount = token_amount;
    let mut tokens_distributed = 0u64;
    let total_basis_points = 10000u32;

    // Prepare PDA signer seeds
    let signer_seeds: &[&[&[u8]]] =
        &[&[b"share_storage", admin_key.as_ref(), name_bytes.as_bytes(), &[bump]]];

    // Distribute tokens to each holder
    for (i, holder) in holders.iter().enumerate() {
        let holder_token_account = &ctx.remaining_accounts[i];

        let holder_share = (distributable_amount as u128 * holder.share_basis_points as u128
            / total_basis_points as u128) as u64;

        if holder_share > 0 {
            let cpi_accounts = TransferChecked {
                from: token_account_info.clone(),
                mint: mint_info.clone(),
                to: holder_token_account.clone(),
                authority: share_storage_info.clone(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                token_program_info.clone(),
                cpi_accounts,
                signer_seeds,
            );

            transfer_checked(cpi_ctx, holder_share, decimals)?;
            tokens_distributed += holder_share;
        }
    }

    // Handle any remainder due to rounding
    let remainder = distributable_amount - tokens_distributed;
    if remainder > 0 {
        let first_holder_token_account = &ctx.remaining_accounts[0];

        let cpi_accounts = TransferChecked {
            from: token_account_info.clone(),
            mint: mint_info.clone(),
            to: first_holder_token_account.clone(),
            authority: share_storage_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program_info.clone(),
            cpi_accounts,
            signer_seeds,
        );

        transfer_checked(cpi_ctx, remainder, decimals)?;
        tokens_distributed += remainder;
    }

    // Update token distribution record
    let record = &mut ctx.accounts.token_distribution_record;
    record.share_storage = ctx.accounts.share_storage.key();
    record.mint = expected_mint;
    record.total_distributed = record
        .total_distributed
        .checked_add(tokens_distributed)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    record.last_distributed_at = Clock::get()?.unix_timestamp;

    // Update share storage timestamp
    let share_storage = &mut ctx.accounts.share_storage;
    share_storage.last_distributed_at = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn enable_share_storage(ctx: Context<ToggleEnabled>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    share_storage.enabled = true;

    Ok(())
}

pub fn disable_share_storage(ctx: Context<ToggleEnabled>, _name: String) -> Result<()> {
    let share_storage = &mut ctx.accounts.share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    share_storage.enabled = false;

    Ok(())
}
