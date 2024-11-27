// @ts-nocheck

// Reserve-backed transfer: ParaA -> RC (reserve) -> ParaB
//
// Reference: https://paritytech.github.io/xcm-docs/journey/transfers/reserve.html#example
//
// Possible sanity checks
// 1. WithdrawAsset instruction before PayFees and InitiateReserveWithdraw
// 2. Asset used for fees + deposit is actually the same asset as the one used in the Withdraw
// 3. Amount of assets for fees + deposit <= amount withdrawn
// 4. Check if the address used for the deposit has 32 bytes
// 5. Double check XCM's correctness on finalize()

// Setting the context on ParaA
const paraAContext = `{"parents":"0","interior":{"X2":[{"GlobalConsensus":"Polkadot"},{"Parachain":"${PARACHAIN_A_ID}"}]}}`;

const xcmBuilder = XcmBuilder.usingContext(paraAContext)
  .defineAsset(
    PARACHAIN_A_NATIVE_TOKEN_SYMBOL,
    `{"parents":"0","interior":{"Here":""}}`
  )
  .create();

const xcm = xcmBuilder
  .withdrawAsset(PARACHAIN_A_NATIVE_TOKEN_SYMBOL, amount)
  .payFeesWith(PARACHAIN_A_NATIVE_TOKEN_SYMBOL)
  .setNextHop(`{"parents":"1","interior":{"X1":[{"Here":""}]}}`)
  .transferAll(PARACHAIN_A_NATIVE_TOKEN_SYMBOL, "reserve")
  .setNextHop(
    `{"parents":"0","interior":{"X1":[{"Parachain":"${PARACHAIN_B_ID}"}]}}`
  )
  .transferAll(PARACHAIN_A_NATIVE_TOKEN_SYMBOL, "reserve")
  .depositAll(BOB_32_BYTES_ADDRESS)
  .finalize();

console.log(JSON.stringify(xcm));

// Should print this Vanilla XCM:
[
  {
    withdrawAsset: [
      {
        id: {
          parents: 0,
          interior: Junctions.Here(), // N!: Parachain A's native token
        },
        fun: {
          fungible: amount,
        },
      },
    ],
  },
  {
    payFees: {
      asset: {
        parents: 0,
        interior: Junctions.Here(),
      },
    },
  },
  {
    initiateReserveWithdraw: {
      assets: [
        {
          Wild: "All",
        },
      ],
      reserve: {
        parents: 1,
        interior: Junctions.Here(), // N!: Polkadot Relay Chain
      },
      xcm: [
        {
          depositReserveAsset: {
            assets: [
              {
                wild: "All", // N!: Deposit all assets in the Holding Register
              },
            ],
            dest: {
              parents: 0,
              interior: {
                X1: {
                  Parachain: PARACHAIN_B_ID,
                },
              },
            },
            xcm: [
              {
                depositAsset: {
                  assets: [
                    {
                      wild: "All", // N!: Deposit all assets in the Holding Register
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
