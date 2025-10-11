use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, InitSpace)]
pub struct ShareHolder {
    pub pubkey: Pubkey,
    pub share_basis_points: u16, // Out of 10,000 basis points (100%)
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
}

impl ShareStorage {
    pub const MAX_HOLDERS: usize = 16;
    
    pub fn is_admin(&self, pubkey: &Pubkey) -> bool {
        self.admin == *pubkey
    }
    
    pub fn add_holder(&mut self, holder: ShareHolder) -> Result<()> {
        require!(self.holders.len() < Self::MAX_HOLDERS, ErrorCode::TooManyHolders);
        
        // Check if holder already exists
        for existing_holder in &self.holders {
            require!(existing_holder.pubkey != holder.pubkey, ErrorCode::HolderAlreadyExists);
        }
        
        self.holders.push(holder);
        Ok(())
    }
    
    pub fn remove_holder(&mut self, pubkey: &Pubkey) -> Result<()> {
        let index = self.holders
            .iter()
            .position(|h| h.pubkey == *pubkey)
            .ok_or(ErrorCode::HolderNotFound)?;
        
        self.holders.remove(index);
        Ok(())
    }
    
    pub fn total_basis_points(&self) -> u16 {
        self.holders.iter().map(|h| h.share_basis_points).sum()
    }
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
    #[msg("Invalid name. Name must be between 1 and 32 characters.")]
    InvalidName,
    #[msg("Invalid amount. Amount must be greater than 0.")]
    InvalidAmount,
    #[msg("No holders available for distribution.")]
    NoHolders,
    #[msg("Invalid number of holder accounts provided.")]
    InvalidHolderAccounts,
    #[msg("Holder account does not match expected pubkey.")]
    InvalidHolderAccount,
    #[msg("Arithmetic overflow occurred.")]
    ArithmeticOverflow,
}
