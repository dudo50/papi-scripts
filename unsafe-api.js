import { chainSpec } from "polkadot-api/chains/paseo_people"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { paseo_people } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { getMetadata } from "@polkadot-api/descriptors"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import dotenv from "dotenv";
import { AccountId } from "polkadot-api";
import { getExchangeAssets, getExchangePairs } from "@paraspell/xcm-router";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { getPolkadotSigner } from "polkadot-api/signer";

dotenv.config();



async function main() {
    const client = createClient(
        withLogsRecorder(console.log, getWsProvider("wss://pas-rpc.stakeworld.io")),
        { getMetadata },
    )

    // get the safely typed API
    const api = client.getUnsafeApi()
    console.log("API:", api);

    const address = "14aFkYiwZFMT8pri6eRnnj8Ev9Bsj3W6rqwQHtfJxgyDw5Zq"
    // const identity = await api.query.Identity.IdentityOf.getValue(address);
    // console.log(identity);

    const test2 = await api.query.Balances.Account.getValue("1ssdhRq9sxzNSAQebDPq7AMsjRxjQ3t9CQhmjYcsD1YqCxx");
    console.log(test2)

    const res = await api.tx.Balances.transfer_keep_alive({
        dest: {
            type: 'Id',
            value: address,
        }, value: BigInt(10000000)
    })
    console.log("Res:", res);

    const signer = signerOf()
    const txHash = await res.signAndSubmit(signer)
    console.log("TxHash:", txHash);

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
