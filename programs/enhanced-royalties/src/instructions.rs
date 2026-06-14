use crate::account::{ErrorCode, ShareHolder, ShareStorage, TokenDistributionRecord};
use anchor_lang::prelude::*;

/// Anchor discriminator for ShareStorage — sha256("account:ShareStorage")[0..8]
const SHARE_STORAGE_DISCRIMINATOR: [u8; 8] = [7, 125, 46, 177, 253, 137, 208, 123];
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

pub fn initialize_share_storage<'info>(
    ctx: Context<'_, '_, 'info, 'info, InitializeShareStorage<'info>>,
    name: String,
    parent: Option<Pubkey>,
) -> Result<()> {
    require!(name.len() > 0 && name.len() <= 32, ErrorCode::InvalidName);

    // If parent is provided, validate it exists and shares the same admin
    if let Some(parent_key) = parent {
        require!(
            ctx.remaining_accounts.len() >= 1,
            ErrorCode::InvalidParentAccount
        );
        let parent_account_info = &ctx.remaining_accounts[0];
        require!(
            parent_account_info.key() == parent_key,
            ErrorCode::InvalidParentAccount
        );
        let parent_storage: Account<ShareStorage> =
            Account::try_from(parent_account_info)?;
        require!(
            parent_storage.admin == ctx.accounts.admin.key(),
            ErrorCode::ParentAdminMismatch
        );
    }

    let share_storage = &mut ctx.accounts.share_storage;

    share_storage.admin = ctx.accounts.admin.key();
    share_storage.name = name.clone();
    share_storage.enabled = true;
    share_storage.last_distributed_at = 0;
    share_storage.total_distributed = 0;
    share_storage.holders = Vec::new();
    share_storage.parent = parent;

    Ok(())
}

