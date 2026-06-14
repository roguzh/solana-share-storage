/**
 * Devnet integration test — sub-storage creation and two-step SOL distribution
 *
 * Topology:
 *   parent-storage (authority, 100% → sub-storage)
 *     └─ sub-storage  (authority, 50% leaf1 / 50% leaf2)
 *
 * Steps:
 *   1. Create parent storage
 *   2. Create sub-storage (with parentPda)
 *   3. Set sub-storage holders  → [leaf1 50%, leaf2 50%]
 *   4. Set parent holders       → [subStoragePda 100%, isStorage=true]
 *   5. Fund parent PDA with 0.01 SOL
 *   6. Distribute parent  → sub-storage PDA receives ~0.01 SOL
 *   7. Distribute sub     → leaf1 and leaf2 each receive ~0.005 SOL
 *   8. Print balance deltas and assert expectations
 *
 * Usage:
 *   yarn test:substorage
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import idl from "../sdk/idl/idl.json";
import type { EnhancedRoyalties } from "../sdk/idl/idl";
import { EnhancedRoyaltiesSDK } from "../sdk/index";

// ─── config ──────────────────────────────────────────────────────────────────

const RPC_URL =
  process.env.RPC_URL ??
  "https://devnet.helius-rpc.com/?api-key=162aa5b6-99d8-4606-9051-463afbf8c5b5";

const KEYPAIR_PATH = path.resolve(__dirname, "../keypair/authority.json");

// Use a timestamp suffix so each run creates fresh accounts without collisions.
const RUN_ID = Date.now().toString().slice(-6);
const PARENT_NAME = `tp-${RUN_ID}`;
const SUB_NAME = `ts-${RUN_ID}`;
const FUND_LAMPORTS = 0.05 * LAMPORTS_PER_SOL; // funds sent to parent PDA

// ─── helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}

function loadKeypair(p: string) {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8")))
  );
}

async function getBalance(connection: Connection, pubkey: PublicKey) {
  return connection.getBalance(pubkey, "confirmed");
}

async function sendTx(
  provider: anchor.AnchorProvider,
  tx: Transaction,
  label: string
) {
  const { blockhash, lastValidBlockHeight } =
    await provider.connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = provider.wallet.publicKey;
  const signed = await provider.wallet.signTransaction(tx);
  const sig = await provider.connection.sendRawTransaction(signed.serialize());
  await provider.connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  log(`  ✓ ${label}`);
  log(`    https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  return sig;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n  ✗ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  log(`  ✓ assert: ${message}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const authority = loadKeypair(KEYPAIR_PATH);
  const leaf1 = Keypair.generate();
  const leaf2 = Keypair.generate();

  log("═══════════════════════════════════════════════════════");
  log("  Sub-storage devnet integration test");
  log("═══════════════════════════════════════════════════════");
  log(`  Authority : ${authority.publicKey.toBase58()}`);
  log(`  Leaf 1    : ${leaf1.publicKey.toBase58()}`);
  log(`  Leaf 2    : ${leaf2.publicKey.toBase58()}`);
  log(`  Parent    : ${PARENT_NAME}`);
  log(`  Sub       : ${SUB_NAME}`);
  log("");

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const sdk = new EnhancedRoyaltiesSDK(RPC_URL);
  const admin = authority.publicKey;

  const parentPda = sdk.findShareStoragePda(admin, PARENT_NAME);
  const subPda = sdk.findShareStoragePda(admin, SUB_NAME);

  log(`  Parent PDA: ${parentPda.toBase58()}`);
  log(`  Sub PDA   : ${subPda.toBase58()}`);
  log("");

  // ── 1. Create parent storage ──────────────────────────────────────────────
  log("── Step 1: Create parent storage ──");
  await sendTx(
    provider,
    await sdk.initShareStorageTransaction({
      storageName: PARENT_NAME,
      initiator: admin,
    }),
    `initializeShareStorage("${PARENT_NAME}")`
  );

  // ── 2. Create sub-storage ─────────────────────────────────────────────────
  log("\n── Step 2: Create sub-storage ──");
  await sendTx(
    provider,
    await sdk.initShareStorageTransaction({
      storageName: SUB_NAME,
      initiator: admin,
      parentPda,
    }),
    `initializeShareStorage("${SUB_NAME}", parent=${parentPda.toBase58().slice(0, 8)}…)`
  );

  // Verify parent field stored correctly
  const subAccount = await sdk.getShareStorage({
    shareStorageName: SUB_NAME,
    admin,
  });
  assert(
    subAccount.parent?.toBase58() === parentPda.toBase58(),
    `sub-storage parent === parentPda`
  );

  // ── 3. Set sub-storage holders: leaf1 50% / leaf2 50% ────────────────────
  log("\n── Step 3: Set sub-storage holders ──");
  await sendTx(
    provider,
    await sdk.setHoldersTransaction({
      shareStorageName: SUB_NAME,
      admin,
      holders: [
        {
          pubkey: leaf1.publicKey,
          shareBasisPoints: 5000,
          isStorage: false,
        },
        {
          pubkey: leaf2.publicKey,
          shareBasisPoints: 5000,
          isStorage: false,
        },
      ],
    }),
    `setHolders("${SUB_NAME}", leaf1=50%, leaf2=50%)`
  );

  // ── 4. Set parent holders: sub-storage 100% (isStorage=true) ─────────────
  log("\n── Step 4: Set parent holders ──");
  await sendTx(
    provider,
    await sdk.setHoldersTransaction({
      shareStorageName: PARENT_NAME,
      admin,
      holders: [
        {
          pubkey: subPda,
          shareBasisPoints: 10000,
          isStorage: true,
        },
      ],
    }),
    `setHolders("${PARENT_NAME}", subPda=100%, isStorage=true)`
  );

  // Verify isStorage flag persisted
  const parentAccount = await sdk.getShareStorage({
    shareStorageName: PARENT_NAME,
    admin,
  });
  assert(
    parentAccount.holders[0].isStorage === true,
    "parent holder[0].isStorage === true"
  );
  assert(
    parentAccount.holders[0].pubkey.toBase58() === subPda.toBase58(),
    "parent holder[0].pubkey === subPda"
  );

  // ── 5. Fund parent PDA ────────────────────────────────────────────────────
  log("\n── Step 5: Fund parent PDA ──");
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: admin,
      toPubkey: parentPda,
      lamports: FUND_LAMPORTS,
    })
  );
  await sendTx(provider, fundTx, `transfer ${FUND_LAMPORTS / LAMPORTS_PER_SOL} SOL → parentPda`);

  const parentBalanceBefore = await getBalance(connection, parentPda);
  const subBalanceBefore = await getBalance(connection, subPda);
  const leaf1BalanceBefore = await getBalance(connection, leaf1.publicKey);
  const leaf2BalanceBefore = await getBalance(connection, leaf2.publicKey);

  log(`\n  Balances before distribution:`);
  log(`    parent PDA : ${(parentBalanceBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  log(`    sub PDA    : ${(subBalanceBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  log(`    leaf1      : ${(leaf1BalanceBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  log(`    leaf2      : ${(leaf2BalanceBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  // ── 6. Distribute from parent → sub-storage PDA ───────────────────────────
  log("\n── Step 6: Distribute from parent ──");
  await sendTx(
    provider,
    await sdk.distributeSolTransaction({ shareStorageName: PARENT_NAME, admin }),
    `distributeSol("${PARENT_NAME}")`
  );

  const subBalanceAfterParentDist = await getBalance(connection, subPda);
  const subReceived = subBalanceAfterParentDist - subBalanceBefore;
  log(`\n  Sub PDA received: ${(subReceived / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  assert(subReceived > 0, "sub-storage PDA received SOL from parent distribution");

  // ── 7. Distribute from sub → leaf wallets ─────────────────────────────────
  log("\n── Step 7: Distribute from sub-storage ──");
  await sendTx(
    provider,
    await sdk.distributeSolTransaction({ shareStorageName: SUB_NAME, admin }),
    `distributeSol("${SUB_NAME}")`
  );

  const leaf1BalanceAfter = await getBalance(connection, leaf1.publicKey);
  const leaf2BalanceAfter = await getBalance(connection, leaf2.publicKey);
  const leaf1Received = leaf1BalanceAfter - leaf1BalanceBefore;
  const leaf2Received = leaf2BalanceAfter - leaf2BalanceBefore;

  log(`\n  Leaf balances after full cascade:`);
  log(`    leaf1 received: ${(leaf1Received / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  log(`    leaf2 received: ${(leaf2Received / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  assert(leaf1Received > 0, "leaf1 received SOL");
  assert(leaf2Received > 0, "leaf2 received SOL");
  assert(
    Math.abs(leaf1Received - leaf2Received) <= 1,
    "leaf1 ≈ leaf2 (50/50 split, ±1 lamport rounding)"
  );

  // ── 8. Verify getStorageTree ──────────────────────────────────────────────
  log("\n── Step 8: Verify getStorageTree ──");
  const tree = await sdk.getStorageTree(admin);
  const parentNode = tree.find((n) => n.publicKey.toBase58() === parentPda.toBase58());
  assert(parentNode !== undefined, "parent appears in tree root");
  assert(
    parentNode!.children.some((c) => c.publicKey.toBase58() === subPda.toBase58()),
    "sub-storage appears as child of parent"
  );
  const leafCount = sdk.countLeafHolders(parentNode!);
  assert(leafCount === 2, `countLeafHolders(parentNode) === 2 (got ${leafCount})`);

  log("\n═══════════════════════════════════════════════════════");
  log("  All assertions passed ✓");
  log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n✗ Test failed:", err);
  process.exit(1);
});
