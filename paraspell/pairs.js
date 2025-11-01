import {getExchangeAssets, getExchangePairs} from "@paraspell/xcm-router";


//Returns all assets that DEX supports
// const assets = getExchangeAssets('HydrationDex')

//Returns asset pairs supported by selected exchanges
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
    
    // Return the pair if found, otherwise return null
    return foundPair || null;
}



console.log(isPairSupported('USDT', 'DOT', pairs))







