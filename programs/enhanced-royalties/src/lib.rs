use anchor_lang::prelude::*;

pub mod account;
pub mod instructions;

use instructions::*;

declare_id!("6XLJppAifd5mixoxywpBsTV9ipYgFBQiGg9HaNbtYe3e");

#[program]
pub mod enhanced_royalties {
    use super::*;

    /// Initialize a new ShareStorage account with a name
    pub fn initialize_share_storage(ctx: Context<InitializeShareStorage>, name: String) -> Result<()> {
        instructions::initialize_share_storage(ctx, name)
    }

    /// Deposit funds to the ShareStorage account
    pub fn deposit_funds(ctx: Context<DepositFunds>, name: String, amount: u64) -> Result<()> {
        instructions::deposit_funds(ctx, name, amount)
    }

    /// Set all holders for the ShareStorage (replaces existing holders)
    pub fn set_holders(
        ctx: Context<SetHolders>,
        name: String,
        holders: Vec<account::ShareHolder>,
    ) -> Result<()> {
        instructions::set_holders(ctx, name, holders)
    }

    /// Distribute all available shares to holders
    pub fn distribute_share(ctx: Context<DistributeShare>, name: String) -> Result<()> {
        instructions::distribute_share(ctx, name)
    }

    /// Enable the ShareStorage (admin only)
    pub fn enable_share_storage(ctx: Context<ToggleEnabled>, name: String) -> Result<()> {
        instructions::enable_share_storage(ctx, name)
    }

    /// Disable the ShareStorage (admin only)
    pub fn disable_share_storage(ctx: Context<ToggleEnabled>, name: String) -> Result<()> {
        instructions::disable_share_storage(ctx, name)
    }
}
