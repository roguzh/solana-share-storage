use anchor_lang::prelude::*;

pub mod account;
pub mod instructions;

use instructions::*;

declare_id!("9B6FPPgiuSdD4wJauWWtvYas4xK4eBQypKjDZDRw2ft9");

#[program]
pub mod enhanced_royalties {
    use super::*;

    /// Initialize a new ShareStorage account with a name
    pub fn initialize_share_storage(ctx: Context<InitializeShareStorage>, name: String) -> Result<()> {
        instructions::initialize_share_storage(ctx, name)
    }

    /// Set all holders for the ShareStorage (replaces existing holders)
    pub fn set_holders(
        ctx: Context<SetHolders>,
        name: String,
        holders: Vec<account::ShareHolder>,
    ) -> Result<()> {
        instructions::set_holders(ctx, name, holders)
    }

    /// Distribute SOL from share storage to holders
    pub fn distribute_sol<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeSol<'info>>,
        name: String,
    ) -> Result<()> {
        instructions::distribute_sol(ctx, name)
    }

    /// Distribute SPL tokens from share storage to holders
    pub fn distribute_tokens<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeTokens<'info>>,
        name: String,
    ) -> Result<()> {
        instructions::distribute_tokens(ctx, name)
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
