import { chainSpec } from "polkadot-api/chains/paseo"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { paseo_people, wnd } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { getMetadata } from "@polkadot-api/descriptors"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import dotenv from "dotenv";
import { AccountId } from "polkadot-api";
import { getExchangeAssets, getExchangePairs } from "@paraspell/xcm-router";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { getPolkadotSigner } from "polkadot-api/signer";

// import { chainSpec } from "polkadot-api/chains/westend2"


dotenv.config();



async function main() {



    const smoldot = start()

    const client = createClient(getSmProvider(smoldot.addChain({ chainSpec })))
    // get the safely typed API
    const api = client.getUnsafeApi()
    console.log("API:", api);

    const address = "14aFkYiwZFMT8pri6eRnnj8Ev9Bsj3W6rqwQHtfJxgyDw5Zq"


    const res = await api.tx.Balances.transfer_keep_alive({
        dest: {
            type: 'Id',
            value: address,
        }, value: BigInt(10000000)
    })
    console.log("Res:", res);


    const origin = {
        type: 'system',
        value: {
              type: 'Signed',
              value: address
        }
      }
    const dryRun = await api.apis.DryRunApi.dry_run_call(
        origin,
        res.decodedCall,
        3
    )
    console.log("Dry Run:", dryRun);

}




export function signerOf() {

    const seed = process.env.PRIVATE_KEY;
    const derive = sr25519CreateDerive(seed);
    const aliceKeyPair = derive("");
    return getPolkadotSigner(
        aliceKeyPair.publicKey,
        "Sr25519",
        aliceKeyPair.sign
    );
}

main();
