import { createClient } from "polkadot-api"
import { start } from "polkadot-api/smoldot"
import { chainSpec as polkadotSpec } from "polkadot-api/chains/polkadot"
import { chainSpec as polkadotAssetHubSpec } from "polkadot-api/chains/polkadot_asset_hub"
import { polkadot, polkadot_asset_hub } from "@polkadot-api/descriptors"
import { Builder } from '@paraspell/sdk';
import { createApiInstanceForNode } from "@paraspell/sdk"
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
    DEV_PHRASE,
    entropyToMiniSecret,
    mnemonicToEntropy,
    mnemonicToMiniSecret
} from "@polkadot-labs/hdkd-helpers"
import * as ss58 from "@subsquid/ss58"
import { getWsProvider } from "polkadot-api/ws-provider/node";
import dotenv from "dotenv"
dotenv.config()


import { getPolkadotSigner } from "polkadot-api/signer"
const RECIPIENT_ADDRESS = '1242mFMeQNy4yoW46P95wobVwsV2WGjoszVPTNbwp1dAqqnf'; // This is agent wallet 
const AMOUNT = '100000000';
const AMOUNT_PAS = '10000000000';


const mnemonic = process.env.MNEMONIC_PHRASE
console.log("Mnemonic: ", mnemonic)

const keypair = getSubstrateKeyPair(mnemonic)
console.log("Public Key: ", keypair.publicKey)

const address = ss58.codec(42).encode(keypair.publicKey)
console.log("Address: ", address)
// const smoldot = start()

// const client = createClient(getSmProvider(smoldot.addChain({ chainSpec: polkadotAssetHubSpec })))
// const api = createApiInstanceForNode('AssetHubPolkadot')

// const POLKADOT_ASSET_HUB_URL = "wss://statemint.api.onfinality.io/public-ws"
// const client = createClient(getWsProvider(POLKADOT_ASSET_HUB_URL));
// const typedApi = client.getTypedApi(dot);



const POLKADOT_ASSET_HUB_URL = "wss://paseo-rpc.n.dwellir.com"
const client = createClient(getWsProvider(POLKADOT_ASSET_HUB_URL));
const signer = getPolkadotSigner(
    keypair.publicKey,
    "Sr25519",
    input => keypair.sign(input)
)


// Function to perform XCM transfer
async function xcmTransfer() {
    try {

        // Construct XCM transfer using ParaSpell Builder
        const tx = await Builder(POLKADOT_ASSET_HUB_URL)
            .from('Paseo') // Source: Polkadot Asset Hub (Westend)
            .senderAddress(address)
            .to('AssetHubPaseo') // Destination: Polkadot Relay Chain (Westend)
            .currency({ symbol: 'PAS', amount: AMOUNT_PAS }) // Native token (WND for Westend, use 'DOT' for Polkadot mainnet)
            .address(RECIPIENT_ADDRESS)
            .build();

        tx.signSubmitAndWatch(signer).subscribe({
            next: (event) => {
                if (event.type == 'finalized') {
                    console.log(`Transaction finalized at block hash: ${event.txHash}`);
                    process.exit(0); // Exit after finalization
                }
            },
            error: (error) => {
                console.error('Error during XCM transfer:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Error during XCM transfer:', error);
        process.exit(1);
    }
}

// Execute the transfer
xcmTransfer();

function getSubstrateKeyPair(mnemonic) {
    const seed = getNormalizedMnemonic(mnemonic).sr25519();

    return sr25519CreateDerive(seed)('');
}


function getNormalizedMnemonic(mnemonic) {
    if (mnemonic.length === 20) {
        const normalizedMnemonic = new TextEncoder().encode(mnemonic.padEnd(32));

        return {
            sr25519: () => normalizedMnemonic,
        };
    }

    return {
        sr25519: () => mnemonicToMiniSecret(mnemonic),
    };
}




