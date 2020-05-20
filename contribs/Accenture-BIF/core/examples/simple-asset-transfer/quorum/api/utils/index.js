const web3Utils = require('web3-utils');
const secp256k1 = require('secp256k1');

async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Make an index mapping {keyFunctor(element): ValueFunctor(element)} for a given array.
function makeIndex(array, keyFunctor, valueFunctor) {
  const realKeyFunctor = keyFunctor || (e => e);
  const realValueFunctor = valueFunctor || (e => e);
  const map = {};
  array.forEach(element => {
    map[realKeyFunctor(element)] = realValueFunctor(element);
  });
  return map;
}

// Converts ECC public key to ethereum address.
// Example: toAddress('020ba0da7505a2df7e56295e204c3b3fe634e54982dfd0254ba1ebd9d31c89a566')
// returns '85060c875ab62d290f9affea62dcb38327930beb'
function pubKeyToEthAddress(pubKey) {
  // Convert input string to the uncompressed (65 byte) format public key.
  const raw = secp256k1.publicKeyConvert(Buffer.from(pubKey, 'hex'), false);

  // Remove the first byte (version) and hash the resulting key (64 bytes).
  const hash = web3Utils.sha3(raw.slice(1)).toString('hex');

  // Use last 20 bytes.
  return hash.substr(hash.length - 40);
}

module.exports = {
  sleep,
  makeIndex,
  pubKeyToEthAddress,
};
