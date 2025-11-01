import { getOtherAssets } from "@paraspell/assets";
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/node"
import { polkadot_asset_hub } from "@polkadot-api/descriptors";

const ASSET_HUB = "wss://polkadot-asset-hub-rpc.polkadot.io";
const client = createClient(getWsProvider(ASSET_HUB));
const address = "1ssdhRq9sxzNSAQebDPq7AMsjRxjQ3t9CQhmjYcsD1YqCxx";
// const api = client.getTypedApi(polkadot_asset_hub);


console.log("API:", client.getUnsafeApi());

async function getAssetBalance(chain, assetSymbol) {
    const assets = getOtherAssets(chain);

    const filteredAssets = assets.filter(asset => 
        asset.symbol && asset.symbol === assetSymbol
    );

    console.log(`Assets with symbol "${assetSymbol}":`, filteredAssets);
    
    const assetAccount = await client.getUnsafeApi().query.Assets.Account.getValue(filteredAssets[0].assetId, address);
    console.log(`Balance of ${assetSymbol}:`, assetAccount.balance);

    return assetAccount.balance;

}



getAssetBalance("AssetHubPolkadot", "USDt");
