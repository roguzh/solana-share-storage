/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/enhanced_royalties.json`.
 */
export type EnhancedRoyalties = {
  "address": "AnjNX2EMg7CxBNmc2rod1ViHJiUx5WjNCFvsfwKVauL4",
  "metadata": {
    "name": "enhancedRoyalties",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "depositFunds",
      "docs": [
        "Deposit funds to the ShareStorage account"
      ],
      "discriminator": [
        202,
        39,
        52,
        211,
        53,
        20,
        250,
        88
      ],
      "accounts": [
        {
          "name": "shareStorage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  95,
                  115,
                  116,
                  111,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "share_storage.admin",
                "account": "shareStorage"
              },
              {
                "kind": "account",
                "path": "share_storage.name",
                "account": "shareStorage"
              }
            ]
          }
        },
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disableShareStorage",
      "docs": [
        "Disable the ShareStorage (admin only)"
      ],
      "discriminator": [
        200,
        106,
        218,
        67,
        53,
        22,
        222,
        6
      ],
      "accounts": [
        {
          "name": "shareStorage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  95,
                  115,
                  116,
                  111,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "share_storage.admin",
                "account": "shareStorage"
              },
              {
                "kind": "account",
                "path": "share_storage.name",
                "account": "shareStorage"
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "shareStorage"
          ]
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "distributeShare",
      "docs": [
        "Distribute all available shares to holders"
      ],
      "discriminator": [
        67,
        146,
        65,
        210,
        255,
        48,
        2,
        187
      ],
      "accounts": [
        {
          "name": "shareStorage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  95,
                  115,
                  116,
                  111,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "share_storage.admin",
                "account": "shareStorage"
              },
              {
                "kind": "account",
                "path": "share_storage.name",
                "account": "shareStorage"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "enableShareStorage",
      "docs": [
        "Enable the ShareStorage (admin only)"
      ],
      "discriminator": [
        252,
        197,
        219,
        224,
        174,
        137,
        201,
        102
      ],
      "accounts": [
        {
          "name": "shareStorage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  95,
                  115,
                  116,
                  111,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "share_storage.admin",
                "account": "shareStorage"
              },
              {
                "kind": "account",
                "path": "share_storage.name",
                "account": "shareStorage"
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "shareStorage"
          ]
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeShareStorage",
      "docs": [
        "Initialize a new ShareStorage account with a name"
      ],
      "discriminator": [
        133,
        62,
        139,
        155,
        101,
        124,
        145,
        30
      ],
      "accounts": [
        {
          "name": "shareStorage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  95,
                  115,
                  116,
                  111,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "admin"
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "setHolders",
      "docs": [
        "Set all holders for the ShareStorage (replaces existing holders)"
      ],
      "discriminator": [
        81,
        132,
        16,
        4,
        55,
        40,
        251,
        240
      ],
      "accounts": [
        {
          "name": "shareStorage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  95,
                  115,
                  116,
                  111,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "share_storage.admin",
                "account": "shareStorage"
              },
              {
                "kind": "account",
                "path": "share_storage.name",
                "account": "shareStorage"
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "shareStorage"
          ]
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "holders",
          "type": {
            "vec": {
              "defined": {
                "name": "shareHolder"
              }
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "shareStorage",
      "discriminator": [
        7,
        125,
        46,
        177,
        253,
        137,
        208,
        123
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "tooManyHolders",
      "msg": "Too many holders. Maximum is 16."
    },
    {
      "code": 6001,
      "name": "holderAlreadyExists",
      "msg": "Holder already exists."
    },
    {
      "code": 6002,
      "name": "holderNotFound",
      "msg": "Holder not found."
    },
    {
      "code": 6003,
      "name": "shareStorageDisabled",
      "msg": "ShareStorage is disabled."
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "Unauthorized. Only admin can perform this action."
    },
    {
      "code": 6005,
      "name": "invalidShareDistribution",
      "msg": "Invalid share distribution. Total basis points must equal exactly 10,000."
    },
    {
      "code": 6006,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for distribution."
    },
    {
      "code": 6007,
      "name": "invalidName",
      "msg": "Invalid name. Name must be between 1 and 32 characters."
    },
    {
      "code": 6008,
      "name": "invalidAmount",
      "msg": "Invalid amount. Amount must be greater than 0."
    },
    {
      "code": 6009,
      "name": "noHolders",
      "msg": "No holders available for distribution."
    },
    {
      "code": 6010,
      "name": "invalidHolderAccounts",
      "msg": "Invalid number of holder accounts provided."
    },
    {
      "code": 6011,
      "name": "invalidHolderAccount",
      "msg": "Holder account does not match expected pubkey."
    },
    {
      "code": 6012,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow occurred."
    }
  ],
  "types": [
    {
      "name": "shareHolder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "shareBasisPoints",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "shareStorage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "lastDistributedAt",
            "type": "i64"
          },
          {
            "name": "totalDistributed",
            "type": "u64"
          },
          {
            "name": "holders",
            "type": {
              "vec": {
                "defined": {
                  "name": "shareHolder"
                }
              }
            }
          }
        ]
      }
    }
  ]
};
