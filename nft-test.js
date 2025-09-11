import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import dotenv from "dotenv";



dotenv.config();

const privateKey = process.env.PRIVATE_KEY;
// 1. Define the dest and message arguments
const dest = { V4: { parents: 0, interior: { X1: [{ Parachain: 1000 }] } } };
const instr1 = {
    WithdrawAsset: [
        {
            id: {
                parents: 0,
                interior: "Here",
            },
            fun: { Fungible: 1000000000000n },
        },
    ],
};
const instr2 = {
    BuyExecution: [
        {
            id: {
                parents: 0,
                interior: "Here",
            },
            fun: { Fungible: 1000000000000n },
        },
        { Unlimited: null },
    ],
};
const instr3 = {
    Transact: {
        originKind: 'SovereignAccount',
        requireWeightAtMost: { refTime: 40000000000n, proofSize: 900000n },
        call: {
            encoded:
                '0x34000026ccb71122dfe2e1c3fc8058f5b39c0481aa470bb30f20fc62f35f47fab33a09000000000000000000000000000000000000000000',
        },
    },
};
const message = { V4: [instr1, instr2, instr3] };

//0x34000026ccb71122dfe2e1c3fc8058f5b39c0481aa470bb30f20fc62f35f47fab33a09000000000000000000000000000000000000000000
// is nfts.create encoded ( create collection)



const performRemoteDelegation = async () => {
    // 2. Construct API provider
    const wsProvider = new WsProvider(
        'wss://westend-rpc.polkadot.io'
    );
    const api = await ApiPromise.create({ provider: wsProvider });

    // 3. Initialize wallet key pairs
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    // For demo purposes only. Never store your private key or mnemonic in a JavaScript file
    const otherPair = keyring.addFromUri(privateKey);
    console.log(`Derived Address from Private Key: ${otherPair.address}`);

    //   // 4. Define the transaction using the send method of the xcm pallet
    const tx = api.tx.xcmPallet.send(dest, message);

    const dryRunCall = await api.call.dryRunApi.dryRunCall(
        { System: { signed: otherPair.address } },
        tx, 4
    );

    console.log("Dry Run Result:", JSON.stringify(dryRunCall, null, 2));

    // 5. Sign and send the transaction
    const txHash = await tx.signAndSend(otherPair);
    console.log(`Submitted with hash ${txHash}`);

    api.disconnect();
};

performRemoteDelegation();


