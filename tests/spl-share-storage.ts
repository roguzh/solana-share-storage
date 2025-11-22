import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  createTransferInstruction,
} from "@solana/spl-token";

describe("spl-share-storage", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.EnhancedRoyalties;
  const provider = anchor.AnchorProvider.env();

  let admin: anchor.web3.Keypair;
  let splShareStoragePda: anchor.web3.PublicKey;
  let tokenVaultPda: anchor.web3.PublicKey;
  let splShareStorageName = "spl-storage";
  let tokenMint: anchor.web3.PublicKey;
  let holder1: anchor.web3.Keypair;
  let holder2: anchor.web3.Keypair;
  let holder3: anchor.web3.Keypair;
  let adminTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    admin = anchor.web3.Keypair.generate();
    holder1 = anchor.web3.Keypair.generate();
    holder2 = anchor.web3.Keypair.generate();
    holder3 = anchor.web3.Keypair.generate();

    // Airdrop SOL to accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        admin.publicKey,
        5 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Create a token mint
    tokenMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // decimals
    );

    console.log("Token Mint:", tokenMint.toString());

    // Create admin's token account and mint tokens to it
    const adminTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      admin.publicKey
    );
    adminTokenAccount = adminTokenAccountInfo.address;

    // Mint 1,000,000 tokens to admin (with 6 decimals = 1,000,000,000,000 base units)
    await mintTo(
      provider.connection,
      admin,
      tokenMint,
      adminTokenAccount,
      admin,
      1_000_000_000_000
    );

    console.log("Admin Token Account:", adminTokenAccount.toString());

    // Find SplShareStorage PDA
    [splShareStoragePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("spl_share_storage"),
        admin.publicKey.toBuffer(),
        Buffer.from(splShareStorageName),
      ],
      program.programId
    );

    // Find TokenVault PDA
    [tokenVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("spl_token_vault"), splShareStoragePda.toBuffer()],
      program.programId
    );

    console.log("SplShareStorage PDA:", splShareStoragePda.toString());
    console.log("Token Vault PDA:", tokenVaultPda.toString());
  });

  it("Initialize SplShareStorage with token vault", async () => {
    const accounts = {
      splShareStorage: splShareStoragePda,
      tokenVault: tokenVaultPda,
      tokenMint: tokenMint,
      admin: admin.publicKey,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    await program.methods
      .initializeSplShareStorage(splShareStorageName)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const splShareStorage = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    expect(splShareStorage.admin.toString()).to.equal(
      admin.publicKey.toString()
    );
    expect(splShareStorage.tokenMint.toString()).to.equal(
      tokenMint.toString()
    );
    expect(splShareStorage.name).to.equal(splShareStorageName);
    expect(splShareStorage.enabled).to.be.true;
    expect(splShareStorage.holders.length).to.equal(0);
    expect(splShareStorage.totalDistributed.toString()).to.equal("0");

    // Verify token vault was created
    const vaultAccount = await getAccount(provider.connection, tokenVaultPda);
    expect(vaultAccount.mint.toString()).to.equal(tokenMint.toString());
    expect(vaultAccount.owner.toString()).to.equal(
      splShareStoragePda.toString()
    );
    expect(vaultAccount.amount.toString()).to.equal("0");
  });

  it("Set holders for SplShareStorage", async () => {
    const accounts = {
      splShareStorage: splShareStoragePda,
      admin: admin.publicKey,
    };

    // Create holders that sum to exactly 10,000 basis points
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 2500 }, // 25%
      { pubkey: holder2.publicKey, shareBasisPoints: 5000 }, // 50%
      { pubkey: holder3.publicKey, shareBasisPoints: 2500 }, // 25%
    ];

    await program.methods
      .setSplHolders(splShareStorageName, holders)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const splShareStorage = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    expect(splShareStorage.holders.length).to.equal(3);
    expect(splShareStorage.holders[0].shareBasisPoints).to.equal(2500);
    expect(splShareStorage.holders[1].shareBasisPoints).to.equal(5000);
    expect(splShareStorage.holders[2].shareBasisPoints).to.equal(2500);
  });

  it("Transfer tokens to token vault", async () => {
    const transferAmount = 100_000_000_000; // 100,000 tokens (with 6 decimals)

    // Transfer tokens from admin to token vault
    const transaction = new anchor.web3.Transaction().add(
      createTransferInstruction(
        adminTokenAccount,
        tokenVaultPda,
        admin.publicKey,
        transferAmount
      )
    );

    await provider.sendAndConfirm(transaction, [admin]);

    // Verify vault balance
    const vaultAccount = await getAccount(provider.connection, tokenVaultPda);
    expect(vaultAccount.amount.toString()).to.equal(transferAmount.toString());
  });

  it("Distribute SPL tokens to holders", async () => {
    // Create ATAs for holders
    const holder1Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder1.publicKey
    );

    const holder2Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder2.publicKey
    );

    const holder3Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder3.publicKey
    );

    // Get balances before distribution
    const holder1Before = await getAccount(
      provider.connection,
      holder1Ata.address
    );
    const holder2Before = await getAccount(
      provider.connection,
      holder2Ata.address
    );
    const holder3Before = await getAccount(
      provider.connection,
      holder3Ata.address
    );
    const vaultBefore = await getAccount(provider.connection, tokenVaultPda);

    const accounts = {
      splShareStorage: splShareStoragePda,
      tokenVault: tokenVaultPda,
      tokenMint: tokenMint,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    };

    await program.methods
      .distributeSplShare(splShareStorageName)
      .accounts(accounts)
      .remainingAccounts([
        {
          pubkey: holder1Ata.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: holder2Ata.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: holder3Ata.address,
          isSigner: false,
          isWritable: true,
        },
      ])
      .rpc();

    // Get balances after distribution
    const holder1After = await getAccount(
      provider.connection,
      holder1Ata.address
    );
    const holder2After = await getAccount(
      provider.connection,
      holder2Ata.address
    );
    const holder3After = await getAccount(
      provider.connection,
      holder3Ata.address
    );
    const vaultAfter = await getAccount(provider.connection, tokenVaultPda);

    // Verify vault was emptied
    expect(vaultAfter.amount.toString()).to.equal("0");

    // Verify holders received tokens
    const holder1Received =
      Number(holder1After.amount) - Number(holder1Before.amount);
    const holder2Received =
      Number(holder2After.amount) - Number(holder2Before.amount);
    const holder3Received =
      Number(holder3After.amount) - Number(holder3Before.amount);

    const totalDistributed =
      holder1Received + holder2Received + holder3Received;

    // Verify total distributed matches vault balance
    expect(totalDistributed).to.equal(Number(vaultBefore.amount));

    // Verify proportional distribution (25%, 50%, 25%)
    const holder1Ratio = holder1Received / totalDistributed;
    const holder2Ratio = holder2Received / totalDistributed;
    const holder3Ratio = holder3Received / totalDistributed;

    expect(holder1Ratio).to.be.approximately(0.25, 0.01); // 25% ± 1%
    expect(holder2Ratio).to.be.approximately(0.5, 0.01); // 50% ± 1%
    expect(holder3Ratio).to.be.approximately(0.25, 0.01); // 25% ± 1%

    // Verify storage was updated
    const splShareStorage = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    expect(splShareStorage.totalDistributed.toNumber()).to.equal(
      totalDistributed
    );
    expect(splShareStorage.lastDistributedAt.toNumber()).to.be.greaterThan(0);

    console.log("Holder 1 received:", holder1Received);
    console.log("Holder 2 received:", holder2Received);
    console.log("Holder 3 received:", holder3Received);
    console.log("Total distributed:", totalDistributed);
  });

  it("Transfer more tokens and distribute again", async () => {
    const transferAmount = 50_000_000_000; // 50,000 tokens

    // Transfer tokens from admin to token vault
    const transaction = new anchor.web3.Transaction().add(
      createTransferInstruction(
        adminTokenAccount,
        tokenVaultPda,
        admin.publicKey,
        transferAmount
      )
    );

    await provider.sendAndConfirm(transaction, [admin]);

    // Get holder ATAs
    const holder1Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder1.publicKey
    );

    const holder2Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder2.publicKey
    );

    const holder3Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder3.publicKey
    );

    // Get total distributed before
    const storageBefore = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    const totalDistributedBefore = storageBefore.totalDistributed.toNumber();

    const accounts = {
      splShareStorage: splShareStoragePda,
      tokenVault: tokenVaultPda,
      tokenMint: tokenMint,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    };

    await program.methods
      .distributeSplShare(splShareStorageName)
      .accounts(accounts)
      .remainingAccounts([
        { pubkey: holder1Ata.address, isSigner: false, isWritable: true },
        { pubkey: holder2Ata.address, isSigner: false, isWritable: true },
        { pubkey: holder3Ata.address, isSigner: false, isWritable: true },
      ])
      .rpc();

    // Verify total_distributed was accumulated
    const storageAfter = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    const totalDistributedAfter = storageAfter.totalDistributed.toNumber();

    expect(totalDistributedAfter).to.be.greaterThan(totalDistributedBefore);
    expect(totalDistributedAfter - totalDistributedBefore).to.equal(
      transferAmount
    );
  });

  it("Fail to distribute with wrong token accounts", async () => {
    // Transfer some tokens to vault first
    const transferAmount = 10_000_000_000;
    const transaction = new anchor.web3.Transaction().add(
      createTransferInstruction(
        adminTokenAccount,
        tokenVaultPda,
        admin.publicKey,
        transferAmount
      )
    );
    await provider.sendAndConfirm(transaction, [admin]);

    const accounts = {
      splShareStorage: splShareStoragePda,
      tokenVault: tokenVaultPda,
      tokenMint: tokenMint,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    };

    // Try to pass wrong accounts (admin's account instead of holder's)
    try {
      await program.methods
        .distributeSplShare(splShareStorageName)
        .accounts(accounts)
        .remainingAccounts([
          { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
          { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
          { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
        ])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("InvalidHolderAccount");
    }
  });

  it("Disable SplShareStorage", async () => {
    const accounts = {
      splShareStorage: splShareStoragePda,
      admin: admin.publicKey,
    };

    await program.methods
      .disableSplShareStorage(splShareStorageName)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const splShareStorage = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    expect(splShareStorage.enabled).to.be.false;
  });

  it("Fail to distribute when disabled", async () => {
    const holder1Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder1.publicKey
    );

    const holder2Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder2.publicKey
    );

    const holder3Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      holder3.publicKey
    );

    const accounts = {
      splShareStorage: splShareStoragePda,
      tokenVault: tokenVaultPda,
      tokenMint: tokenMint,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    };

    try {
      await program.methods
        .distributeSplShare(splShareStorageName)
        .accounts(accounts)
        .remainingAccounts([
          { pubkey: holder1Ata.address, isSigner: false, isWritable: true },
          { pubkey: holder2Ata.address, isSigner: false, isWritable: true },
          { pubkey: holder3Ata.address, isSigner: false, isWritable: true },
        ])
        .rpc();

      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("ShareStorageDisabled");
    }
  });

  it("Enable SplShareStorage again", async () => {
    const accounts = {
      splShareStorage: splShareStoragePda,
      admin: admin.publicKey,
    };

    await program.methods
      .enableSplShareStorage(splShareStorageName)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const splShareStorage = await program.account.splShareStorage.fetch(
      splShareStoragePda
    );
    expect(splShareStorage.enabled).to.be.true;
  });
});
