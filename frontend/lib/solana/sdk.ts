import { Program } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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
   * Resolve the token program owning a given mint (SPL Token or Token-2022).
   */
  async resolveTokenProgram(mint: PublicKey): Promise<PublicKey> {
    const mintInfo = await this.connection.getAccountInfo(mint);
    if (!mintInfo) throw new Error(`Mint account not found: ${mint.toBase58()}`);
    if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
    return TOKEN_PROGRAM_ID;
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
   * Create an Associated Token Account for the storage PDA so it can receive a given SPL token.
   * Must be called once per mint before depositing tokens.
   */
  async createStorageTokenAccountTransaction({
    shareStorageName,
    admin,
    tokenMint,
    payer,
  }: {
    shareStorageName: string;
    admin: PublicKey;
    tokenMint: PublicKey;
    payer: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const tokenProgram = await this.resolveTokenProgram(tokenMint);
    const storageAta = await getAssociatedTokenAddress(
      tokenMint,
      shareStoragePda,
      true, // allowOwnerOffCurve — PDA as owner
      tokenProgram
    );

    const ix = createAssociatedTokenAccountIdempotentInstruction(
      payer,           // fee payer
      storageAta,      // ATA to create
      shareStoragePda, // owner
      tokenMint,
      tokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction().add(ix);
    return tx;
  }

  /**
   * Get the ATA address for a given mint owned by the storage PDA.
   */
  async getStorageTokenAccount(
    admin: PublicKey,
    shareStorageName: string,
    tokenMint: PublicKey
  ): Promise<PublicKey> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const tokenProgram = await this.resolveTokenProgram(tokenMint);
    return getAssociatedTokenAddress(tokenMint, shareStoragePda, true, tokenProgram);
  }

  /**
   * Distribute SPL tokens to all holders.
   * Prepends idempotent ATA-creation instructions for every holder that
   * does not yet have a token account for this mint, so the distribution
   * succeeds even on first use.
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

    const tokenProgram = await this.resolveTokenProgram(tokenMint);

    // Storage ATA (must already exist — created via createStorageTokenAccountTransaction)
    const storageTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      shareStoragePda,
      true,
      tokenProgram
    );

    // Fetch holders from on-chain storage
    const { holders } = await this.program.account.shareStorage.fetch(shareStoragePda);

    // Derive holder token accounts (ATAs)
    const holderTokenAccounts = await Promise.all(
      holders.map((holder: ShareHolder) =>
        getAssociatedTokenAddress(tokenMint, holder.pubkey, false, tokenProgram)
      )
    );

    // Prepend idempotent ATA-creation instructions for every holder
    const tx = new Transaction();
    for (let i = 0; i < holders.length; i++) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          admin,
          holderTokenAccounts[i],
          holders[i].pubkey,
          tokenMint,
          tokenProgram,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const accounts = {
      shareStorage: shareStoragePda,
      tokenMint,
      tokenAccount: storageTokenAccount,
      tokenProgram,
      tokenDistributionRecord,
      payer: admin,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    const distributeTx = await this.program.methods
      .distributeTokens(shareStorageName)
      .accounts(accounts)
      .remainingAccounts(
        holderTokenAccounts.map((acc) => ({ pubkey: acc, isSigner: false, isWritable: true }))
      )
      .transaction();

    // Merge: ATA creations first, then the distribute instruction
    tx.add(...distributeTx.instructions);
    return tx;
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
