
import { getPolkadotSigner } from "polkadot-api/signer";
import {
    entropyToMiniSecret,
    mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import dotenv from "dotenv";

import { createClient } from "polkadot-api"
import { paseo, paseo_asset_hub, polkadot, polkadot_asset_hub} from "@polkadot-api/descriptors"
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
  } from '@polkadot-api/descriptors';

import { MultiAddress } from '@polkadot-api/descriptors'

dotenv.config();




// 1. Source Parachain Configuration

const SOURCE_CHAIN_WS = "wss://paseo-rpc.n.dwellir.com";
const DESTINATION_CHAIN_WS = "wss://asset-hub-paseo-rpc.n.dwellir.com";

// const SOURCE_CHAIN_WS = "wss://polkadot-rpc.n.dwellir.com"
// const DESTINATION_CHAIN_WS = "wss://asset-hub-polkadot-rpc.n.dwellir.com"

// 2. Destination Parachain (Asset Hub)
//    The ParaID for Asset Hub on Polkadot is 1000, on Kusama is 1000, on Westend is 1000.
const ASSET_HUB_PARA_ID = 1000;

// 3. User Account
const seed = process.env.PRIVATE_KEY;


const derive = sr25519CreateDerive(seed);
const aliceKeyPair = derive("");
// 4. XCM Configuration
//    Weight needed for the remote execution on Asset Hub.
//    'Unlimited' is used for simplicity, but for production, you should calculate
//    and specify a reasonable weight limit.
const XCM_WEIGHT_LIMIT = { Unlimited: null };


const alice = getPolkadotSigner(
    aliceKeyPair.publicKey,
    "Sr25519",
    aliceKeyPair.sign,
  )
  
  const userPublicKey = ss58Decode("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")[0];
  const idBeneficiary = Binary.fromBytes(userPublicKey);


/**
 * Derives the Sovereign Account of a parachain on a sibling parachain.
 * This is the account that will act as the `admin` for the NFT collection.
 *
 * @param paraId The parachain ID of the origin chain.
 * @returns The SS58 address of the sovereign account.
 */
function getSovereignAccount(paraId) {
    // The formula is 'sibl' + little-endian encoded paraId, padded to 32 bytes.
    const prefix = new TextEncoder().encode("sibl");
    const paraIdBytes = new Uint8Array(4);
    new DataView(paraIdBytes.buffer).setUint32(0, paraId, true); // true for little-endian

    const combined = new Uint8Array(prefix.length + paraIdBytes.length);
    combined.set(prefix);
    combined.set(paraIdBytes, prefix.length);

    // Hash the combined value to get the 32-byte account ID
    return blake2AsU8a(combined);
}


async function main() {
    // --- 1. Connect to the Source Parachain ---
    console.log(`🔌 Connecting to source relay at ${SOURCE_CHAIN_WS}...`);
    const sourceClient = createClient(
        withPolkadotSdkCompat(getWsProvider(SOURCE_CHAIN_WS)),
      );

    const sourceApi = sourceClient.getTypedApi(paseo);


    const destinationClient = createClient(getWsProvider(DESTINATION_CHAIN_WS));
    const destinationApi = destinationClient.getTypedApi(paseo_asset_hub);


    const admin = {
        Id: aliceKeyPair.publicKey,
    };

    const txCollection = destinationApi.tx.Nfts.create({
        admin: MultiAddress.Id("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
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

    try {
        const txHash = await txCollection.signAndSubmit(alice);
        console.log(`\n🎉 Transaction sent from source chain with hash: ${txHash}`);
        console.log("👀 Waiting for transaction to be included in a block...");

        // // Optional: Wait for finalization and check events
        // const { events } = await sourceApi.getTx(txHash);

        // console.log("\n✅ Transaction finalized. Events on source chain:");
        // events.forEach(e => {
        //     console.log(`\t- ${e.pallet.name}::${e.pallet.event.name}`);
        //     if (e.pallet.name === 'polkadotXcm' && e.pallet.event.name === 'Attempted') {
        //         console.log(`\t  Outcome:`, e.pallet.event.value.outcome);
        //     }
        // });

        // console.log("\n\n➡️ Next Step: Check Asset Hub (e.g., on PolkadotJS-Apps or Subscan) to see if the new NFT collection was created.");
        // console.log("You can check the storage for `nfts.collection` and look for the next available collection ID.");

    } catch (error) {
        console.error("❌ An error occurred:", error);
    } finally {
        // --- 7. Disconnect from the client ---
        sourceClient.destroy();
        console.log("\n🔌 Disconnected from source parachain.");
    }



}

main().catch(console.error);

