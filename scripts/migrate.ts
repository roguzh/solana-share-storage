/**
 * Devnet migration script — upgrades all legacy ShareStorage accounts
 * owned by the authority wallet to the new on-chain format.
 *
 * Usage:
 *   yarn migrate              # live run
 *   yarn migrate --dry-run    # show which accounts would be migrated
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import idl from "../sdk/idl/idl.json";
import type { EnhancedRoyalties } from "../sdk/idl/idl";

// ─── config ──────────────────────────────────────────────────────────────────

const RPC_URL =
  process.env.RPC_URL ??
  "https://devnet.helius-rpc.com/?api-key=162aa5b6-99d8-4606-9051-463afbf8c5b5";

const KEYPAIR_PATH = path.resolve(__dirname, "../keypair/authority.json");

const SHARE_STORAGE_DISC = Buffer.from([7, 125, 46, 177, 253, 137, 208, 123]);

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadKeypair(filePath: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function isOldFormat(
  program: anchor.Program<EnhancedRoyalties>,
  data: Buffer
): boolean {
  try {
    program.coder.accounts.decode("shareStorage", data);
    return false; // decoded fine → already migrated
  } catch {
    return true; // failed → old format
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍  DRY RUN — no transactions will be sent\n");

  const authority = loadKeypair(KEYPAIR_PATH);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  console.log(`RPC:       ${RPC_URL}\n`);

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as EnhancedRoyalties, provider);

  // ── fetch all raw program accounts ────────────────────────────────────────
  console.log("Fetching all program accounts...");
  const allAccounts = await connection.getProgramAccounts(program.programId);
  console.log(`Found ${allAccounts.length} total account(s)\n`);

  const toMigrate: { pubkey: PublicKey; data: Buffer }[] = [];

  for (const { pubkey, account } of allAccounts) {
    const data = account.data;

    // skip non-ShareStorage accounts (wrong discriminator)
    if (!data.slice(0, 8).equals(SHARE_STORAGE_DISC)) continue;

    // skip accounts not owned by this authority
    const storedAdmin = new PublicKey(data.slice(8, 40));
    if (!storedAdmin.equals(authority.publicKey)) continue;

    if (isOldFormat(program, data)) {
      console.log(`  [NEEDS MIGRATION]  ${pubkey.toBase58()}`);
      toMigrate.push({ pubkey, data });
    } else {
      console.log(`  [already current]  ${pubkey.toBase58()}`);
    }
  }

  console.log(
    `\n${toMigrate.length} account(s) need migration out of ${allAccounts.length} found.\n`
  );

  if (toMigrate.length === 0 || dryRun) return;

  // ── migrate ───────────────────────────────────────────────────────────────
  let success = 0;
  let failed = 0;

  for (const { pubkey } of toMigrate) {
    process.stdout.write(`  Migrating ${pubkey.toBase58()} ... `);
    try {
      const sig = await program.methods
        .migrateStorage()
        .accounts({
          shareStorage: pubkey,
          admin: authority.publicKey,
          payer: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      console.log(`✓  ${sig}`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗  ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone — ${success} migrated, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
