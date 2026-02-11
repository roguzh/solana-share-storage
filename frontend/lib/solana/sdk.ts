import { Program } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "../idl/enhanced_royalties.json";
import * as anchor from "@coral-xyz/anchor";
import type { ShareHolder } from "@/types/program";

// IDL type (we'll cast the JSON to this)
type EnhancedRoyaltiesIDL = any; // Using any since we don't have the full TS types yet

export class EnhancedRoyaltiesSDK {
  program: any; // Using any to avoid TypeScript deep instantiation issues with Anchor
  connection: Connection;

  constructor(rpc_url: string = clusterApiUrl("devnet")) {
    this.connection = new Connection(rpc_url, "confirmed");
    this.program = new Program(idl as EnhancedRoyaltiesIDL, {
      connection: this.connection,
    });
  }

  /**
   * Derive ShareStorage PDA
   */
  deriveShareStoragePDA(admin: PublicKey, name: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_storage"),
        admin.toBuffer(),
        Buffer.from(name),
      ],
      this.program.programId
    );
  }

  /**
   * Derive TokenDistributionRecord PDA
   */
  deriveTokenDistributionRecordPDA(
    shareStorage: PublicKey,
    mint: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_dist"),
        shareStorage.toBuffer(),
        mint.toBuffer(),
      ],
      this.program.programId
    );
  }

  /**
   * Initialize a new ShareStorage account
   */
  initShareStorageTransaction({
    storageName,
    initiator,
  }: {
    storageName: string;
    initiator: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(initiator, storageName);

    const accounts = {
      shareStorage: shareStoragePda,
      admin: initiator,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    return this.program.methods
      .initializeShareStorage(storageName)
      .accounts(accounts)
      .transaction();
  }

  /**
   * Set holders for a ShareStorage
   */
  setHoldersTransaction({
    shareStorageName,
    holders,
    admin,
  }: {
    shareStorageName: string;
    holders: ShareHolder[];
    admin: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);

    const accounts = {
      shareStorage: shareStoragePda,
      admin,
    };

    return this.program.methods
      .setHolders(shareStorageName, holders)
      .accounts(accounts)
      .transaction();
  }

  /**
   * Distribute SOL to all holders
   */
  async distributeFundsTransaction({
    shareStorageName,
    admin,
  }: {
    shareStorageName: string;
    admin: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);

    const accounts = {
      shareStorage: shareStoragePda,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    // Fetch holders from on-chain storage
    const { holders } = await this.program.account.shareStorage.fetch(shareStoragePda);

    const remainingAccounts = holders.map((holder: any) => ({
      pubkey: holder.pubkey,
      isSigner: false,
      isWritable: true,
    }));

    return this.program.methods
      .distributeSol(shareStorageName)
      .accounts(accounts)
      .remainingAccounts(remainingAccounts)
      .transaction();
  }

  /**
   * Distribute SPL tokens to all holders
   * Note: This method was added based on test patterns (lines 315-424)
   */
  async distributeTokensTransaction({
    shareStorageName,
    admin,
    tokenMint,
  }: {
    shareStorageName: string;
    admin: PublicKey;
    tokenMint: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const [tokenDistributionRecord] = this.deriveTokenDistributionRecordPDA(
      shareStoragePda,
      tokenMint
    );

    // Get storage's token account (ATA)
    const storageTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      shareStoragePda,
      true // allowOwnerOffCurve for PDA
    );

    // Fetch holders from on-chain storage
    const { holders } = await this.program.account.shareStorage.fetch(shareStoragePda);

    // Get token accounts for all holders
    const holderTokenAccounts = await Promise.all(
      holders.map(async (holder: any) => {
        const ata = await getAssociatedTokenAddress(tokenMint, holder.pubkey);
        return {
          pubkey: ata,
          isSigner: false,
          isWritable: true,
        };
      })
    );

    const accounts = {
      shareStorage: shareStoragePda,
      tokenMint,
      tokenAccount: storageTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenDistributionRecord,
      payer: admin,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    return this.program.methods
      .distributeTokens(shareStorageName)
      .accounts(accounts)
      .remainingAccounts(holderTokenAccounts)
      .transaction();
  }

  /**
   * Enable a ShareStorage
   */
  enableShareStorageTransaction({
    shareStorageName,
    shareStoragePda,
    admin,
  }: {
    shareStorageName: string;
    shareStoragePda: PublicKey;
    admin: PublicKey;
  }): Promise<Transaction> {
    const accounts = {
      shareStorage: shareStoragePda,
      admin: admin,
    };

    return this.program.methods
      .enableShareStorage(shareStorageName)
      .accounts(accounts)
      .transaction();
  }

  /**
   * Disable a ShareStorage
   */
  disableShareStorageTransaction({
    shareStorageName,
    shareStoragePda,
    admin,
  }: {
    shareStorageName: string;
    shareStoragePda: PublicKey;
    admin: PublicKey;
  }): Promise<Transaction> {
    const accounts = {
      shareStorage: shareStoragePda,
      admin: admin,
    };

    return this.program.methods
      .disableShareStorage(shareStorageName)
      .accounts(accounts)
      .transaction();
  }

  /**
   * Get a single ShareStorage account
   */
  async getShareStorage({
    shareStorageName,
    admin,
  }: {
    shareStorageName: string;
    admin: PublicKey;
  }) {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    return this.program.account.shareStorage.fetch(shareStoragePda);
  }

  /**
   * Get all ShareStorage accounts for an admin
   */
  async getShareStoragesByAdmin(admin: PublicKey) {
    const accounts = await this.program.account.shareStorage.all([
      {
        memcmp: {
          offset: 8,
          bytes: admin.toBase58(),
        },
      },
    ]);

    return accounts;
  }

  /**
   * Get TokenDistributionRecord for a specific token
   */
  async getTokenDistributionRecord({
    shareStorageName,
    admin,
    tokenMint,
  }: {
    shareStorageName: string;
    admin: PublicKey;
    tokenMint: PublicKey;
  }) {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const [tokenDistributionRecord] = this.deriveTokenDistributionRecordPDA(
      shareStoragePda,
      tokenMint
    );

    try {
      return await this.program.account.tokenDistributionRecord.fetch(
        tokenDistributionRecord
      );
    } catch {
      return null; // Record doesn't exist yet
    }
  }
}
