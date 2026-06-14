import { Program } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "./idl/idl.json";
import * as anchor from "@coral-xyz/anchor";

type EnhancedRoyaltiesIDL = any;

export type ShareHolder = {
  pubkey: PublicKey;
  shareBasisPoints: number;
  isStorage: boolean;
};

export type ShareStorageAccount = {
  admin: PublicKey;
  name: string;
  enabled: boolean;
  lastDistributedAt: anchor.BN;
  totalDistributed: anchor.BN;
  holders: ShareHolder[];
  parent: PublicKey | null;
};

export type TokenDistributionRecord = {
  shareStorage: PublicKey;
  mint: PublicKey;
  totalDistributed: anchor.BN;
  lastDistributedAt: anchor.BN;
};

export type ShareStorageWithPubkey = {
  publicKey: PublicKey;
  account: ShareStorageAccount;
};

export class EnhancedRoyaltiesSDK {
  program: any;
  connection: Connection;

  constructor(rpc_url: string = clusterApiUrl("devnet")) {
    this.connection = new Connection(rpc_url, "confirmed");
    this.program = new Program(idl as EnhancedRoyaltiesIDL, {
      connection: this.connection,
    });
  }

  async resolveTokenProgram(mint: PublicKey): Promise<PublicKey> {
    const mintInfo = await this.connection.getAccountInfo(mint);
    if (!mintInfo) throw new Error(`Mint account not found: ${mint.toBase58()}`);
    if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
    return TOKEN_PROGRAM_ID;
  }

  deriveShareStoragePDA(admin: PublicKey, name: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.toBuffer(), Buffer.from(name)],
      this.program.programId
    );
  }

  deriveTokenDistributionRecordPDA(
    shareStorage: PublicKey,
    mint: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("token_dist"), shareStorage.toBuffer(), mint.toBuffer()],
      this.program.programId
    );
  }

  initShareStorageTransaction({
    storageName,
    initiator,
  }: {
    storageName: string;
    initiator: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(initiator, storageName);

    return this.program.methods
      .initializeShareStorage(storageName, null)
      .accounts({
        shareStorage: shareStoragePda,
        admin: initiator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();
  }

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

    return this.program.methods
      .setHolders(shareStorageName, holders)
      .accounts({ shareStorage: shareStoragePda, admin })
      .transaction();
  }

  async distributeFundsTransaction({
    shareStorageName,
    admin,
  }: {
    shareStorageName: string;
    admin: PublicKey;
  }): Promise<Transaction> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const { holders } = await this.program.account.shareStorage.fetch(shareStoragePda) as ShareStorageAccount;

    const remainingAccounts = holders.map((holder: ShareHolder) => ({
      pubkey: holder.pubkey,
      isSigner: false,
      isWritable: true,
    }));

    return this.program.methods
      .distributeSol(shareStorageName)
      .accounts({
        shareStorage: shareStoragePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();
  }

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
      true,
      tokenProgram
    );

    const ix = createAssociatedTokenAccountIdempotentInstruction(
      payer,
      storageAta,
      shareStoragePda,
      tokenMint,
      tokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return new Transaction().add(ix);
  }

  async getStorageTokenAccount(
    admin: PublicKey,
    shareStorageName: string,
    tokenMint: PublicKey
  ): Promise<PublicKey> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const tokenProgram = await this.resolveTokenProgram(tokenMint);
    return getAssociatedTokenAddress(tokenMint, shareStoragePda, true, tokenProgram);
  }

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

    const storageTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      shareStoragePda,
      true,
      tokenProgram
    );

    const { holders } = await this.program.account.shareStorage.fetch(shareStoragePda) as ShareStorageAccount;

    const holderTokenAccounts = await Promise.all(
      holders.map((holder: ShareHolder) =>
        getAssociatedTokenAddress(tokenMint, holder.pubkey, false, tokenProgram)
      )
    );

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

    const distributeTx = await this.program.methods
      .distributeTokens(shareStorageName)
      .accounts({
        shareStorage: shareStoragePda,
        tokenMint,
        tokenAccount: storageTokenAccount,
        tokenProgram,
        tokenDistributionRecord,
        payer: admin,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts(
        holderTokenAccounts.map((acc: PublicKey) => ({ pubkey: acc, isSigner: false, isWritable: true }))
      )
      .transaction();

    tx.add(...distributeTx.instructions);
    return tx;
  }

  enableShareStorageTransaction({
    shareStorageName,
    shareStoragePda,
    admin,
  }: {
    shareStorageName: string;
    shareStoragePda: PublicKey;
    admin: PublicKey;
  }): Promise<Transaction> {
    return this.program.methods
      .enableShareStorage(shareStorageName)
      .accounts({ shareStorage: shareStoragePda, admin })
      .transaction();
  }

  disableShareStorageTransaction({
    shareStorageName,
    shareStoragePda,
    admin,
  }: {
    shareStorageName: string;
    shareStoragePda: PublicKey;
    admin: PublicKey;
  }): Promise<Transaction> {
    return this.program.methods
      .disableShareStorage(shareStorageName)
      .accounts({ shareStorage: shareStoragePda, admin })
      .transaction();
  }

  async getShareStorage({
    shareStorageName,
    admin,
  }: {
    shareStorageName: string;
    admin: PublicKey;
  }): Promise<ShareStorageAccount> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    return this.program.account.shareStorage.fetch(shareStoragePda) as Promise<ShareStorageAccount>;
  }

  async getShareStoragesByAdmin(admin: PublicKey): Promise<ShareStorageWithPubkey[]> {
    return this.program.account.shareStorage.all([
      { memcmp: { offset: 8, bytes: admin.toBase58() } },
    ]) as Promise<ShareStorageWithPubkey[]>;
  }

  async getTokenDistributionRecord({
    shareStorageName,
    admin,
    tokenMint,
  }: {
    shareStorageName: string;
    admin: PublicKey;
    tokenMint: PublicKey;
  }): Promise<TokenDistributionRecord | null> {
    const [shareStoragePda] = this.deriveShareStoragePDA(admin, shareStorageName);
    const [tokenDistributionRecord] = this.deriveTokenDistributionRecordPDA(
      shareStoragePda,
      tokenMint
    );

    try {
      return await this.program.account.tokenDistributionRecord.fetch(tokenDistributionRecord) as TokenDistributionRecord;
    } catch {
      return null;
    }
  }
}
