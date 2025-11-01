
import { getPolkadotSigner } from "polkadot-api/signer";
import {
    entropyToMiniSecret,
    mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import dotenv from "dotenv";

import { createClient } from "polkadot-api"
import { paseo, paseo_asset_hub, polkadot, polkadot_asset_hub, wnd, westend_asset_hub } from "@polkadot-api/descriptors"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { Binary } from 'polkadot-api';
import { ss58Decode } from '@polkadot-labs/hdkd-helpers';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import {
    XcmVersionedXcm,
    XcmVersionedLocation,
    XcmV3Junction,
    XcmV3Junctions,
    XcmV3WeightLimit,
    XcmV3MultiassetFungibility,
    XcmV3MultiassetAssetId,
    XcmV3Instruction,
    XcmV3MultiassetMultiAssetFilter,
    XcmV3MultiassetWildMultiAsset,
    XcmV2OriginKind,
    XcmV4Instruction,
    XcmV5Instruction
  } from '@polkadot-api/descriptors';

import { MultiAddress } from '@polkadot-api/descriptors'

dotenv.config();




// 1. Source Parachain Configuration

// const SOURCE_CHAIN_WS = "wss://paseo-rpc.n.dwellir.com";
// const DESTINATION_CHAIN_WS = "wss://asset-hub-paseo-rpc.n.dwellir.com";

// const SOURCE_CHAIN_WS = "wss://polkadot-rpc.n.dwellir.com"
// const DESTINATION_CHAIN_WS = "wss://asset-hub-polkadot-rpc.n.dwellir.com"


const SOURCE_CHAIN_WS = "wss://westend-rpc.polkadot.io"
const DESTINATION_CHAIN_WS = "wss://westmint-rpc-tn.dwellir.com"
// 2. Destination Parachain (Asset Hub)
//    The ParaID for Asset Hub on Polkadot is 1000, on Kusama is 1000, on Westend is 1000.
const ASSET_HUB_PARA_ID = 1000;

// 3. User Account
const seed = process.env.PRIVATE_KEY;


const derive = sr25519CreateDerive(seed);
const aliceKeyPair = derive("");

const XCM_WEIGHT_LIMIT = { Unlimited: null };


const alice = getPolkadotSigner(
    aliceKeyPair.publicKey,
    "Sr25519",
    aliceKeyPair.sign,
  )
  
  const userPublicKey = ss58Decode("5CwaVNAmJ6hWvu9tgxAPgxLD27SK36Vk4hgDcSZGK7z2eYiE")[0];
  const idBeneficiary = Binary.fromBytes(userPublicKey);



async function main() {
    // --- 1. Connect to the Source Parachain ---
    console.log(`🔌 Connecting to source relay at ${SOURCE_CHAIN_WS}...`);
    const sourceClient = createClient(
        withPolkadotSdkCompat(getWsProvider(SOURCE_CHAIN_WS)),
      );

    const sourceApi = sourceClient.getTypedApi(wnd);


    const destinationClient = createClient(getWsProvider(DESTINATION_CHAIN_WS));
    const destinationApi = destinationClient.getTypedApi(westend_asset_hub);


    const txCollection = destinationApi.tx.Nfts.create({
        admin: MultiAddress.Id("5CwaVNAmJ6hWvu9tgxAPgxLD27SK36Vk4hgDcSZGK7z2eYiE"),
        config: {
          settings: 0n,
          max_supply: undefined,
          mint_settings: {
            mint_type: { type: 'Issuer', value: undefined },
            price: undefined,
            start_block: undefined,
            end_block: undefined,
            default_item_settings: 0n,
          },
        },
    })

    const destination = XcmVersionedLocation.V3({
        parents: 0, // 0 = Sending to a child parachain from the Relay Chain
        interior: XcmV3Junctions.X1(XcmV3Junction.Parachain(ASSET_HUB_PARA_ID)),
    });

    const message = XcmVersionedXcm.V3([
        // Instruction 1: Pay for execution time on Asset Hub.
        XcmV3Instruction.WithdrawAsset([{
            id: XcmV3MultiassetAssetId.Concrete({
                parents: 0,
                interior: XcmV3Junctions.Here()
            }),
            fun: XcmV3MultiassetFungibility.Fungible(2_000_000_000_000),
        }, ]),
        // Instruction 2: Buy execution time with the withdrawn asset.
        XcmV3Instruction.BuyExecution({
            fees: {
                id: XcmV3MultiassetAssetId.Concrete({
                    parents: 0,
                    interior: XcmV3Junctions.Here()
                }),
                fun: XcmV3MultiassetFungibility.Fungible(2_000_000_000_000),
            },
            weight_limit: XcmV3WeightLimit.Unlimited(),
        }),
        // Instruction 3: The main action - execute the `nfts.create` call.
        XcmV4Instruction.Transact({
            origin_kind: XcmV2OriginKind.SovereignAccount(),
            require_weight_at_most: {
                ref_time: 40000000000,
                proof_size: 900000,
            },
            call: await txCollection.getEncodedData(),
        }),
    ]);

    // --- 5. Build and Send the `xcmPallet.send` Transaction ---
    //    On the Relay Chain, we use `xcmPallet.send` to dispatch the XCM.
    const xcmTx = sourceApi.tx.XcmPallet.send({
        dest: destination,
        message: message,
    });

    const dryRunResult = await sourceApi.apis.DryRunApi.dry_run_xcm(
        destination,
        message,
      );

      console.log("Dry Run Result:", JSON.stringify(dryRunResult, null, 2));
      const encoded = (await xcmTx.getEncodedData()).asHex();
      console.log("Encoded:", encoded);


}

main().catch(console.error);

