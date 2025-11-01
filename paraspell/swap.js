// Complete swap implementation
import { RouterBuilder } from "@paraspell/xcm-router";
import { getPolkadotSigner } from "polkadot-api/signer";
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import dotenv from "dotenv";
import { AccountId } from "polkadot-api";
import {getExchangeAssets, getExchangePairs} from "@paraspell/xcm-router";

dotenv.config();


const pairs = getExchangePairs('HydrationDex') // Exchange can be also array of exchanges such as [“HydrationDex”, “AcalaDex”] or undefined which will return all available pairs for all dexes

function isPairSupported(sourceCurrency, destinationCurrency, exchangePairs = pairs) {
  const foundPair = exchangePairs.find(pair => {
    const [currency1, currency2] = pair;
    
    // Check both directions: source->destination and destination->source
    const isDirectMatch = 
      (currency1.symbol === sourceCurrency && currency2.symbol === destinationCurrency) ||
      (currency1.symbol === destinationCurrency && currency2.symbol === sourceCurrency);
    
    return isDirectMatch;
  });
  
  if (!foundPair) return null;
  
  const [currency1, currency2] = foundPair;
  
  // Return in correct order: source first, destination second
  if (currency1.symbol === sourceCurrency) {
      return [currency1, currency2]; // Already in correct order
  } else {
      return [currency2, currency1]; // Swap order
  }
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

export class TokenSwapper {
  async swapTokens() {
    const from = "Polkadot";
    const to = "AssetHubPolkadot";
    const pair = isPairSupported("DOT", "USDT", pairs);
    const currencyFrom = pair[0];
    const currencyTo = pair[1];
    console.log("Currency from: ", currencyFrom.multiLocation);
    console.log("Currency to: ", currencyTo.multiLocation);
    const amount = "100000000000";
    const signer = signerOf();
    const ss58Format = "0";
    const address = AccountId(ss58Format).dec(signer.publicKey);
    console.log("Address: ", address);

    const fees = await RouterBuilder()
    .exchange("HydrationDex")
    .currencyFrom({symbol: "DOT"})
    .currencyTo({id: currencyTo.assetId})
    .amount(amount)
    .senderAddress(address)
    .recipientAddress(address)
    .slippagePct("1")
    .getXcmFees();

    console.log("Fees: ", fees);

    // return RouterBuilder()
    //   .exchange("HydrationDex")
    //   .currencyFrom(currencyFrom.multiLocation)
    //   .currencyTo(currencyTo.multiLocation)
    //   .amount(amount)
    //   .slippagePct("1")
    //   .senderAddress(address)
    //   .recipientAddress(address)
    //   .signer(signer)
    //   .onStatusChange(() => {})
    //   .build();
  }
}

async function main() {
  const swapper = new TokenSwapper();
  const swap = await swapper.swapTokens();
  console.log(swap);
}

main();
