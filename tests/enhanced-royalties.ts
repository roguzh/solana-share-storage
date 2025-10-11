import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

describe("enhanced-royalties", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.EnhancedRoyalties;
  const provider = anchor.AnchorProvider.env();

  let admin: anchor.web3.Keypair;
  let shareStoragePda1: anchor.web3.PublicKey;
  let shareStoragePda2: anchor.web3.PublicKey;
  let shareStorageName1 = "primary-storage";
  let shareStorageName2 = "secondary-storage";
  let holder1: anchor.web3.Keypair;
  let holder2: anchor.web3.Keypair;
  let distributor: anchor.web3.Keypair;

  before(async () => {
    admin = anchor.web3.Keypair.generate();
    holder1 = anchor.web3.Keypair.generate();
    holder2 = anchor.web3.Keypair.generate();
    distributor = anchor.web3.Keypair.generate();

    // Airdrop SOL to accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        admin.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        distributor.publicKey,
        5 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Find ShareStorage PDAs with names
    [shareStoragePda1] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.publicKey.toBuffer(), Buffer.from(shareStorageName1)],
      program.programId
    );
    
    [shareStoragePda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_storage"), admin.publicKey.toBuffer(), Buffer.from(shareStorageName2)],
      program.programId
    );
  });

  it("Initialize first ShareStorage", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    await program.methods
      .initializeShareStorage(shareStorageName1)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.admin.toString()).to.equal(admin.publicKey.toString());
    expect(shareStorage.name).to.equal(shareStorageName1);
    expect(shareStorage.enabled).to.be.true;
    expect(shareStorage.holders.length).to.equal(0);
    expect(shareStorage.totalDistributed.toString()).to.equal("0");
  });

  it("Initialize second ShareStorage", async () => {
    const accounts = {
      shareStorage: shareStoragePda2,
      admin: admin.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    await program.methods
      .initializeShareStorage(shareStorageName2)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda2);
    expect(shareStorage.admin.toString()).to.equal(admin.publicKey.toString());
    expect(shareStorage.name).to.equal(shareStorageName2);
    expect(shareStorage.enabled).to.be.true;
    expect(shareStorage.holders.length).to.equal(0);
    expect(shareStorage.totalDistributed.toString()).to.equal("0");
  });

  it("Set holders for first ShareStorage", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };
    
    // Create holders that sum to exactly 10,000 basis points
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 3000 },
      { pubkey: holder2.publicKey, shareBasisPoints: 7000 }
    ];
    
    await program.methods
      .setHolders(shareStorageName1, holders)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.holders.length).to.equal(2);
    expect(shareStorage.holders[0].shareBasisPoints).to.equal(3000);
    expect(shareStorage.holders[1].shareBasisPoints).to.equal(7000);
  });

  it("Set different holders for second ShareStorage", async () => {
    const holder3 = anchor.web3.Keypair.generate();
    const accounts = {
      shareStorage: shareStoragePda2,
      admin: admin.publicKey,
    };
    
    // Create a single holder with exactly 10,000 basis points (100%)
    const holders = [
      { pubkey: holder3.publicKey, shareBasisPoints: 10000 }
    ];
    
    await program.methods
      .setHolders(shareStorageName2, holders)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda2);
    expect(shareStorage.holders.length).to.equal(1);
    expect(shareStorage.holders[0].shareBasisPoints).to.equal(10000);
  });

  it("Fail to set holders with total not equal to 10,000", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };
    
    // Create holders that sum to 9000 (not 10,000)
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 4000 },
      { pubkey: holder2.publicKey, shareBasisPoints: 5000 }
    ];
    
    try {
      await program.methods
        .setHolders(shareStorageName1, holders)
        .accounts(accounts)
        .signers([admin])
        .rpc();
      
      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("InvalidShareDistribution");
    }
  });

  it("Fail to set holders with total exceeding 10,000", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };
    
    // Create holders that sum to 11,000 (exceeds 10,000)
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 6000 },
      { pubkey: holder2.publicKey, shareBasisPoints: 5000 }
    ];
    
    try {
      await program.methods
        .setHolders(shareStorageName1, holders)
        .accounts(accounts)
        .signers([admin])
        .rpc();
      
      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("InvalidShareDistribution");
    }
  });

  it("Fail to set duplicate holders", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };
    
    // Create holders with duplicate pubkey
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 5000 },
      { pubkey: holder1.publicKey, shareBasisPoints: 5000 } // duplicate
    ];
    
    try {
      await program.methods
        .setHolders(shareStorageName1, holders)
        .accounts(accounts)
        .signers([admin])
        .rpc();
      
      expect.fail("Expected transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("HolderAlreadyExists");
    }
  });

  it("Deposit funds to first ShareStorage", async () => {
    const depositAmount = anchor.web3.LAMPORTS_PER_SOL; // 1 SOL
    const accounts = {
      shareStorage: shareStoragePda1,
      depositor: distributor.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    const balanceBefore = await provider.connection.getBalance(shareStoragePda1);

    await program.methods
      .depositFunds(shareStorageName1, new anchor.BN(depositAmount))
      .accounts(accounts)
      .signers([distributor])
      .rpc();

    const balanceAfter = await provider.connection.getBalance(shareStoragePda1);
    expect(balanceAfter - balanceBefore).to.equal(depositAmount);
  });

  it("Distribute all available shares from first ShareStorage", async () => {
    // First ensure we have valid holders (exactly 10,000 basis points)
    const setHoldersAccounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };
    
    const holders = [
      { pubkey: holder1.publicKey, shareBasisPoints: 3000 },
      { pubkey: holder2.publicKey, shareBasisPoints: 7000 }
    ];
    
    await program.methods
      .setHolders(shareStorageName1, holders)
      .accounts(setHoldersAccounts)
      .signers([admin])
      .rpc();

    // Get holder balances before distribution
    const holder1BalanceBefore = await provider.connection.getBalance(holder1.publicKey);
    const holder2BalanceBefore = await provider.connection.getBalance(holder2.publicKey);

    // Now distribute all available funds (no amount parameter)
    // Need to include holder accounts as remaining accounts in the same order as holders
    const accounts = {
      shareStorage: shareStoragePda1,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    const balanceBefore = await provider.connection.getBalance(shareStoragePda1);

    await program.methods
      .distributeShare(shareStorageName1)
      .accounts(accounts)
      .remainingAccounts([
        { pubkey: holder1.publicKey, isSigner: false, isWritable: true },
        { pubkey: holder2.publicKey, isSigner: false, isWritable: true }
      ])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    const balanceAfter = await provider.connection.getBalance(shareStoragePda1);
    
    // Check holder balances increased
    const holder1BalanceAfter = await provider.connection.getBalance(holder1.publicKey);
    const holder2BalanceAfter = await provider.connection.getBalance(holder2.publicKey);
    
    // Should have distributed funds proportionally
    expect(balanceBefore).to.be.greaterThan(balanceAfter);
    expect(holder1BalanceAfter).to.be.greaterThan(holder1BalanceBefore);
    expect(holder2BalanceAfter).to.be.greaterThan(holder2BalanceBefore);
    expect(shareStorage.totalDistributed.toNumber()).to.be.greaterThan(0);
    
    // Verify proportional distribution (30% vs 70%)
    const holder1Received = holder1BalanceAfter - holder1BalanceBefore;
    const holder2Received = holder2BalanceAfter - holder2BalanceBefore;
    const totalReceived = holder1Received + holder2Received;
    
    // Check ratios are approximately correct (allowing for rounding)
    const holder1Ratio = holder1Received / totalReceived;
    const holder2Ratio = holder2Received / totalReceived;
    
    expect(holder1Ratio).to.be.approximately(0.3, 0.01); // 30% ± 1%
    expect(holder2Ratio).to.be.approximately(0.7, 0.01); // 70% ± 1%
  });

  it("Disable first ShareStorage", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };

    await program.methods
      .disableShareStorage(shareStorageName1)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.enabled).to.be.false;
  });

  it("Verify second ShareStorage still enabled", async () => {
    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda2);
    expect(shareStorage.enabled).to.be.true;
  });

  it("Enable first ShareStorage again", async () => {
    const accounts = {
      shareStorage: shareStoragePda1,
      admin: admin.publicKey,
    };

    await program.methods
      .enableShareStorage(shareStorageName1)
      .accounts(accounts)
      .signers([admin])
      .rpc();

    const shareStorage = await program.account.shareStorage.fetch(shareStoragePda1);
    expect(shareStorage.enabled).to.be.true;
  });
});
