import { Program } from "@coral-xyz/anchor";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import idl from "./idl/idl.json";
import { EnhancedRoyalties } from "./idl/idl";
import * as anchor from "@coral-xyz/anchor";

export class EnhancedRoyaltiesSDK {
  program: Program<EnhancedRoyalties>;
  connection: Connection;

  constructor(rpc_url: string = clusterApiUrl("devnet")) {
    this.connection = new Connection(rpc_url, "confirmed");
    this.program = new Program(idl as EnhancedRoyalties, {
      connection: this.connection,
    });
  }

  initShareStorageTransaction({
    storageName,
    initiator,
  }: {
    storageName: string;
    initiator: anchor.web3.PublicKey;
  }) {
    const [shareStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_storage"),
        initiator.toBuffer(),
        Buffer.from(storageName),
      ],
      this.program.programId
    );

    const accounts = {
      shareStorage: shareStoragePda,
      admin: initiator,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    const transaction = this.program.methods
      .initializeShareStorage(storageName)
      .accounts(accounts)
      .transaction();

    return transaction;
  }

  setHoldersTransaction({
    shareStorageName,
    holders,
    admin,
  }: {
    shareStorageName: string;
    holders: Array<{
      pubkey: anchor.web3.PublicKey;
      shareBasisPoints: number;
    }>;
    admin: anchor.web3.PublicKey;
  }) {
    const [shareStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_storage"),
        admin.toBuffer(),
        Buffer.from(shareStorageName),
      ],
      this.program.programId
    );

    const accounts = {
      shareStorage: shareStoragePda,
      admin,
    };

    const transaction = this.program.methods
      .setHolders(shareStorageName, holders)
      .accounts(accounts)
      .transaction();

    return transaction;
  }

  async distributeFundsTransaction({
    shareStorageName,
    admin,
  }: {
    shareStorageName: string;
    admin: anchor.web3.PublicKey;
  }) {
    const [shareStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_storage"),
        admin.toBuffer(),
        Buffer.from(shareStorageName),
      ],
      this.program.programId
    );

    const accounts = {
      shareStorage: shareStoragePda,
      admin,
    };

    const { holders } = await this.program.account.shareStorage.fetch(
      shareStoragePda
    );

    const remainingAccounts = holders.map((holder) => ({
      pubkey: holder.pubkey,
      isSigner: false,
      isWritable: true,
    }));

    const transaction = this.program.methods
      .distributeShare(shareStorageName)
      .accounts(accounts)
      .remainingAccounts(remainingAccounts)
      .transaction();

    return transaction;
  }

  enableShareStorageTransaction({
    shareStorageName,
    shareStoragePda,
    admin,
  }: {
    shareStorageName: string;
    shareStoragePda: anchor.web3.PublicKey;
    admin: anchor.web3.PublicKey;
  }) {
    const accounts = {
      shareStorage: shareStoragePda,
      admin: admin,
    };

    const transaction = this.program.methods
      .enableShareStorage(shareStorageName)
      .accounts(accounts)
      .transaction();

    return transaction;
  }

  disableShareStorageTransaction({
    shareStorageName,
    shareStoragePda,
    admin,
  }: {
    shareStorageName: string;
    shareStoragePda: anchor.web3.PublicKey;
    admin: anchor.web3.PublicKey;
  }) {
    const accounts = {
      shareStorage: shareStoragePda,
      admin: admin,
    };

    const transaction = this.program.methods
      .disableShareStorage(shareStorageName)
      .accounts(accounts)
      .transaction();

    return transaction;
  }

  async getShareStorage({
    shareStorageName,
    admin,
  }: {
    shareStorageName: string;
    admin: anchor.web3.PublicKey;
  }) {
    const [shareStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_storage"),
        admin.toBuffer(),
        Buffer.from(shareStorageName),
      ],
      this.program.programId
    );

    const storage = await this.program.account.shareStorage.fetch(
      shareStoragePda
    );

    return {
      address: shareStoragePda,
      ...storage,
    };
  }

  async getShareStoragesByAdmin(admin: anchor.web3.PublicKey) {
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
}
