// @ts-nocheck

// Sending USDT from Moonbeam to Hydration Network (through Asset Hub)
//
// Possible sanity checks
// 1. WithdrawAsset instruction before DepositReserveAsset
// 2. PayFees instruction before changing the Origin (with setNextHop)
// 3. Asset used for fees + deposit is actually the same asset as the one used in the Withdraw
// 4. Check if the address used for the deposit has 32 bytes
// 5. Double check XCM's correctness on finalize()
//
// General Q?:
// Should I use v5's InitiateAssetsTransfer instead of InitiateReserveWithdraw / DepositReserveAsset / InitiateTeleport ?
//    InitiateAssetsTransfer {
// 	    destination: Location,
// 	    assets: Vec<AssetTransferFilter>,
// 	    remote_fees: Option<AssetTransferFilter>,
// 	    preserve_origin: bool,
// 	    remote_xcm: Xcm<()>,
//    }

// Setting the context on the Moonbeam parachain
const moonbeamContext =
  '{"parents":"0","interior":{"X2":[{"GlobalConsensus":"Polkadot"},{"Parachain":"2004"}]}}';

const xcmBuilder = XCMBuilder.usingContext(moonbeamContext)
  .defineAsset(
    "USDC",
    '{"parents":"1","interior":{"X3":[{"Parachain":"1000"},{"PalletInstance":"50"},{"GeneralIndex":"1337"}]}}'
  )
  .create();

const xcm = xcmBuilder
  .withdrawAsset("USDC", usdcAmount)
  .payFeesWith("USDC")
  .setNextHop('{"parents":"1","interior":{"X1":[{"Parachain":"1000"}]}}')
  .transferAll("USDC", "reserve")
  .payFeesWith("USDC") // Q?: Is this possible? To pay for fees with USDC instead of Hydration's native token (HDX)
  .setNextHop('{"parents":"1","interior":{"X1":[{{"Parachain":"2034"}]}}')
  .transferAll("USDC", "reserve")
  .depositAll(BOB_32_BYTES_ADDRESS)
  .finalize();

console.log(JSON.stringify(xcm));

// Should print this Vanilla XCM:
[
  {
    withdrawAsset: [
      {
        id: {
          parents: 1,
          interior: {
            X3: [
              {
                Parachain: "1000",
              },
              {
                PalletInstance: "50",
              },
              {
                GeneralIndex: "1337",
              },
            ],
          },
        },
        fun: {
          fungible: usdcAmount,
        },
      },
    ],
  },
  {
    payFees: {
      asset: {
        parents: 1,
        interior: {
          X3: [
            {
              Parachain: "1000",
            },
            {
              PalletInstance: "50",
            },
            {
              GeneralIndex: "1337",
            },
          ],
        },
      },
    },
  },
  {
    depositReserveAsset: {
      assets: {
        Wild: "All", // Q?: Once again, does All deposit all assets in the holding register or do we need to be more explicit?
        // {
        // AllOf: {
        //   id: {
        //     parents: 0,
        //     interior: {
        //       X2: [
        //         {
        //           PalletInstance: "50",
        //         },
        //         {
        //           GeneralIndex: "1337",
        //         },
        //       ],
        //     },
        //   },
        //   fun: {
        //     fungible: amount,
        //   },
        // },
        // },
      },
      dest: {
        parents: 1,
        interior: {
          X1: [
            {
              Parachain: "1000",
            },
          ],
        },
      },
      xcm: [
        {
          payFees: {
            asset: {
              parents: 1,
              interior: {
                X3: [
                  {
                    Parachain: "1000",
                  },
                  {
                    PalletInstance: "50",
                  },
                  {
                    GeneralIndex: "1337",
                  },
                ],
              },
            },
          },
        },
        {
          depositReserveAsset: {
            assets: [
              {
                Wild: "All",
              },
            ],
            dest: {
              parents: 1,
              interior: {
                X1: {
                  Parachain: "2034",
                },
              },
            },
            xcm: [
              {
                depositAsset: {
                  assets: [
                    {
                      wild: "All",
                    },
                  ],
                  beneficiary: {
                    parents: 0,
                    interior: {
                      X1: {
                        AccountId32: {
                          network: "Polkadot",
                          id: BOB_32_BYTES_ADDRESS,
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
];
