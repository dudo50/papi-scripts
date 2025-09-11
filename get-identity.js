import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

interface ValidatorInfo {
  address: string;
  displayName: string | null;
  chain: string;
  sourceChain: string;
  stashAddress: string;
}

class ValidatorNameFetcher {
  private chains = {
    polkadot: 'wss://rpc.polkadot.io',
    kusama: 'wss://kusama-rpc.polkadot.io',
    paseo: 'wss://paseo.rpc.amforc.com',
    people: 'wss://sys.ibp.network/people-kusama'
  };

  async getValidatorNames(targetChain: 'kusama' | 'polkadot' | 'paseo'): Promise<ValidatorInfo[]> {
    await cryptoWaitReady();
    
    const targetProvider = new WsProvider(this.chains[targetChain]);
    const peopleProvider = new WsProvider(this.chains.people);
    
    const targetApi = await ApiPromise.create({ provider: targetProvider });
    const peopleApi = await ApiPromise.create({ provider: peopleProvider });
    
    try {
      const validators = await targetApi.query.session.validators();
      const validatorAddresses = validators.map(v => v.toString());
      
      console.log(`🔍 Found ${validatorAddresses.length} validators on ${targetChain}`);
      
      const results: ValidatorInfo[] = [];
      const batchSize = 10; // Increased batch size for better performance
      const totalBatches = Math.ceil(validatorAddresses.length / batchSize);
      
      for (let i = 0; i < validatorAddresses.length; i += batchSize) {
        const batch = validatorAddresses.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, validatorAddresses.length)})`);
        
        const batchResults = await Promise.all(
          batch.map(address => this.processValidator(targetApi, peopleApi, address, targetChain))
        );
        
        results.push(...batchResults);
        
        // Add a delay between batches to avoid overloading the RPC
        if (i + batchSize < validatorAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
      
    } finally {
      await targetApi.disconnect();
      await peopleApi.disconnect();
    }
  }

  private async processValidator(targetApi: ApiPromise, peopleApi: ApiPromise, address: string, targetChain: string): Promise<ValidatorInfo> {
    try {
      const stashAddress = await this.getStashAddress(targetApi, address);
      const displayName = await this.getIdentityFromPeopleChain(peopleApi, stashAddress);
      
      return {
        address,
        displayName,
        chain: targetChain,
        sourceChain: 'people',
        stashAddress
      };
      
    } catch (error) {
      console.log(`❌ Error processing ${address}:`, error);
      return {
        address,
        displayName: null,
        chain: targetChain,
        sourceChain: targetChain,
        stashAddress: address
      };
    }
  }

  private async getStashAddress(api: ApiPromise, controllerAddress: string): Promise<string> {
    try {
      const bonded = await api.query.staking.bonded(controllerAddress);
      return bonded && bonded.isSome ? bonded.unwrap().toString() : controllerAddress;
    } catch (error) {
      return controllerAddress;
    }
  }

  private async getIdentityFromPeopleChain(peopleApi: ApiPromise, address: string): Promise<string | null> {
    try {
      if (!peopleApi.query.identity) {
        console.log('❌ Identity pallet not available on People chain');
        return null;
      }

      // Try primary identity
      const identity = await peopleApi.query.identity.identityOf(address);
      if (identity?.isSome) {
        const identityData = identity.unwrap();
        if (identityData.info.display?.isRaw) {
          return identityData.info.display.asRaw.toUtf8();
        } else if (identityData.info.display?.isNone) {
          // Check for other identity fields if display is None
          return this.extractIdentityFromOtherFields(identityData);
        }
      }

      // Try super identity
      const superOf = await peopleApi.query.identity.superOf(address);
      if (superOf?.isSome) {
        const [superAddress, data] = superOf.unwrap();
        const superIdentity = await peopleApi.query.identity.identityOf(superAddress);
        
        if (superIdentity?.isSome) {
          const superIdentityData = superIdentity.unwrap();
          let superName = '';
          let subName = '';
          
          if (superIdentityData.info.display?.isRaw) {
            superName = superIdentityData.info.display.asRaw.toUtf8();
          } else {
            superName = this.extractIdentityFromOtherFields(superIdentityData);
          }
          
          if (data?.isRaw) {
            subName = data.asRaw.toUtf8();
          }
          
          if (superName) {
            return subName ? `${superName} / ${subName}` : superName;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`❌ Error fetching identity for ${address}:`, error);
      return null;
    }
  }

  private extractIdentityFromOtherFields(identityData: any): string | null {
    // Try to extract identity from other fields if display is not available
    if (identityData.info.email?.isRaw) {
      return identityData.info.email.asRaw.toUtf8();
    } else if (identityData.info.twitter?.isRaw) {
      return identityData.info.twitter.asRaw.toUtf8();
    } else if (identityData.info.riot?.isRaw) {
      return identityData.info.riot.asRaw.toUtf8();
    } else if (identityData.info.web?.isRaw) {
      return identityData.info.web.asRaw.toUtf8();
    }
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting validator name fetcher via People chain...\n');
  
  const fetcher = new ValidatorNameFetcher();
  const results: {[key: string]: ValidatorInfo[]} = {};
  
  try {
    // Check Kusama
    console.log('=== KUSAMA VALIDATORS VIA PEOPLE CHAIN ===');
    results.kusama = await fetcher.getValidatorNames('kusama');
    
    const kusamaNamedValidators = results.kusama.filter(v => v.displayName);
    const kusamaUnnamedValidators = results.kusama.filter(v => !v.displayName);
    
    console.log(`\n📊 KUSAMA RESULTS:`);
    console.log(`Total processed: ${results.kusama.length}`);
    console.log(`With names: ${kusamaNamedValidators.length}`);
    console.log(`Without names: ${kusamaUnnamedValidators.length}`);
    
    if (kusamaNamedValidators.length > 0) {
      console.log('\n🏷️  KUSAMA VALIDATORS WITH NAMES:');
      kusamaNamedValidators.forEach((v, i) => {
        console.log(`${i + 1}. ${v.displayName}`);
        console.log(`   Controller: ${v.address.slice(0, 8)}...`);
        console.log(`   Stash: ${v.stashAddress.slice(0, 8)}...\n`);
      });
    }

    // Check Polkadot
    console.log('\n=== POLKADOT VALIDATORS VIA PEOPLE CHAIN ===');
    results.polkadot = await fetcher.getValidatorNames('polkadot');
    
    const polkadotNamedValidators = results.polkadot.filter(v => v.displayName);
    const polkadotUnnamedValidators = results.polkadot.filter(v => !v.displayName);
    
    console.log(`\n📊 POLKADOT RESULTS:`);
    console.log(`Total processed: ${results.polkadot.length}`);
    console.log(`With names: ${polkadotNamedValidators.length}`);
    console.log(`Without names: ${polkadotUnnamedValidators.length}`);
    
    if (polkadotNamedValidators.length > 0) {
      console.log('\n🏷️  POLKADOT VALIDATORS WITH NAMES:');
      polkadotNamedValidators.forEach((v, i) => {
        console.log(`${i + 1}. ${v.displayName}`);
        console.log(`   Controller: ${v.address.slice(0, 8)}...`);
        console.log(`   Stash: ${v.stashAddress.slice(0, 8)}...\n`);
      });
    }

    // Check Paseo
    console.log('\n=== PASEO VALIDATORS VIA PEOPLE CHAIN ===');
    results.paseo = await fetcher.getValidatorNames('paseo');
    
    const paseoNamedValidators = results.paseo.filter(v => v.displayName);
    const paseoUnnamedValidators = results.paseo.filter(v => !v.displayName);
    
    console.log(`\n📊 PASEO RESULTS:`);
    console.log(`Total processed: ${results.paseo.length}`);
    console.log(`With names: ${paseoNamedValidators.length}`);
    console.log(`Without names: ${paseoUnnamedValidators.length}`);
    
    if (paseoNamedValidators.length > 0) {
      console.log('\n🏷️  PASEO VALIDATORS WITH NAMES:');
      paseoNamedValidators.forEach((v, i) => {
        console.log(`${i + 1}. ${v.displayName}`);
        console.log(`   Controller: ${v.address.slice(0, 8)}...`);
        console.log(`   Stash: ${v.stashAddress.slice(0, 8)}...\n`);
      });
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Kusama: ${kusamaNamedValidators.length}/${results.kusama.length} validators with names`);
    console.log(`Polkadot: ${polkadotNamedValidators.length}/${results.polkadot.length} validators with names`);
    console.log(`Paseo: ${paseoNamedValidators.length}/${results.paseo.length} validators with names`);
    
    // Save results to files
    const fs = require('fs');
    fs.writeFileSync('kusama_validators.json', JSON.stringify(results.kusama, null, 2));
    fs.writeFileSync('polkadot_validators.json', JSON.stringify(results.polkadot, null, 2));
    fs.writeFileSync('paseo_validators.json', JSON.stringify(results.paseo, null, 2));
    console.log('\n💾 Results saved to JSON files');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});