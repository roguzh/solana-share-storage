import { EnhancedRoyaltiesSDK } from ".";
import * as anchor from "@coral-xyz/anchor";

const buffer = Uint8Array.from([
  180, 87, 242, 226, 200, 7, 236, 171, 65, 23, 139, 203, 124, 188, 56, 124, 106,
  209, 230, 160, 241, 68, 161, 51, 253, 157, 213, 137, 34, 109, 63, 165, 161,
  92, 37, 47, 88, 221, 198, 0, 105, 8, 104, 215, 182, 147, 204, 98, 113, 248,
  142, 64, 179, 231, 209, 193, 106, 72, 182, 64, 222, 239, 3, 157,
]);

const admin = anchor.web3.Keypair.fromSecretKey(buffer);

// const SevenSeasRoyalties1_Holders = [
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "EuqwFrQ9yDk6hCMJd9VEt6a3WiPhvEbBtFXoP2GK74gU"
//     ),
//     shareBasisPoints: 3000, // The Seven Seas: 30%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "Gcoy2MfuP6tSviTUbs37d9VRfjY5iqCN8wMYQGRYNucw"
//     ),
//     shareBasisPoints: 3000, // Trippin' Ape Tribe: 30%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "8UwHKvH5x129Sw1hihyTg1q9PaxEP2CsHsaqk8xCQEjX"
//     ),
//     shareBasisPoints: 1400, // Riddick: 14%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "DEUQZ9Z4m6ifazjKZCqoep1MUY8X1QBVpuxaq5t7nCks"
//     ),
//     shareBasisPoints: 600, // Oguz: 6%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "ATMnRvvmQSWwHA59hbQ5Vg8pBbnXBLRSKw7Kbd5Qv2KT"
//     ),
//     shareBasisPoints: 600, // Atmaca: 6%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "FRgRdaRFEiPDe63WdfzJpZWHG1MYJqSZ8SD6i45jGpAG"
//     ),
//     shareBasisPoints: 600, // Furkan: 6%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "GjpdmYXu7PZfebzxBhRkbiksqF4jJuVMmX2cvnvf4s2T"
//     ),
//     shareBasisPoints: 600, // Genenid: 6%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "BTXh3x9irA6nriCaQTfikzayKtoFdFRSfbc36ess1oM8"
//     ),
//     shareBasisPoints: 200, // DAO: 2%
//   },
// ];

/*const SevenSeasRoyalties2_Holders = [
  {
    pubkey: new anchor.web3.PublicKey(
      "GgX8W6EFNpR2RcLecb8Wxs5NAHXzmcBX6Y3n649Rk9ec"
    ),
    shareBasisPoints: 3000, // Shredded Apes: 30%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "6r1ApKP3UJVqJKd5rpUCoKGAFJ3tjnMkAqd791QxqjEp"
    ),
    shareBasisPoints: 3000, // KAST: 30%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "8qppDQ5RrDGo6aLFFMpNmSguCmsw8UhAR6iwbaq2aBs8"
    ),
    shareBasisPoints: 800, // Apex: 8%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "8UtVXZop1w47bmY7FVE2ijiY8RRshTHaXpEDQjwKWsLK"
    ),
    shareBasisPoints: 800, // Arminus: 8%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "78aWkKHRC6PxM9Q3wrfTsMa9uU1QtEFjchKLh93QV7Tg"
    ),
    shareBasisPoints: 400, // Farmer: 4%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "8ng6uk1MdC9Uc3Sze83XhMQMiud3nwzgCc9sTwbssat7"
    ),
    shareBasisPoints: 400, // Lendy: 4%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "5FC65QiyEYYfKZQfxUZqHh6u59UZZx7TBScLNkB1t7PL"
    ),
    shareBasisPoints: 400, // MK: 4%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "Fvk65sdEBZG86WXtVHh2hKTvgYzHEiPTDL5SqpJgPYaZ"
    ),
    shareBasisPoints: 400, // Kris: 4%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "9zhn8z8ezHtHwTpqYW3LuuBCTj8a7uVHAk89tVdv6qtE"
    ),
    shareBasisPoints: 400, // Adam: 4%
  },
  {
    pubkey: new anchor.web3.PublicKey(
      "H4U5TdDJQ3CK4D96eUrS1SPcbqQuPxxuregM7Jr7ss3v"
    ),
    shareBasisPoints: 400, // Sybile: 4%
  },
];*/

