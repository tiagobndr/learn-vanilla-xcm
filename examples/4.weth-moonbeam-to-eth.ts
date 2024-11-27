// @ts-nocheck

// Transfer WETH from Alice's account on Moonbeam to Bob's account on Ethereum via AssetHub bridge lane
//
// Reference: https://forum.polkadot.network/t/polkadot-parachains-options-for-using-polkadot-ethereum-bridge-snowbridge/10889/2
//
// Possible sanity checks
// 1. WithdrawAsset instruction(s) before InitiateTransfer
// 2. PayFees instruction before changing the Origin (with setNextHop)
// 3. Asset used for fees is in the Register Holding
// 4. Assets being exchanged are both known
// 5. Check if the address used for the deposit has 20 bytes
// 6. Double check XCM's correctness on finalize()

const WETH_SC_MOONBEAM = "0xab3f0245b83feb11d15aaffefd7ad465a59817ed";

// Setting the context on the Westend relay chain
const moonbeamAssetHubContext = `{"parents":"0","interior":{"X2":[{"GlobalConsensus":"Polkadot"},{"Parachain":"2004"}]}}`;

const xcmBuilder = XCMBuilder.usingContext(moonbeamAssetHubContext)
  .defineAsset("GLMR", `{"parents":"0","interior":{"Here":""}}`)
  .defineAsset(
    "WETH_MOONBEAM",
    `{"parents":"0","interior":{"X2":[{"PalletInstance":"104"},{"AccountId20":"${WETH_SC_MOONBEAM}"}]}}` // N!: pallet_assets has ID: 104 on Moonbeam's Runtime
  )
  .create();

const xcm = xcmBuilder
  .withdrawAsset("WETH_MOONBEAM", wethAmount)
  .withdrawAsset("GLMR", glmrAmount)
  .payFeesWith("GLMR")
  .setNextHop('{"parents":"1","interior":{"X1":[{{"Parachain":"2000"}]}}')
  .initiateTransfer("teleport", "All", false)
  .exchangeAsset("GLMR", "WETH", true | false) // TODO: maximal: bool
  .setNextHop(
    '{"parents":"2","interior":{"X1":[{{"GlobalConsensus":"Ethereum"}]}}'
  )
  .initiateTransfer("reserve", "All", true)
  .depositAll(BOB_20_BYTES_ADDRESS_ON_ETHEREUM)
  .finalize();

console.log(JSON.stringify(xcm));

// Should print this Vanilla XCM:
[
  {
    withdrawAsset: {
      id: {
        parents: 0,
        interior: {
          X1: [
            {
              PalletInstance: "104",
            },
            {
              AccountId20: WETH_MOONBEAM,
            },
          ],
        },
      },
      fun: {
        fungible: wethAmount,
      },
    },
  },
  {
    withdrawAsset: [
      {
        id: {
          parents: 0,
          interior: Junctions.Here(),
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
        interior: Junctions.Here(), // N!: Pay fees with GLMR
      },
    },
  },
  {
    initiateTransfer: {
      dest: {
        parents: 0,
        interior: { X1: [{ Parachain: "2000" }] },
      },
      remote_fee: {}, // TODO: Burn local assets here (Q?: how exactly?) and then append ReceiveTeleportedAsset to the nested XCM
      assets: [
        {
          wild: "All", // N!: Deposit all assets in the Holding Register
        },
      ],
      preserve_origin: false, // Q?: If I set it to true, in the next initiateTransfer.dest instruction, do I have to { parents: 2, interior: { X1: [{ GlobalConsensus: "Ethereum" }] } }
      xcm: [
        // { receiveTeleportedAsset: {} } // Appended because of remote_fee: Teleport(GLMR)
        { exchangeAsset: {} }, // GLMR, WETH
        {
          initiateTransfer: {
            dest: {
              parents: 0,
              interior: { X1: [{ GlobalConsensus: "Ethereum" }] },
            },
            remote_fee: {}, // TODO: Burn local assets here (Q?: how exactly?) and then append WithdrawAsset to the nested XCM
            assets: [
              {
                wild: "All", // N!: Deposit all assets in the Holding Register
              },
            ],
            preserve_origin: true, // Q?: I suppose we want to keep the origin as being Ethereum (?)
            xcm: [
              // { withdrawAsset: {} }, // Appended because of remote_fee: ReserveWithdraw(WETH)
              {
                transact: {}, // TODO: transact on Ethereum as Moonbeam/Alice. Q?: What should I do here exactly? Triggering a tx on Ethereum to mint WETH tokens?
                depositAsset: {
                  // N!: Deposit all transferred assets to Bob on Ethereum
                  assets: [
                    {
                      Wild: "All",
                    },
                  ],
                  beneficiary: {
                    parents: 0,
                    interior: {
                      X1: [
                        {
                          AccountId32: {
                            network: "Ethereum",
                            id: BOB_20_BYTES_ADDRESS_ON_ETHEREUM,
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
      ],
    },
  },
];
