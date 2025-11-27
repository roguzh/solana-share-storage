import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as readline from "readline";
import bs58 from "bs58";
import idl from "./target/idl/enhanced_royalties.json";
import { EnhancedRoyalties } from "./target/types/enhanced_royalties";

const PROGRAM_ID = new PublicKey(
  "9B6FPPgiuSdD4wJauWWtvYas4xK4eBQypKjDZDRw2ft9"
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

interface ShareHolder {
  pubkey: PublicKey;
  shareBasisPoints: number;
}

class RoyaltiesCLI {
  private connection: Connection;
  private wallet: Wallet;
  private program: Program<EnhancedRoyalties>;
  private provider: AnchorProvider;

  constructor(rpcUrl: string, privateKeyBase58: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    this.wallet = new Wallet(keypair);
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: "confirmed",
    });
    this.program = new Program(idl as EnhancedRoyalties, this.provider);

    console.log(`\n✅ Connected to: ${rpcUrl}`);
    console.log(`✅ Wallet: ${this.wallet.publicKey.toString()}\n`);
  }

  async fetchAllStorages() {
    console.log("\n🔍 Fetching all storages for your wallet...\n");
    try {
      // Use memcmp to filter by admin field (offset 8 = after discriminator)
      const shareStorages = await this.program.account.shareStorage.all([
        {
          memcmp: {
            offset: 8,
            bytes: this.wallet.publicKey.toBase58(),
          },
        },
      ]);

      console.log(`📦 Share Storages (${shareStorages.length}):`);
      shareStorages.forEach((storage, i) => {
        console.log(`\n  ${i + 1}. ${storage.account.name}`);
        console.log(`     Address: ${storage.publicKey.toString()}`);
        console.log(`     Enabled: ${storage.account.enabled}`);
        console.log(`     Holders: ${storage.account.holders.length}`);
        console.log(
          `     Total Distributed: ${
            storage.account.totalDistributed.toNumber() / LAMPORTS_PER_SOL
          } SOL`
        );
      });
      return shareStorages;
    } catch (error) {
      console.error("❌ Error fetching storages:", error);
      throw error;
    }
  }

  async searchStorageByName(name: string) {
    console.log(`\n🔍 Searching for storage: "${name}"...\n`);
    try {
      const [storagePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("share_storage"),
          this.wallet.publicKey.toBuffer(),
          Buffer.from(name),
        ],
        PROGRAM_ID
      );

      const storage = await this.program.account.shareStorage.fetch(storagePda);
      console.log("✅ Found Share Storage:");
      console.log(`   Address: ${storagePda.toString()}`);
      console.log(`   Name: ${storage.name}`);
      console.log(`   Enabled: ${storage.enabled}`);
      console.log(`   Holders: ${storage.holders.length}`);
      storage.holders.forEach((holder: any, i: number) => {
        console.log(
          `     ${i + 1}. ${holder.pubkey.toString()} - ${
            holder.shareBasisPoints / 100
          }%`
        );
      });
      console.log(
        `   Total Distributed: ${storage.totalDistributed.toString()} lamports (${
          storage.totalDistributed.toNumber() / LAMPORTS_PER_SOL
        } SOL)`
      );
      return { pda: storagePda, data: storage };
    } catch (error) {
      console.log("❌ Storage not found");
      return null;
    }
  }

  async distributeSOL(name: string) {
    console.log(`\n💸 Distributing SOL from storage: "${name}"...\n`);
    try {
      const [shareStoragePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("share_storage"),
          this.wallet.publicKey.toBuffer(),
          Buffer.from(name),
        ],
        PROGRAM_ID
      );

      const shareStorage = await this.program.account.shareStorage.fetch(
        shareStoragePda
      );

      if (!shareStorage.enabled) {
        console.log("❌ Storage is disabled");
        return;
      }

      if (shareStorage.holders.length === 0) {
        console.log("❌ No holders configured");
        return;
      }

      const balance = await this.connection.getBalance(shareStoragePda);
      console.log(
        `💰 Current balance: ${balance} lamports (${
          balance / LAMPORTS_PER_SOL
        } SOL)`
      );

      if (balance === 0) {
        console.log("❌ No funds to distribute");
        return;
      }

      const remainingAccounts = shareStorage.holders.map((holder: any) => ({
        pubkey: holder.pubkey,
        isSigner: false,
        isWritable: true,
      }));

      const tx = await this.program.methods
        .distributeShare(name)
        .accounts({
          shareStorage: shareStoragePda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .rpc();

      console.log(`\n✅ Distribution successful!`);
      console.log(`   Transaction: ${tx}`);
    } catch (error) {
      console.error("❌ Error distributing SOL:", error);
      throw error;
    }
  }

  async updateHolders(name: string) {
    console.log(`\n📝 Updating holders for storage: "${name}"...\n`);

    const holders: ShareHolder[] = [];
    let totalBasisPoints = 0;

    console.log("Enter holder details (basis points: 10000 = 100%)");
    console.log("Press Enter with empty address to finish\n");

    while (true) {
      const address = await question(
        `Holder ${holders.length + 1} address (or Enter to finish): `
      );

      if (!address.trim()) break;

      try {
        const pubkey = new PublicKey(address.trim());
        const percentageStr = await question(
          `Percentage for this holder (e.g., 25 for 25%): `
        );
        const percentage = parseFloat(percentageStr);

        if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
          console.log("❌ Invalid percentage. Must be between 0 and 100");
          continue;
        }

        const shareBasisPoints = Math.floor(percentage * 100);
        totalBasisPoints += shareBasisPoints;

        if (totalBasisPoints > 10000) {
          console.log(
            `❌ Total percentage exceeds 100% (currently ${
              totalBasisPoints / 100
            }%)`
          );
          totalBasisPoints -= shareBasisPoints;
          continue;
        }

        holders.push({ pubkey, shareBasisPoints });
        console.log(`✅ Added: ${pubkey.toString()} - ${percentage}%`);
        console.log(`   Total so far: ${totalBasisPoints / 100}%\n`);
      } catch (error) {
        console.log("❌ Invalid address format");
      }
    }

    if (holders.length === 0) {
      console.log("❌ No holders added");
      return;
    }

    if (totalBasisPoints !== 10000) {
      console.log(
        `\n⚠️  Warning: Total percentage is ${
          totalBasisPoints / 100
        }% (should be 100%)`
      );
      const confirm = await question("Continue anyway? (yes/no): ");
      if (confirm.toLowerCase() !== "yes") {
        console.log("❌ Cancelled");
        return;
      }
    }

    try {
      const [shareStoragePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("share_storage"),
          this.wallet.publicKey.toBuffer(),
          Buffer.from(name),
        ],
        PROGRAM_ID
      );

      const tx = await this.program.methods
        .setHolders(name, holders)
        .accounts({
          shareStorage: shareStoragePda,
          admin: this.wallet.publicKey,
        })
        .rpc();

      console.log(`\n✅ Holders updated successfully!`);
      console.log(`   Transaction: ${tx}`);
    } catch (error) {
      console.error("❌ Error updating holders:", error);
      throw error;
    }
  }

  async mainMenu() {
    console.log("\n" + "=".repeat(50));
    console.log("Enhanced Royalties CLI");
    console.log("=".repeat(50));
    console.log("\n1. Fetch all storages");
    console.log("2. Search storage by name");
    console.log("3. Distribute SOL");
    console.log("4. Update holders");
    console.log("5. Exit");
    console.log("");

    const choice = await question("Select an option (1-5): ");

    switch (choice.trim()) {
      case "1":
        await this.fetchAllStorages();
        break;
      case "2":
        const searchName = await question("Enter storage name: ");
        await this.searchStorageByName(searchName.trim());
        break;
      case "3":
        const solName = await question("Enter storage name: ");
        await this.distributeSOL(solName.trim());
        break;
      case "4":
        const updateName = await question("Enter storage name: ");
        await this.updateHolders(updateName.trim());
        break;
      case "5":
        console.log("\n👋 Goodbye!");
        rl.close();
        process.exit(0);
        return;
      default:
        console.log("❌ Invalid option");
    }

    await this.mainMenu();
  }
}

async function main() {
  console.log("🚀 Enhanced Royalties CLI\n");

  const rpcUrl = await question("Enter RPC URL (or press Enter for default): ");
  const finalRpcUrl = rpcUrl.trim() || "https://api.mainnet-beta.solana.com";

  const privateKey = await question("Enter your private key (base58 format): ");

  try {
    const cli = new RoyaltiesCLI(finalRpcUrl, privateKey.trim());
    await cli.mainMenu();
  } catch (error) {
    console.error("\n❌ Failed to initialize CLI:", error);
    rl.close();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  rl.close();
  process.exit(1);
});