// const MTA_Holders = [
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "9zhn8z8ezHtHwTpqYW3LuuBCTj8a7uVHAk89tVdv6qtE"
//     ),
//     shareBasisPoints: 800, // Adam: 8%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "Fvk65sdEBZG86WXtVHh2hKTvgYzHEiPTDL5SqpJgPYaZ"
//     ),
//     shareBasisPoints: 800, // Kris: 8%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "H4U5TdDJQ3CK4D96eUrS1SPcbqQuPxxuregM7Jr7ss3v"
//     ),
//     shareBasisPoints: 800, // Sybelle: 8%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "8MpZ9XBJeeZKA9gq4JZav156eP2S9A5VbcAbq8p9D654"
//     ),
//     shareBasisPoints: 5000, // Company: 50%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "6r1ApKP3UJVqJKd5rpUCoKGAFJ3tjnMkAqd791QxqjEp"
//     ),
//     shareBasisPoints: 1600, // KAST: 16%
//   },
//   {
//     pubkey: new anchor.web3.PublicKey(
//       "8UwHKvH5x129Sw1hihyTg1q9PaxEP2CsHsaqk8xCQEjX"
//     ),
//     shareBasisPoints: 1000, // Riddick: 10%
//   },
// ];

const Riddick_Holders = [
  {
    pubkey: new anchor.web3.PublicKey(
      "8UwHKvH5x129Sw1hihyTg1q9PaxEP2CsHsaqk8xCQEjX",
    ),
    shareBasisPoints: 5000,
  },
    {
    pubkey: new anchor.web3.PublicKey(
      "6r1ApKP3UJVqJKd5rpUCoKGAFJ3tjnMkAqd791QxqjEp",
    ),
    shareBasisPoints: 5000, 
  },
];

const RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=162aa5b6-99d8-4606-9051-463afbf8c5b5";
const connection = new anchor.web3.Connection(RPC_URL, "confirmed");

const sdk = new EnhancedRoyaltiesSDK(RPC_URL);

const initStorage = async () => {
  const initStorageTx = await sdk.initShareStorageTransaction({
    storageName: "Riddick",
    initiator: admin.publicKey,
  });

  const signature = await connection.sendTransaction(initStorageTx, [admin], {
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });

  await connection.confirmTransaction(signature, "processed");

  const shareStorage = await sdk.getShareStorage({
    shareStorageName: "Riddick",
    admin: admin.publicKey,
  });

  console.log(shareStorage);
};

const setHolders = async () => {
  const setHoldersTx = await sdk.setHoldersTransaction({
    shareStorageName: "Riddick",
    holders: Riddick_Holders,
    admin: admin.publicKey,
  });

  const signature = await connection.sendTransaction(setHoldersTx, [admin], {
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });

  await connection.confirmTransaction(signature, "processed");

  const shareStorage = await sdk.getShareStorage({
    shareStorageName: "Riddick",
    admin: admin.publicKey,
  });

  console.log(shareStorage);
};

const distributeFunds = async () => {
  const distributeFundsTx = await sdk.distributeFundsTransaction({
    shareStorageName: "Riddick",
    admin: admin.publicKey,
  });

  const signature = await connection.sendTransaction(
    distributeFundsTx,
    [admin],
    {
      preflightCommitment: "confirmed",
      maxRetries: 3,
      skipPreflight: true,
    },
  );

  await connection.confirmTransaction(signature, "processed");

  const shareStorage = await sdk.getShareStorage({
    shareStorageName: "Riddick",
    admin: admin.publicKey,
  });

  console.log(shareStorage);
};

const displayStorageData = async () => {
  const shareStorage = await sdk.getShareStorage({
    shareStorageName: "Riddick",
    admin: admin.publicKey,
  });
  console.log("=== Share Storage Data ===");
  console.log("Name:", shareStorage.name);
  console.log("Address:", shareStorage.address.toBase58());
  console.log("Admin:", shareStorage.admin.toBase58());
  console.log("\nHolders:");
  shareStorage.holders.forEach((holder: any, index: number) => {
    const percentage = (holder.shareBasisPoints / 100).toFixed(2);
    console.log(`  ${index + 1}. ${holder.pubkey.toBase58()} - ${percentage}%`);
  });
  console.log("==========================");
};

const main = async () => {
  // await initStorage();
  await setHolders();
  // await distributeFunds();
  await displayStorageData();
};

main();
