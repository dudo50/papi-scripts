// import { chainSpec } from "polkadot-api/chains/paseo"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { paseo_people, wnd, westend_asset_hub } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { getMetadata } from "@polkadot-api/descriptors"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import dotenv from "dotenv";
import { AccountId } from "polkadot-api";
import { getExchangeAssets, getExchangePairs } from "@paraspell/xcm-router";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { getPolkadotSigner } from "polkadot-api/signer";
import { passetHub } from "@polkadot-api/descriptors";

// import { chainSpec as chainSpecPassetHub } from "polkadot-api/chains/"
import { chainSpec as chainSpecAssetHubWestend } from "polkadot-api/chains/westend2_asset_hub"

import { Binary } from 'polkadot-api';
import { westend2 } from "polkadot-api/chains"

dotenv.config();


// const WESTEND_ASSET_HUB='wss://westend-asset-hub-rpc.polkadot.io';
const PASSET_HUB='wss://testnet-passet-hub.polkadot.io';


const client = createClient(getWsProvider(PASSET_HUB));

// export const client = createClient(
//     withLogsRecorder(
//       (v) => {
//         log.write(v + "\n");
//         log.flush();
//       },
//       getWsProvider([
//         "wss://testnet-passet-hub.polkadot.io",
//         "wss://passet-hub-paseo.ibp.network",
//         //WESTEND_ASSET_HUB
//       ])
//     )
//   );

// const smoldot = start()

// const client = createClient(getSmProvider(smoldot.addChain({ chainSpecAssetHubWestend })))


const api = client.getTypedApi(westend_asset_hub);

async function main() {
    try {
        console.log('🚀 Starting revive transaction...');


        //get the safely typed API


        const call = api.tx.Revive.call({
            dest: Binary.fromHex("0x5F177A0c0151c56DF7Fc0ca2730F379232653cbd"), // EVM address
            value: 1000000000n, // Amount in native chain units (planck) - already bigint
            gas_limit: {
                // computation cost
                ref_time: BigInt(1e12),
                // storage cost  
                proof_size: BigInt(1e6),
            },
            storage_deposit_limit: BigInt(1000000000), // Storage deposit limit
            data: Binary.fromHex("0x")// Empty data
        })

        const txHash = await call.signAndSubmit(signerOf())
        console.log(`\n🎉 Transaction sent from source chain with hash: ${txHash.txHash}`);
        console.log(`\n🎉 Transaction sent from source chain with hash: ${txHash.block.hash}`);


    } catch (error) {
        console.error('❌ Error in main function:', error);
        throw error;
    }
}




export function signerOf() {
    try {
        const seed = process.env.PRIVATE_KEY;
        
        if (!seed) {
            throw new Error('PRIVATE_KEY environment variable is not set');
        }
        
        const derive = sr25519CreateDerive(seed);
        const aliceKeyPair = derive("");
        return getPolkadotSigner(
            aliceKeyPair.publicKey,
            "Sr25519",
            aliceKeyPair.sign
        );
    } catch (error) {
        console.error('❌ Error creating signer:', error);
        throw error;
    }
}

main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});