pub fn set_holders<'info>(
    ctx: Context<'_, '_, 'info, 'info, SetHolders<'info>>,
    _name: String, // Used for PDA derivation in accounts
    holders: Vec<ShareHolder>,
) -> Result<()> {
    // Capture keys before taking the mutable borrow
    let storage_key = ctx.accounts.share_storage.key();

    let share_storage = &mut ctx.accounts.share_storage;

    // Admin authorization is enforced by has_one = admin constraint

    require!(holders.len() <= 16, ErrorCode::TooManyHolders);

    let total_basis_points: u32 = holders.iter().map(|h| h.share_basis_points as u32).sum();
    require!(
        total_basis_points == 10000,
        ErrorCode::InvalidShareDistribution
    );

    // Reject self-reference and duplicates
    for i in 0..holders.len() {
        require!(
            holders[i].pubkey != storage_key,
            ErrorCode::InvalidHolderAccount
        );
        for j in i + 1..holders.len() {
            require!(
                holders[i].pubkey != holders[j].pubkey,
                ErrorCode::HolderAlreadyExists
            );
        }
    }

    // Validate sub-storage holders: remaining_accounts must contain each storage holder
    // in the order they appear in the holders array (wallet holders are skipped)
    let storage_holders: Vec<&ShareHolder> =
        holders.iter().filter(|h| h.is_storage).collect();

    require!(
        ctx.remaining_accounts.len() == storage_holders.len(),
        ErrorCode::InvalidHolderAccounts
    );

    let admin_key = share_storage.admin;
    for (i, holder) in storage_holders.iter().enumerate() {
        let sub_storage_info = &ctx.remaining_accounts[i];
        require!(
            sub_storage_info.key() == holder.pubkey,
            ErrorCode::InvalidHolderAccount
        );
        let sub_storage: Account<ShareStorage> = Account::try_from(sub_storage_info)?;
        require!(
            sub_storage.admin == admin_key,
            ErrorCode::ParentAdminMismatch
        );
    }

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

    require!(
        current_balance > rent_exempt_minimum,
        ErrorCode::InsufficientFunds
    );

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
        require!(holder_account_info.is_writable, ErrorCode::InvalidHolderAccount);

        let holder_share = (distributable_amount as u128 * holder.share_basis_points as u128
            / total_basis_points as u128) as u64;

        if holder_share > 0 {
            share_storage_info.sub_lamports(holder_share)?;
            holder_account_info.add_lamports(holder_share)?;
            sol_distributed += holder_share;
        }
    }

    // Remainder from integer division goes to the first holder (documented bias)
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

    require!(token_amount > 0, ErrorCode::InsufficientFunds);

    let distributable_amount = token_amount;
    let mut tokens_distributed = 0u64;
    let total_basis_points = 10000u32;

    // Prepare PDA signer seeds
    let signer_seeds: &[&[&[u8]]] =
        &[&[b"share_storage", admin_key.as_ref(), name_bytes.as_bytes(), &[bump]]];

    // Validate each holder token account and transfer in a single pass
    for (i, holder) in holders.iter().enumerate() {
        let holder_token_account_info = &ctx.remaining_accounts[i];

        require!(
            holder_token_account_info.is_writable,
            ErrorCode::InvalidHolderAccount
        );

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

        let holder_share = (distributable_amount as u128 * holder.share_basis_points as u128
            / total_basis_points as u128) as u64;

        if holder_share > 0 {
            let cpi_accounts = TransferChecked {
                from: token_account_info.clone(),
                mint: mint_info.clone(),
                to: holder_token_account_info.clone(),
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

    // Remainder from integer division goes to the first holder (documented bias)
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

    let now = Clock::get()?.unix_timestamp;

    // Update token distribution record
    let record = &mut ctx.accounts.token_distribution_record;
    record.share_storage = ctx.accounts.share_storage.key();
    record.mint = expected_mint;
    record.total_distributed = record
        .total_distributed
        .checked_add(tokens_distributed)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    record.last_distributed_at = now;

    // Update share storage timestamp
    let share_storage = &mut ctx.accounts.share_storage;
    share_storage.last_distributed_at = now;

    Ok(())
}

/// Migrate a pre-SPL ShareStorage account to the current format.
///
/// Old holder layout: [pubkey: 32][share_basis_points: 2]          (34 bytes each, no is_storage)
/// New holder layout: [pubkey: 32][share_basis_points: 2][is_storage: 1] (35 bytes each)
/// New account also appends [parent: Option<Pubkey>] (1 byte for None) at the end.
///
/// Migration sets is_storage = false for all holders and parent = None.
#[derive(Accounts)]
pub struct MigrateStorage<'info> {
    /// CHECK: Raw bytes are parsed manually to handle the pre-migration Borsh format.
    #[account(mut, owner = crate::ID)]
    pub share_storage: UncheckedAccount<'info>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn migrate_storage(ctx: Context<MigrateStorage>) -> Result<()> {
    // Anchor always allocates INIT_SPACE regardless of actual data size, so old
    // and new accounts have well-known fixed sizes.
    //   Old (no is_storage, no parent): 8 discriminator + 633 INIT_SPACE = 641
    //   New (is_storage + parent):      8 discriminator + 682 INIT_SPACE = 690
    const OLD_SIZE: usize = 641;
    const NEW_SIZE: usize = 8 + ShareStorage::INIT_SPACE;

    let share_storage_info = ctx.accounts.share_storage.to_account_info();

    // ── Parse and validate account ────────────────────────────────────────────
    let (holders_data_start, holders_count) = {
        let data = share_storage_info.try_borrow_data()?;

        // Verify this is a ShareStorage account before touching anything else
        require!(
            data[0..8] == SHARE_STORAGE_DISCRIMINATOR,
            ErrorCode::InvalidMigration
        );

        // Bytes 8..40: admin pubkey — check authorization before revealing migration state
        let stored_admin = Pubkey::try_from(&data[8..40])
            .map_err(|_| error!(ErrorCode::InvalidMigration))?;
        require!(
            stored_admin == ctx.accounts.admin.key(),
            ErrorCode::Unauthorized
        );

        // Detect migration state via fixed account size
        if data.len() == NEW_SIZE {
            return err!(ErrorCode::AlreadyMigrated);
        }
        require!(data.len() == OLD_SIZE, ErrorCode::InvalidMigration);

        // Bytes 40..44: name length prefix
        let name_len = u32::from_le_bytes(
            data[40..44]
                .try_into()
                .map_err(|_| error!(ErrorCode::InvalidMigration))?,
        ) as usize;
        require!(name_len <= 32, ErrorCode::InvalidMigration);

        // After name: enabled(1) + last_distributed_at(8) + total_distributed(8) = 17 bytes
        // Then holders vec count prefix (4 bytes)
        let holders_count_offset = 44 + name_len + 17;
        // Explicit bounds guard — always true given data.len() == OLD_SIZE == 641 and
        // max holders_count_offset + 4 == 97, but kept for defence-in-depth.
        require!(
            holders_count_offset + 4 <= data.len(),
            ErrorCode::InvalidMigration
        );
        let holders_count = u32::from_le_bytes(
            data[holders_count_offset..holders_count_offset + 4]
                .try_into()
                .map_err(|_| error!(ErrorCode::InvalidMigration))?,
        ) as usize;
        require!(holders_count <= 16, ErrorCode::InvalidMigration);

        let holders_data_start = holders_count_offset + 4;

        (holders_data_start, holders_count)
    };

    // ── Top up rent for the 49 extra bytes (16 is_storage flags + 33 parent) ─
    let rent = Rent::get()?;
    let old_rent = rent.minimum_balance(OLD_SIZE);
    let new_rent = rent.minimum_balance(NEW_SIZE);
    let rent_diff = new_rent.saturating_sub(old_rent);

    if rent_diff > 0 {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: share_storage_info.clone(),
                },
            ),
            rent_diff,
        )?;
    }

    // ── Resize to current account size ────────────────────────────────────────
    share_storage_info.resize(NEW_SIZE)?;

    // ── Rewrite holder bytes with injected is_storage = false ─────────────────
    // Borsh reads holders sequentially: [count][holder0][holder1]...[holderN-1]
    // then immediately reads parent.  We write from the end backwards to avoid
    // clobbering source bytes that haven't been copied yet (old layout is denser).
    let mut data = share_storage_info.try_borrow_mut_data()?;

    // Write in reverse so later slots don't overwrite earlier source bytes
    for i in (0..holders_count).rev() {
        let src = i * 34;
        let dst = holders_data_start + i * 35;
        data.copy_within(holders_data_start + src..holders_data_start + src + 34, dst);
        data[dst + 34] = 0u8; // is_storage = false
    }

    // parent = None (Option discriminant 0); rest of allocation stays as zeros
    data[holders_data_start + holders_count * 35] = 0u8;

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
