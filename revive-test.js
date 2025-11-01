// import { chainSpec } from "polkadot-api/chains/paseo"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { paseo, wnd, westend_asset_hub } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { getMetadata } from "@polkadot-api/descriptors"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import dotenv from "dotenv";
import { AccountId } from "polkadot-api";
import { getExchangeAssets, getExchangePairs } from "@paraspell/xcm-router";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { getPolkadotSigner } from "polkadot-api/signer";

import { chainSpec as chainSpecAssetHubWestend } from "polkadot-api/chains/westend2_asset_hub"
import {chainSpec as chainSpecPaseo } from "polkadot-api/chains/paseo"
import { Binary } from 'polkadot-api';

dotenv.config();

import { startFromWorker } from 'polkadot-api/smoldot/from-node-worker'

const smoldot = startFromWorker(
    new Worker(require.resolve("polkadot-api/smoldot/node-worker"), {
      stderr: true,
      stdout: true,
    }),
  )

async function main() {
    try {
        console.log('🚀 Starting revive transaction...');

        // const smoldot = startFromWorker()

        // const client = createClient(getSmProvider(smoldot.addChain({ chainSpecAssetHubWestend })))
        // // get the safely typed API
        // const api = client.getTypedApi(westend_asset_hub);


        const client = createClient(getSmProvider(smoldot.addChain({ chainSpecPaseo })))
        // get the safely typed API
        const api = client.getTypedApi(paseo);

    
        const test2 = await api.query.Balances.Account.getValue("1ssdhRq9sxzNSAQebDPq7AMsjRxjQ3t9CQhmjYcsD1YqCxx");
        console.log(test2)


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


