use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, InitSpace)]
pub struct ShareHolder {
    pub pubkey: Pubkey,
    pub share_basis_points: u16, // Out of 10,000 basis points (100%)
    pub is_storage: bool,
}

#[account]
#[derive(InitSpace)]
pub struct TokenDistributionRecord {
    pub share_storage: Pubkey,
    pub mint: Pubkey,
    pub total_distributed: u64,
    pub last_distributed_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct ShareStorage {
    pub admin: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub enabled: bool,
    pub last_distributed_at: i64,
    pub total_distributed: u64,
    #[max_len(16)]
    pub holders: Vec<ShareHolder>,
    pub parent: Option<Pubkey>,
}

impl ShareStorage {
    pub const MAX_HOLDERS: usize = 16;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Too many holders. Maximum is 16.")]
    TooManyHolders,
    #[msg("Holder already exists.")]
    HolderAlreadyExists,
    #[msg("Holder not found.")]
    HolderNotFound,
    #[msg("ShareStorage is disabled.")]
    ShareStorageDisabled,
    #[msg("Unauthorized. Only admin can perform this action.")]
    Unauthorized,
    #[msg("Invalid share distribution. Total basis points must equal exactly 10,000.")]
    InvalidShareDistribution,
    #[msg("Insufficient funds for distribution.")]
    InsufficientFunds,
    #[msg("Invalid name. Name must be between 1 and 32 bytes.")]
    InvalidName,
    #[msg("No holders available for distribution.")]
    NoHolders,
    #[msg("Invalid number of holder accounts provided.")]
    InvalidHolderAccounts,
    #[msg("Holder account does not match expected pubkey.")]
    InvalidHolderAccount,
    #[msg("Arithmetic overflow occurred.")]
    ArithmeticOverflow,
    #[msg("Invalid token account: wrong mint.")]
    InvalidTokenMint,
    #[msg("Invalid token account: wrong owner.")]
    InvalidTokenOwner,
    #[msg("Token account is frozen.")]
    TokenAccountFrozen,
    #[msg("Sub-storage admin must match parent admin.")]
    ParentAdminMismatch,
    #[msg("Parent storage account not found or invalid.")]
    InvalidParentAccount,
    #[msg("Account is already in the new format.")]
    AlreadyMigrated,
    #[msg("Account data is invalid for migration.")]
    InvalidMigration,
}
