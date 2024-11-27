// @ts-nocheck

// Reserve-backed transfer: RC (reserve) -> Hydration
//
// Reference: Real Tx https://hydration.subscan.io/xcm_message/polkadot-e06c409c4d11c0d2671657bafe0d9c754dba610d
//
// Possible sanity checks
// 1. WithdrawAsset instruction before PayFees and DepositReserveAsset
// 2. Asset used for fees + deposit is actually the same asset as the one used in the Withdraw
// 3. Amount of assets for fees + deposit <= amount withdrawn
// 4. Check if the address used for the deposit has 32 bytes
// 5. Double check XCM's correctness on finalize()

const HYDRATION_PARA_ID = 2034;
const DEST_HYDRATION_ACC =
  "0x48d5240fede0bd26c4f28f51b14cc5215d52390e04538d11abbd6b197082623b";

// Setting the context on Polkadot Relay Chain
const relayChainContext = `{"parents":"0","interior":{"X1":[{"GlobalConsensus":"Polkadot"}]}}`;

const xcmBuilder = XCMBuilder.usingContext(relayChainContext)
  .defineAsset("DOT", `{"parents":"0","interior":{"Here":""}}`)
  .create();

const xcm = xcmBuilder
  .withdrawAsset("DOT", 1000000000000)
  .payFeesWith("DOT")
  .setNextHop(
    `{"parents":"0","interior":{"X1":[{"Parachain":"${HYDRATION_PARA_ID}"}]}}`
  )
  .transferAll("DOT", "reserve")
  .depositAll(DEST_HYDRATION_ACC)
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
          fungible: 1000000000000,
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
            Parachain: HYDRATION_PARA_ID,
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
                    id: DEST_HYDRATION_ACC,
                  },
                },
              },
            },
          },
        },
      ],
    },
  },
];
