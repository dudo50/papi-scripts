import { xxhashAsU8a, blake2AsU8a } from '@polkadot/util-crypto';
import { u8aConcat, u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/keyring';

const validatorAddress = '14DE8GdKnNvgoXCLFq62ZjNz2zsGqnxXBsRMwNpiPip2JSFJ';
const accountId = decodeAddress(validatorAddress);

const moduleHash = xxhashAsU8a('Staking', 128); // 16 bytes
const storageHash = xxhashAsU8a('Validators', 128); // 16 bytes
const keyHash = blake2AsU8a(accountId, 128); // 16 bytes
const fullKey = u8aConcat(moduleHash, storageHash, keyHash, accountId);
const storageKey = u8aToHex(fullKey);
console.log(storageKey);