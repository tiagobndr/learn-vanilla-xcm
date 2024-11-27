// @ts-nocheck

// Withdraw the native token from the account of Alice and deposit this token in the account
// of Bob (inside the same consensus system - Moonbeam in this specific case)
//
// Possible sanity checks
// 1. WithdrawAsset instruction before PayFees and DepositAsset
// 2. Asset used for fees + deposit is actually the same asset as the one used in the Withdraw
// 3. Amount of assets for fees + deposit <= amount withdrawn
// 4. Check if the address used for the deposit has 20 bytes
// 5. Double check XCM's correctness on finalize()

// Setting the context on the Moonbeam parachain
const moonbeamContext = `{"parents":"0","interior":{"X2":[{"GlobalConsensus":"Polkadot"},{"Parachain":"2004"}]}}`;

const xcmBuilder = XCMBuilder.usingContext(moonbeamContext)
  .defineAsset("GLMR", `{"parents":"0","interior":{"Here":""}}`)
  .create();

const xcm = xcmBuilder
  .withdrawAsset("GLMR", glmrAmount)
  .payFeesWith("GLMR")
  .depositAll(beneficiary)
  .finalize();

console.log(JSON.stringify(xcm));

// Should print this Vanilla XCM:
[
  {
    withdrawAsset: [
      {
        id: {
          parents: 0,
          interior: Junctions.Here(), // N!: Moonbeam's native token GLMR
        },
        fun: {
          fungible: glmrAmount,
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
            AccountId20: {
              network: "Ethereum",
              id: BOB_20_BYTES_ADDRESS,
            },
          },
        },
      },
    },
  },
];
