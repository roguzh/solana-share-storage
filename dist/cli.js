"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var anchor_1 = require("@coral-xyz/anchor");
var web3_js_1 = require("@solana/web3.js");
var readline = __importStar(require("readline"));
var bs58_1 = __importDefault(require("bs58"));
var enhanced_royalties_json_1 = __importDefault(require("./target/idl/enhanced_royalties.json"));
var PROGRAM_ID = new web3_js_1.PublicKey("9B6FPPgiuSdD4wJauWWtvYas4xK4eBQypKjDZDRw2ft9");
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
function question(query) {
    return new Promise(function (resolve) { return rl.question(query, resolve); });
}
var RoyaltiesCLI = /** @class */ (function () {
    function RoyaltiesCLI(rpcUrl, privateKeyBase58) {
        this.connection = new web3_js_1.Connection(rpcUrl, "confirmed");
        var secretKey = bs58_1.default.decode(privateKeyBase58);
        var keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        this.wallet = new anchor_1.Wallet(keypair);
        this.provider = new anchor_1.AnchorProvider(this.connection, this.wallet, {
            commitment: "confirmed",
        });
        this.program = new anchor_1.Program(enhanced_royalties_json_1.default, this.provider);
        console.log("\n\u2705 Connected to: ".concat(rpcUrl));
        console.log("\u2705 Wallet: ".concat(this.wallet.publicKey.toString(), "\n"));
    }
    RoyaltiesCLI.prototype.fetchAllStorages = function () {
        return __awaiter(this, void 0, void 0, function () {
            var shareStorages, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\n🔍 Fetching all storages for your wallet...\n");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.program.account.shareStorage.all([
                                {
                                    memcmp: {
                                        offset: 8,
                                        bytes: this.wallet.publicKey.toBase58(),
                                    },
                                },
                            ])];
                    case 2:
                        shareStorages = _a.sent();
                        console.log("\uD83D\uDCE6 Share Storages (".concat(shareStorages.length, "):"));
                        shareStorages.forEach(function (storage, i) {
                            console.log("\n  ".concat(i + 1, ". ").concat(storage.account.name));
                            console.log("     Address: ".concat(storage.publicKey.toString()));
                            console.log("     Enabled: ".concat(storage.account.enabled));
                            console.log("     Holders: ".concat(storage.account.holders.length));
                            console.log("     Total Distributed: ".concat(storage.account.totalDistributed.toNumber() / web3_js_1.LAMPORTS_PER_SOL, " SOL"));
                        });
                        return [2 /*return*/, shareStorages];
                    case 3:
                        error_1 = _a.sent();
                        console.error("❌ Error fetching storages:", error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    RoyaltiesCLI.prototype.searchStorageByName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var storagePda, storage, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\n\uD83D\uDD0D Searching for storage: \"".concat(name, "\"...\n"));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        storagePda = web3_js_1.PublicKey.findProgramAddressSync([
                            Buffer.from("share_storage"),
                            this.wallet.publicKey.toBuffer(),
                            Buffer.from(name),
                        ], PROGRAM_ID)[0];
                        return [4 /*yield*/, this.program.account.shareStorage.fetch(storagePda)];
                    case 2:
                        storage = _a.sent();
                        console.log("✅ Found Share Storage:");
                        console.log("   Address: ".concat(storagePda.toString()));
                        console.log("   Name: ".concat(storage.name));
                        console.log("   Enabled: ".concat(storage.enabled));
                        console.log("   Holders: ".concat(storage.holders.length));
                        storage.holders.forEach(function (holder, i) {
                            console.log("     ".concat(i + 1, ". ").concat(holder.pubkey.toString(), " - ").concat(holder.shareBasisPoints / 100, "%"));
                        });
                        console.log("   Total Distributed: ".concat(storage.totalDistributed.toString(), " lamports (").concat(storage.totalDistributed.toNumber() / web3_js_1.LAMPORTS_PER_SOL, " SOL)"));
                        return [2 /*return*/, { pda: storagePda, data: storage }];
                    case 3:
                        error_2 = _a.sent();
                        console.log("❌ Storage not found");
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    RoyaltiesCLI.prototype.distributeSOL = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var shareStoragePda, shareStorage, balance, remainingAccounts, tx, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\n\uD83D\uDCB8 Distributing SOL from storage: \"".concat(name, "\"...\n"));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        shareStoragePda = web3_js_1.PublicKey.findProgramAddressSync([
                            Buffer.from("share_storage"),
                            this.wallet.publicKey.toBuffer(),
                            Buffer.from(name),
                        ], PROGRAM_ID)[0];
                        return [4 /*yield*/, this.program.account.shareStorage.fetch(shareStoragePda)];
                    case 2:
                        shareStorage = _a.sent();
                        if (!shareStorage.enabled) {
                            console.log("❌ Storage is disabled");
                            return [2 /*return*/];
                        }
                        if (shareStorage.holders.length === 0) {
                            console.log("❌ No holders configured");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.connection.getBalance(shareStoragePda)];
                    case 3:
                        balance = _a.sent();
                        console.log("\uD83D\uDCB0 Current balance: ".concat(balance, " lamports (").concat(balance / web3_js_1.LAMPORTS_PER_SOL, " SOL)"));
                        if (balance === 0) {
                            console.log("❌ No funds to distribute");
                            return [2 /*return*/];
                        }
                        remainingAccounts = shareStorage.holders.map(function (holder) { return ({
                            pubkey: holder.pubkey,
                            isSigner: false,
                            isWritable: true,
                        }); });
                        return [4 /*yield*/, this.program.methods
                                .distributeShare(name)
                                .accounts({
                                shareStorage: shareStoragePda,
                                systemProgram: web3_js_1.SystemProgram.programId,
                            })
                                .remainingAccounts(remainingAccounts)
                                .rpc()];
                    case 4:
                        tx = _a.sent();
                        console.log("\n\u2705 Distribution successful!");
                        console.log("   Transaction: ".concat(tx));
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        console.error("❌ Error distributing SOL:", error_3);
                        throw error_3;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    RoyaltiesCLI.prototype.updateHolders = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var holders, totalBasisPoints, address, pubkey, percentageStr, percentage, shareBasisPoints, error_4, confirm_1, shareStoragePda, tx, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\n\uD83D\uDCDD Updating holders for storage: \"".concat(name, "\"...\n"));
                        holders = [];
                        totalBasisPoints = 0;
                        console.log("Enter holder details (basis points: 10000 = 100%)");
                        console.log("Press Enter with empty address to finish\n");
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 7];
                        return [4 /*yield*/, question("Holder ".concat(holders.length + 1, " address (or Enter to finish): "))];
                    case 2:
                        address = _a.sent();
                        if (!address.trim())
                            return [3 /*break*/, 7];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        pubkey = new web3_js_1.PublicKey(address.trim());
                        return [4 /*yield*/, question("Percentage for this holder (e.g., 25 for 25%): ")];
                    case 4:
                        percentageStr = _a.sent();
                        percentage = parseFloat(percentageStr);
                        if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
                            console.log("❌ Invalid percentage. Must be between 0 and 100");
                            return [3 /*break*/, 1];
                        }
                        shareBasisPoints = Math.floor(percentage * 100);
                        totalBasisPoints += shareBasisPoints;
                        if (totalBasisPoints > 10000) {
                            console.log("\u274C Total percentage exceeds 100% (currently ".concat(totalBasisPoints / 100, "%)"));
                            totalBasisPoints -= shareBasisPoints;
                            return [3 /*break*/, 1];
                        }
                        holders.push({ pubkey: pubkey, shareBasisPoints: shareBasisPoints });
                        console.log("\u2705 Added: ".concat(pubkey.toString(), " - ").concat(percentage, "%"));
                        console.log("   Total so far: ".concat(totalBasisPoints / 100, "%\n"));
                        return [3 /*break*/, 6];
                    case 5:
                        error_4 = _a.sent();
                        console.log("❌ Invalid address format");
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 1];
                    case 7:
                        if (holders.length === 0) {
                            console.log("❌ No holders added");
                            return [2 /*return*/];
                        }
                        if (!(totalBasisPoints !== 10000)) return [3 /*break*/, 9];
                        console.log("\n\u26A0\uFE0F  Warning: Total percentage is ".concat(totalBasisPoints / 100, "% (should be 100%)"));
                        return [4 /*yield*/, question("Continue anyway? (yes/no): ")];
                    case 8:
                        confirm_1 = _a.sent();
                        if (confirm_1.toLowerCase() !== "yes") {
                            console.log("❌ Cancelled");
                            return [2 /*return*/];
                        }
                        _a.label = 9;
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        shareStoragePda = web3_js_1.PublicKey.findProgramAddressSync([
                            Buffer.from("share_storage"),
                            this.wallet.publicKey.toBuffer(),
                            Buffer.from(name),
                        ], PROGRAM_ID)[0];
                        return [4 /*yield*/, this.program.methods
                                .setHolders(name, holders)
                                .accounts({
                                shareStorage: shareStoragePda,
                                admin: this.wallet.publicKey,
                            })
                                .rpc()];
                    case 10:
                        tx = _a.sent();
                        console.log("\n\u2705 Holders updated successfully!");
                        console.log("   Transaction: ".concat(tx));
                        return [3 /*break*/, 12];
                    case 11:
                        error_5 = _a.sent();
                        console.error("❌ Error updating holders:", error_5);
                        throw error_5;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    RoyaltiesCLI.prototype.mainMenu = function () {
        return __awaiter(this, void 0, void 0, function () {
            var choice, _a, searchName, solName, updateName;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("\n" + "=".repeat(50));
                        console.log("Enhanced Royalties CLI");
                        console.log("=".repeat(50));
                        console.log("\n1. Fetch all storages");
                        console.log("2. Search storage by name");
                        console.log("3. Distribute SOL");
                        console.log("4. Update holders");
                        console.log("5. Exit");
                        console.log("");
                        return [4 /*yield*/, question("Select an option (1-5): ")];
                    case 1:
                        choice = _b.sent();
                        _a = choice.trim();
                        switch (_a) {
                            case "1": return [3 /*break*/, 2];
                            case "2": return [3 /*break*/, 4];
                            case "3": return [3 /*break*/, 7];
                            case "4": return [3 /*break*/, 10];
                            case "5": return [3 /*break*/, 13];
                        }
                        return [3 /*break*/, 14];
                    case 2: return [4 /*yield*/, this.fetchAllStorages()];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 15];
                    case 4: return [4 /*yield*/, question("Enter storage name: ")];
                    case 5:
                        searchName = _b.sent();
                        return [4 /*yield*/, this.searchStorageByName(searchName.trim())];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 15];
                    case 7: return [4 /*yield*/, question("Enter storage name: ")];
                    case 8:
                        solName = _b.sent();
                        return [4 /*yield*/, this.distributeSOL(solName.trim())];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 15];
                    case 10: return [4 /*yield*/, question("Enter storage name: ")];
                    case 11:
                        updateName = _b.sent();
                        return [4 /*yield*/, this.updateHolders(updateName.trim())];
                    case 12:
                        _b.sent();
                        return [3 /*break*/, 15];
                    case 13:
                        console.log("\n👋 Goodbye!");
                        rl.close();
                        process.exit(0);
                        return [2 /*return*/];
                    case 14:
                        console.log("❌ Invalid option");
                        _b.label = 15;
                    case 15: return [4 /*yield*/, this.mainMenu()];
                    case 16:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return RoyaltiesCLI;
}());
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var rpcUrl, finalRpcUrl, privateKey, cli, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🚀 Enhanced Royalties CLI\n");
                    return [4 /*yield*/, question("Enter RPC URL (or press Enter for default): ")];
                case 1:
                    rpcUrl = _a.sent();
                    finalRpcUrl = rpcUrl.trim() || "https://api.mainnet-beta.solana.com";
                    return [4 /*yield*/, question("Enter your private key (base58 format): ")];
                case 2:
                    privateKey = _a.sent();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    cli = new RoyaltiesCLI(finalRpcUrl, privateKey.trim());
                    return [4 /*yield*/, cli.mainMenu()];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_6 = _a.sent();
                    console.error("\n❌ Failed to initialize CLI:", error_6);
                    rl.close();
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error:", error);
    rl.close();
    process.exit(1);
});
