// @ts-nocheck

// Teleport NFT from Westend AH to Roccoco AH
//
// Possible sanity checks
// 1. WithdrawAsset instruction before PayFees and InitiateTeleport
// 2. Asset used for fees was already withdrawn (currently in the Holding Register)
// 3. Asset being teleported was already withdrawn (currently in the Holding Register)
// 4. Check if the address used for the deposit has 32 bytes
// 5. Double check XCM's correctness on finalize()

// [Westend] Genesis block hash
const WESTEND_GENESIS_HASH =
  "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e";
// [Rococo] Genesis block hash
const ROCOCO_GENESIS_HASH =
  "0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e";

// Setting the context on the Westend relay chain
const westendAssetHubContext = `{"parents":"0","interior":{"X1":[{"GlobalConsensus":{"ByGenesis":"${WESTEND_GENESIS_HASH}"}}]}}`;

const xcmBuilder = XCMBuilder.usingContext(westendAssetHubContext)
  .defineAsset("WND", `{"parents":"0","interior":{"Here":""}}`)
  .defineAsset(
    "NFT_COLLECTION",
    `{"parents":"0","interior":{"X3":[{"Parachain":"1000"},{"PalletInstance":"52"},{"GeneralIndex":"0"}]}}` // N!: NFT Collection ID: 0 (KodaDot)
  )
  .create();

const xcm = xcmBuilder
  .withdrawAsset("WND", amountForFees) // N!: Withdraw WND to pay the fees
  .withdrawNft("NFT_Collection", 0) // N!: Token with ID: 0
  .payFeesWith("WND") // Q?: This is strictly necessary, right? What about paying fees for minting the NFT on the Rococo AH, is it also necessary to explicit include another payFeesWith call?
  .setNextHop(
    `{"parents":"1","interior":{"X2":[{"GlobalConsensus":{"ByGenesis":"${ROCOCO_GENESIS_HASH},{"Parachain":"1000"}"}}]}}`
  )
  .transferNft("NFT_Collection", 0, "teleport")
  .depositAll(BOB_32_BYTES_ADDRESS_ON_ROCOCO)
  .finalize();

console.log(JSON.stringify(xcm));

// Should print this Vanilla XCM:
[
  {
    withdrawAsset: [
      {
        id: {
          parents: 0,
          interior: {
            X3: [
              {
                Parachain: "1000",
              },
              {
                PalletInstance: "52",
              },
              {
                GeneralIndex: "0", // NFT Collection ID: 0
              },
            ],
          },
        },
        fun: {
          nonFungible: 0, // NFT ID: 0
        },
      },
    ],
  },
  {
    withdrawAsset: [
      {
        id: {
          parents: 0,
          interior: Junctions.Here(),
        },
        fun: {
          fungible: wndAmountForFees,
        },
      },
    ],
  },
  {
    payFees: {
      asset: {
        parents: 0,
        interior: Junctions.Here(), // Westend's native token: WND
      },
    },
  },
  {
    initiateTeleport: {
      assets: {
        Wild: {
          AllOf: {
            id: {
              parents: 0,
              interior: {
                X1: [
                  {
                    Parachain: "1000", // Q?: Do I also have to include the uniques pallet { PalletInstance: "52" } in the filter?
                  },
                ],
              },
            },
            fun: "nonFungible",
          },
        },
      },
      destination: {
        parents: 1,
        interior: {
          X2: [
            {
              GlobalConsensus: {
                ByGenesis: ROCOCO_GENESIS_HASH,
              },
            },
            {
              Parachain: 1000,
            },
          ],
        },
      },
      xcm: [
        // Q?: The context now is Rococo's AH? (Or None?)
        {
          depositAsset: {
            assets: [
              {
                Wild: {
                  AllOf: {
                    id: {
                      parents: 2,
                      interior: {
                        X2: [
                          {
                            GlobalConsensus: {
                              ByGenesis: WESTERN_GENESIS_HASH,
                            },
                          },
                          {
                            Parachain: "1000",
                          },
                        ],
                      },
                    },
                    fun: "nonFungible",
                  },
                },
              },
            ],
            beneficiary: {
              parents: 0,
              interior: {
                X1: [
                  {
                    AccountId32: {
                      network: "Polkadot",
                      id: BOB_32_BYTES_ADDRESS_ON_ROCOCO,
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  },
];
