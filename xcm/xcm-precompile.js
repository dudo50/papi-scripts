import {
    passetHub,
    XcmV3MultiassetFungibility,
    XcmV5AssetFilter,
    XcmV5Instruction,
    XcmV5Junction,
    XcmV5Junctions,
    XcmV5WildAsset,
    XcmVersionedXcm,
    XcmV3WeightLimit,
} from "@polkadot-api/descriptors" 
import { Binary, FixedSizeBinary, getTypedCodecs, Enum } from "polkadot-api"
import { createPublicClient, createWalletClient, http, parseAbi, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { PAS_UNITS, PAS_CENTS, SOME_POLKADOT_ACCOUNT } from "../constants.js"




export async function getSimpleTransfer() {
    const xcm = XcmVersionedXcm.V5([
        XcmV5Instruction.WithdrawAsset([
            {
                id: { parents: 1, interior: XcmV5Junctions.Here() },
                fun: XcmV3MultiassetFungibility.Fungible(10n * PAS_UNITS),
            },
        ]),
        XcmV5Instruction.PayFees({
            asset: {
                id: { parents: 1, interior: XcmV5Junctions.Here() },
                fun: XcmV3MultiassetFungibility.Fungible(10n * PAS_CENTS),
            },
        }),
        XcmV5Instruction.DepositAsset({
            assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
            beneficiary: {
                parents: 0,
                interior: XcmV5Junctions.X1(
                    XcmV5Junction.AccountId32({
                        network: undefined,
                        id: FixedSizeBinary.fromAccountId32(SOME_POLKADOT_ACCOUNT),
                    }),
                ),
            },
        }),
    ])
    const codecs = await getTypedCodecs(passetHub)
    const xcmEncoded = codecs.apis.XcmPaymentApi.query_xcm_weight.args.enc([xcm])
    const xcmHex = Binary.fromBytes(xcmEncoded).asHex()
    return xcmHex
}

const XCM_ABI = parseAbi([
    'function weighMessage(bytes message) view returns ((uint64,uint64) weight)',
    'function execute(bytes message, (uint64,uint64) weight)',
    'function send(bytes destination, bytes message)'
])


const client = createPublicClient({
    chain: {
        id: 420420422,
        name: 'Paseo',
        network: 'paseo',
        nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 10 },
    },
    transport: http('https://testnet-passet-hub-eth-rpc.polkadot.io'),
}).extend(publicActions);

export async function weighXcmMessage(xcmHex) {
    try {
        // Call weighMessage to get the weight
        const weight = await client.readContract({
            address: '0x00000000000000000000000000000000000a0000', // XCM Precompile address
            abi: XCM_ABI,
            functionName: 'weighMessage',
            args: [xcmHex],
        })
        
        console.log('Weight calculated:', {
            refTime: weight[0].toString(),
            proofSize: weight[1].toString()
        })
        
        return weight
    } catch (error) {
        console.error('Error weighing XCM message:', error)
        throw error
    }
}

export async function executeXcmMessage(xcmHex, weight, privateKey) {
    try {
        const account = privateKeyToAccount(privateKey)
        console.log("Account Address:",account.address);        
        // Create wallet client
        const walletClient = createWalletClient({
            account,
            chain: {
                id: 420420422,
                name: 'Paseo',
                network: 'paseo',
                nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 10 },
                rpcUrls: {
                    default: { http: ['https://testnet-passet-hub-eth-rpc.polkadot.io'] },
                    public: { http: ['https://testnet-passet-hub-eth-rpc.polkadot.io'] },
                },
            },
            transport: http(),
        })
        
        // Execute the XCM message with the calculated weight
        const hash = await walletClient.writeContract({
            address: '0x00000000000000000000000000000000000a0000',
            abi: XCM_ABI,
            functionName: 'execute',
            args: [xcmHex, weight],
        })
        
        console.log('XCM execution transaction hash:', hash)
        return hash
    } catch (error) {
        console.error('Error executing XCM message:', error)
        throw error
    }
}


export async function getTransferToPara(paraId) {
    const xcm = XcmVersionedXcm.V5([
      XcmV5Instruction.WithdrawAsset([
        {
          id: { parents: 1, interior: XcmV5Junctions.Here() },
          fun: XcmV3MultiassetFungibility.Fungible(10n * PAS_UNITS),
        },
      ]),
      XcmV5Instruction.PayFees({
        asset: {
          id: { parents: 1, interior: XcmV5Junctions.Here() },
          fun: XcmV3MultiassetFungibility.Fungible(1n * PAS_UNITS),
        },
      }),
      XcmV5Instruction.InitiateTransfer({
        destination: {
          parents: 1,
          interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(ASSET_HUB_PARA_ID)),
        },
        remote_fees: Enum(
          "Teleport",
          XcmV5AssetFilter.Definite([
            {
              id: { parents: 1, interior: XcmV5Junctions.Here() },
              fun: XcmV3MultiassetFungibility.Fungible(1n * PAS_UNITS),
            },
          ])
        ),
        preserve_origin: false,
        remote_xcm: [
          XcmV5Instruction.DepositReserveAsset({
            assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
            dest: { parents: 1, interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)) },
            xcm: [
              XcmV5Instruction.BuyExecution({
                fees: {
                  id: { parents: 1, interior: XcmV5Junctions.Here() },
                  fun: XcmV3MultiassetFungibility.Fungible(10n * PAS_CENTS),
                },
                weight_limit: XcmV3WeightLimit.Unlimited(),
              }),
              XcmV5Instruction.DepositAsset({
                assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
                beneficiary: {
                  parents: 0,
                  interior: XcmV5Junctions.X1(
                    XcmV5Junction.AccountId32({
                      network: undefined,
                      id: FixedSizeBinary.fromAccountId32(SOME_POLKADOT_ACCOUNT),
                    })
                  ),
                },
              }),
            ],
          }),
        ],
        assets: [
          Enum("Teleport", XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1))), // We send everything.
        ],
      }),
    ]);
    const codecs = await getTypedCodecs(passetHub);
    const xcmEncoded = codecs.apis.XcmPaymentApi.query_xcm_weight.args.enc([xcm]);
    const xcmHex = Binary.fromBytes(xcmEncoded).asHex();
    return xcmHex;
  }



const ASSET_HUB_PARA_ID = 1000;

async function main() {
    try {
        // Generate the XCM transaction hex
        const message = await getSimpleTransfer()
        // console.log("Transfer Hex:", transferHex)
        // const message = await getTransferToPara(2034);
        
        // Calculate the weight for the XCM message
        const weight = await weighXcmMessage(message)
        
        // Execute the XCM message (you'll need to provide a private key)
        const privateKey = '0x239b6552cb31075d5d71b2d1c42ade8edf9f6672cedc6ec01583981a04c7f1ba' // Replace with your private key
        const txHash = await executeXcmMessage(message, weight, privateKey)
        console.log('Transaction executed:', txHash)
        
    } catch (error) {
        console.error('Error in main:', error)
    }
}

main();