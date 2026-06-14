import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("enhanced-royalties", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.EnhancedRoyalties;
  const provider = anchor.AnchorProvider.env();

  let admin: anchor.web3.Keypair;
  let shareStoragePda1: anchor.web3.PublicKey;
  let shareStoragePda2: anchor.web3.PublicKey;
  const shareStorageName1 = "primary-storage";
  const shareStorageName2 = "secondary-storage";
  let holder1: anchor.web3.Keypair;
  let holder2: anchor.web3.Keypair;
  let distributor: anchor.web3.Keypair;

  // Token-related variables
  let tokenMint: anchor.web3.PublicKey;
  let shareStorageTokenAccount: anchor.web3.PublicKey;
  let holder1TokenAccount: anchor.web3.PublicKey;
  let holder2TokenAccount: anchor.web3.PublicKey;
  let tokenDistributionRecord: anchor.web3.PublicKey;

  // Sub-storage variables
  let subStoragePda: anchor.web3.PublicKey;
  const subStorageName = "sub-storage-a";
  let subHolder1: anchor.web3.Keypair;
  let subHolder2: anchor.web3.Keypair;

  async function airdrop(pubkey: anchor.web3.PublicKey, sol: number) {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        pubkey,
        sol * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  }

  before(async () => {
    admin = anchor.web3.Keypair.generate();
    holder1 = anchor.web3.Keypair.generate();
    holder2 = anchor.web3.Keypair.generate();
    distributor = anchor.web3.Keypair.generate();
    subHolder1 = anchor.web3.Keypair.generate();
    subHolder2 = anchor.web3.Keypair.generate();

    await airdrop(admin.publicKey, 10);
    await airdrop(distributor.publicKey, 5);

    [shareStoragePda1] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.publicKey.toBuffer(), Buffer.from(shareStorageName1)],
      program.programId
    );
    [shareStoragePda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.publicKey.toBuffer(), Buffer.from(shareStorageName2)],
      program.programId
    );
    [subStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.publicKey.toBuffer(), Buffer.from(subStorageName)],
      program.programId
    );
  });

  // ─── Top-level storage ───────────────────────────────────────────────────────

  it("Initialize first ShareStorage (no parent)", async () => {
    await program.methods
      .initializeShareStorage(shareStorageName1, null)
      .accounts({
        shareStorage: shareStoragePda1,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.admin.toString()).to.equal(admin.publicKey.toString());
    expect(shareStorage.name).to.equal(shareStorageName1);
    expect(shareStorage.enabled).to.be.true;
    expect(shareStorage.holders.length).to.equal(0);
    expect(shareStorage.totalDistributed.toString()).to.equal("0");
    expect(shareStorage.parent).to.be.null;
  });

  it("Initialize second ShareStorage (no parent)", async () => {
    await program.methods
      .initializeShareStorage(shareStorageName2, null)
      .accounts({
        shareStorage: shareStoragePda2,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda2);
    expect(shareStorage.parent).to.be.null;
  });

  // ─── Sub-storage ─────────────────────────────────────────────────────────────

  it("Initialize sub-storage with valid parent", async () => {
    await program.methods
      .initializeShareStorage(subStorageName, shareStoragePda1)
      .accounts({
        shareStorage: subStoragePda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts([
        { pubkey: shareStoragePda1, isSigner: false, isWritable: false },
      ])
      .signers([admin])
      .rpc();

    const sub = await program.account.shareStorage.fetch(subStoragePda);
    expect(sub.parent.toString()).to.equal(shareStoragePda1.toString());
    expect(sub.admin.toString()).to.equal(admin.publicKey.toString());
  });

  it("Fail to init sub-storage with mismatched admin", async () => {
    const otherAdmin = anchor.web3.Keypair.generate();
    await airdrop(otherAdmin.publicKey, 2);

    const [otherStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), otherAdmin.publicKey.toBuffer(), Buffer.from("other-storage")],
      program.programId
    );
    await program.methods
      .initializeShareStorage("other-storage", null)
      .accounts({
        shareStorage: otherStoragePda,
        admin: otherAdmin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([otherAdmin])
      .rpc();

    const [mismatchedSubPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.publicKey.toBuffer(), Buffer.from("mismatch-sub")],
      program.programId
    );

    try {
      await program.methods
        .initializeShareStorage("mismatch-sub", otherStoragePda)
        .accounts({
          shareStorage: mismatchedSubPda,
          admin: admin.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .remainingAccounts([
          { pubkey: otherStoragePda, isSigner: false, isWritable: false },
        ])
        .signers([admin])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("ParentAdminMismatch");
    }
  });

  // ─── Set holders ─────────────────────────────────────────────────────────────

  it("Set wallet holders for first ShareStorage", async () => {
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 3000, isStorage: false },
      { pubkey: holder2.publicKey, shareBasisPoints: 7000, isStorage: false },
    ];

    await program.methods
      .setHolders(shareStorageName1, holders)
      .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.holders.length).to.equal(2);
    expect(shareStorage.holders[0].shareBasisPoints).to.equal(3000);
    expect(shareStorage.holders[0].isStorage).to.be.false;
    expect(shareStorage.holders[1].shareBasisPoints).to.equal(7000);
  });

  it("Set sub-storage as holder with wallet holders", async () => {
    const holders = [
      { pubkey: subStoragePda, shareBasisPoints: 4000, isStorage: true },
      { pubkey: holder2.publicKey, shareBasisPoints: 6000, isStorage: false },
    ];

    await program.methods
      .setHolders(shareStorageName2, holders)
      .accounts({ shareStorage: shareStoragePda2, admin: admin.publicKey })
      .remainingAccounts([
        { pubkey: subStoragePda, isSigner: false, isWritable: false },
      ])
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda2);
    expect(shareStorage.holders.length).to.equal(2);
    expect(shareStorage.holders[0].isStorage).to.be.true;
    expect(shareStorage.holders[0].pubkey.toString()).to.equal(subStoragePda.toString());
    expect(shareStorage.holders[1].isStorage).to.be.false;
  });

  it("Fail to set storage holder with wrong admin", async () => {
    const otherAdmin = anchor.web3.Keypair.generate();
    await airdrop(otherAdmin.publicKey, 2);

    const [foreignStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), otherAdmin.publicKey.toBuffer(), Buffer.from("foreign")],
      program.programId
    );
    await program.methods
      .initializeShareStorage("foreign", null)
      .accounts({
        shareStorage: foreignStoragePda,
        admin: otherAdmin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([otherAdmin])
      .rpc();

    try {
      await program.methods
        .setHolders(shareStorageName1, [
          { pubkey: foreignStoragePda, shareBasisPoints: 10000, isStorage: true },
        ])
        .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
        .remainingAccounts([
          { pubkey: foreignStoragePda, isSigner: false, isWritable: false },
        ])
        .signers([admin])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("ParentAdminMismatch");
    }
  });

  it("Fail to set holders with total not equal to 10,000", async () => {
    try {
      await program.methods
        .setHolders(shareStorageName1, [
          { pubkey: holder1.publicKey, shareBasisPoints: 4000, isStorage: false },
          { pubkey: holder2.publicKey, shareBasisPoints: 5000, isStorage: false },
        ])
        .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
        .signers([admin])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("InvalidShareDistribution");
    }
  });

  it("Fail to set duplicate holders", async () => {
    try {
      await program.methods
        .setHolders(shareStorageName1, [
          { pubkey: holder1.publicKey, shareBasisPoints: 5000, isStorage: false },
          { pubkey: holder1.publicKey, shareBasisPoints: 5000, isStorage: false },
        ])
        .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
        .signers([admin])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("HolderAlreadyExists");
    }
  });

  // ─── SOL distribution ────────────────────────────────────────────────────────

  it("Send SOL directly to first ShareStorage", async () => {
    const depositAmount = anchor.web3.LAMPORTS_PER_SOL;
    const balanceBefore = await provider.connection.getBalance(shareStoragePda1);

    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: distributor.publicKey,
        toPubkey: shareStoragePda1,
        lamports: depositAmount,
      })
    );
    await provider.sendAndConfirm(tx, [distributor]);

    const balanceAfter = await provider.connection.getBalance(shareStoragePda1);
    expect(balanceAfter - balanceBefore).to.equal(depositAmount);
  });

  it("Distribute SOL from first ShareStorage", async () => {
    // Restore wallet-only holders for this test
    await program.methods
      .setHolders(shareStorageName1, [
        { pubkey: holder1.publicKey, shareBasisPoints: 3000, isStorage: false },
        { pubkey: holder2.publicKey, shareBasisPoints: 7000, isStorage: false },
      ])
      .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    const holder1Before = await provider.connection.getBalance(holder1.publicKey);
    const holder2Before = await provider.connection.getBalance(holder2.publicKey);
    const storageBefore = await provider.connection.getBalance(shareStoragePda1);

    await program.methods
      .distributeSol(shareStorageName1)
      .accounts({
        shareStorage: shareStoragePda1,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts([
        { pubkey: holder1.publicKey, isSigner: false, isWritable: true },
        { pubkey: holder2.publicKey, isSigner: false, isWritable: true },
      ])
      .rpc();

    const holder1After = await provider.connection.getBalance(holder1.publicKey);
    const holder2After = await provider.connection.getBalance(holder2.publicKey);
    const storageAfter = await provider.connection.getBalance(shareStoragePda1);

    expect(storageBefore).to.be.greaterThan(storageAfter);
    expect(holder1After).to.be.greaterThan(holder1Before);
    expect(holder2After).to.be.greaterThan(holder2Before);

    const h1Received = holder1After - holder1Before;
    const h2Received = holder2After - holder2Before;
    const total = h1Received + h2Received;

    expect(h1Received / total).to.be.approximately(0.3, 0.01);
    expect(h2Received / total).to.be.approximately(0.7, 0.01);

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.totalDistributed.toNumber()).to.be.greaterThan(0);
  });

  it("Distribute SOL to sub-storage holder, then distribute from sub-storage", async () => {
    // Fund shareStoragePda2 (has subStorage 40% + holder2 60%)
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: distributor.publicKey,
        toPubkey: shareStoragePda2,
        lamports: 2 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, [distributor]);

    // Set wallet holders on sub-storage
    await program.methods
      .setHolders(subStorageName, [
        { pubkey: subHolder1.publicKey, shareBasisPoints: 5000, isStorage: false },
        { pubkey: subHolder2.publicKey, shareBasisPoints: 5000, isStorage: false },
      ])
      .accounts({ shareStorage: subStoragePda, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    const subStorageBalanceBefore = await provider.connection.getBalance(subStoragePda);
    const holder2Before = await provider.connection.getBalance(holder2.publicKey);

    // Step 1: distribute from parent (shareStoragePda2)
    await program.methods
      .distributeSol(shareStorageName2)
      .accounts({
        shareStorage: shareStoragePda2,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts([
        { pubkey: subStoragePda, isSigner: false, isWritable: true },
        { pubkey: holder2.publicKey, isSigner: false, isWritable: true },
      ])
      .rpc();

    const subStorageBalanceAfter = await provider.connection.getBalance(subStoragePda);
    const holder2After = await provider.connection.getBalance(holder2.publicKey);

    expect(subStorageBalanceAfter).to.be.greaterThan(subStorageBalanceBefore);
    expect(holder2After).to.be.greaterThan(holder2Before);

    const subH1Before = await provider.connection.getBalance(subHolder1.publicKey);
    const subH2Before = await provider.connection.getBalance(subHolder2.publicKey);

    // Step 2: distribute from sub-storage
    await program.methods
      .distributeSol(subStorageName)
      .accounts({
        shareStorage: subStoragePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts([
        { pubkey: subHolder1.publicKey, isSigner: false, isWritable: true },
        { pubkey: subHolder2.publicKey, isSigner: false, isWritable: true },
      ])
      .rpc();

    const subH1After = await provider.connection.getBalance(subHolder1.publicKey);
    const subH2After = await provider.connection.getBalance(subHolder2.publicKey);

    expect(subH1After).to.be.greaterThan(subH1Before);
    expect(subH2After).to.be.greaterThan(subH2Before);
  });

  // ─── SPL token distribution ──────────────────────────────────────────────────

  it("Setup and distribute SPL tokens", async () => {
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 9);

    const shareStorageAta = await getOrCreateAssociatedTokenAccount(
      provider.connection, admin, tokenMint, shareStoragePda1, true
    );
    shareStorageTokenAccount = shareStorageAta.address;

    const holder1Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection, admin, tokenMint, holder1.publicKey
    );
    holder1TokenAccount = holder1Ata.address;

    const holder2Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection, admin, tokenMint, holder2.publicKey
    );
    holder2TokenAccount = holder2Ata.address;

    await mintTo(
      provider.connection, admin, tokenMint, shareStorageTokenAccount, admin,
      BigInt(1_000_000_000_000)
    );

    [tokenDistributionRecord] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_dist"), shareStoragePda1.toBuffer(), tokenMint.toBuffer()],
      program.programId
    );

    const h1Before = (await provider.connection.getTokenAccountBalance(holder1TokenAccount)).value.uiAmount;
    const h2Before = (await provider.connection.getTokenAccountBalance(holder2TokenAccount)).value.uiAmount;

    await program.methods
      .distributeTokens(shareStorageName1)
      .accounts({
        shareStorage: shareStoragePda1,
        tokenMint,
        tokenAccount: shareStorageTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenDistributionRecord,
        payer: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts([
        { pubkey: holder1TokenAccount, isSigner: false, isWritable: true },
        { pubkey: holder2TokenAccount, isSigner: false, isWritable: true },
      ])
      .signers([admin])
      .rpc();

    const h1After = (await provider.connection.getTokenAccountBalance(holder1TokenAccount)).value.uiAmount!;
    const h2After = (await provider.connection.getTokenAccountBalance(holder2TokenAccount)).value.uiAmount!;

    expect(h1After).to.be.greaterThan(h1Before ?? 0);
    expect(h2After).to.be.greaterThan(h2Before ?? 0);

    const h1Received = h1After - (h1Before ?? 0);
    const h2Received = h2After - (h2Before ?? 0);
    const total = h1Received + h2Received;

    expect(h1Received / total).to.be.approximately(0.3, 0.01);
    expect(h2Received / total).to.be.approximately(0.7, 0.01);

    const record = await program.account.tokenDistributionRecord.fetch(tokenDistributionRecord);
    expect(record.shareStorage.toString()).to.equal(shareStoragePda1.toString());
    expect(record.mint.toString()).to.equal(tokenMint.toString());
    expect(record.totalDistributed.toNumber()).to.be.greaterThan(0);
  });

  // ─── Migration ───────────────────────────────────────────────────────────────
  //
  // Full migration (old→new bytes) requires a pre-migration account that cannot
  // be created via the current program (which already writes new format).  The
  // guard-logic tests below are fully testable here; the byte-transform path
  // should be verified against a devnet/mainnet snapshot account.

  it("migrate_storage: fails with AlreadyMigrated on a new-format account", async () => {
    // shareStoragePda1 was initialised by the current program → new format
    try {
      await program.methods
        .migrateStorage()
        .accounts({
          shareStorage: shareStoragePda1,
          admin: admin.publicKey,
          payer: admin.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("AlreadyMigrated");
    }
  });

  it("migrate_storage: fails with Unauthorized when called by wrong signer", async () => {
    const impostor = anchor.web3.Keypair.generate();
    await airdrop(impostor.publicKey, 1);

    try {
      await program.methods
        .migrateStorage()
        .accounts({
          shareStorage: shareStoragePda1,
          admin: impostor.publicKey,
          payer: impostor.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([impostor])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
    }
  });

  // ─── Enable / disable ────────────────────────────────────────────────────────

  it("Disable and re-enable first ShareStorage", async () => {
    await program.methods
      .disableShareStorage(shareStorageName1)
      .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    let shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.enabled).to.be.false;

    await program.methods
      .enableShareStorage(shareStorageName1)
      .accounts({ shareStorage: shareStoragePda1, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.enabled).to.be.true;
  });
});
