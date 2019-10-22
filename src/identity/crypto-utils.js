/**
 @module CryptoUtils
*/

const { randomBytes } = require(`crypto`);
const secp256k1 = require(`secp256k1`);
const fs = require(`fs`);
const sha3 = require(`sha3`);
const sdk = require('indy-sdk');

// TODO extract web3 version of signature from source code
// avoid redundant dependencies and overkill usage of the web3 module
const Web3 = require(`web3`);
const web3Utils = require(`web3-utils`);
const web3 = new Web3(); // needed only for ethereum-specific signatures

/**
 * Cast string into hexadecimal encoded buffer
 * @param {string} s
 * @return {Buffer}
 */
const str2buffer = s => Buffer.from(s, `hex`);

/**
 * Async wrapper for fs writeFile
 * @param {string} fileName
 * @param {string} content
 * @return {string}
 */
const writeToFile = (fileName, content) =>
  new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, error => {
      if (error) {
        reject(error);
      } else {
        resolve(content);
      }
    });
  });

/**
 * Generate ECDSA256k1 keypair randomly and save it into a file
 * @param {string} fileName
 * @returns {object} {sk, pk}
 */
const genKeyFile = async fileName => {
  let privKey;
  do {
    privKey = randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privKey));
  const pubKey = secp256k1.publicKeyCreate(privKey);
  const content = {
    sk: privKey.toString(`hex`),
    pk: pubKey.toString(`hex`),
  };
  await writeToFile(fileName, JSON.stringify(content));
  return content;
};

/**
 * Async wrapper for fs readFile
 * @param {string} fileName
 * @returns {string}
 */
const loadKeyFile = async fileName =>
  new Promise((resolve, reject) => {
    fs.readFile(fileName, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });

/**
 * Format message to be signed
 * @param {string} data
 * @returns {buffer}
 */
const dataHash = data => {
  const hashObj = new sha3.SHA3Hash(256);
  hashObj.update(data);
  const hashMsg = hashObj.digest(`hex`);
  return hashMsg;
};

/**
 * Generate signature from formated message
 * @param {string} msg
 * @param {string} privKey
 * @returns {string}
 */
const signMsg = async (msg, privKey, targetDLTType) => {
  let signObj;
  if (targetDLTType === `QUORUM`) {
    // Quorum smart contracts needs specific signature algorithm.
    const hash = web3Utils.sha3(Buffer.from(msg));
    signObj = await web3.eth.accounts.sign(hash, `0x${privKey}`); // REFAC can we sign all message with this?
  } else {
    const pkey = Buffer.from(privKey, `hex`);
    signObj = secp256k1.sign(Buffer.from(module.exports.dataHash(msg), `hex`), pkey);
  }
  return signObj.signature.toString(`hex`);
};

/**
 * Verify if a signature corresponds to given message and public key
 * @param {string} msg
 * @param {string} pubKey
 * @param {string} signature
 * @returns {boolean}
 */
const verifySign = (msg, pubKey, signature) =>
  secp256k1.verify(str2buffer(msg), str2buffer(signature), str2buffer(pubKey));

const createMasterSecret = async (walletHandle, did) => {
  let metadata = await sdk.getDidMetadata(walletHandle, did);
  metadata = JSON.parse(metadata);
  let masterSecretId = metadata['master_secret_id'];
  if (!masterSecretId) {
    masterSecretId = uuid();
    await sdk.proverCreateMasterSecret(walletHandle, masterSecretId);
    metadata['master_secret_id'] = masterSecretId;
    await sdk.setDidMetadata(walletHandle, did, JSON.stringify(metadata));
  }
};

const anonCrypt = async (poolHandle, walletHandle, did, message) => {
  let verkey = await sdk.keyForDid(poolHandle, walletHandle, did);
  let buffer = await sdk.cryptoAnonCrypt(verkey, Buffer.from(message, 'utf8'));
  return Buffer.from(buffer).toString('base64');
};

const anonDecrypt = async (walletHandle, did, message) => {
  let verKey = await sdk.keyForLocalDid(walletHandle, did);
  let decryptedMessageBuffer = await sdk.cryptoAnonDecrypt(walletHandle, verKey, message);
  let buffer = Buffer.from(decryptedMessageBuffer).toString('utf8');
  return JSON.parse(buffer);
};

const authCrypt = async (walletHandle, myDid, theirDid, message) => {
  let myVerkey = await sdk.keyForLocalDid(walletHandle, myDid);
  let theirVerkey = await sdk.keyForLocalDid(walletHandle, theirDid);
  let buffer = await sdk.cryptoAuthCrypt(walletHandle, myVerkey, theirVerkey, Buffer.from(message, 'utf8'));
  return Buffer.from(buffer).toString('base64');
};

const authDecrypt = async (walletHandle, myDid, message) => {
  let myVerkey = await sdk.keyForLocalDid(walletHandle, myDid);
  let [, decryptedMessageBuffer] = await sdk.cryptoAuthDecrypt(walletHandle, myVerkey, Buffer.from(message, 'base64'));
  let buffer = Buffer.from(decryptedMessageBuffer).toString('utf8');
  return JSON.parse(buffer);
};

const buildAuthCryptedMessage = async (walletHandle, myDid, theirDid, messageType, message) => {
  return {
    origin: myDid,
    type: messageType,
    message: await authCrypt(walletHandle, myDid, theirDid, JSON.stringify(message)),
  };
};

module.exports = {
  verifySign,
  signMsg,
  dataHash,
  loadKeyFile,
  genKeyFile,
  createMasterSecret,
  anonCrypt,
  anonDecrypt,
  authCrypt,
  authDecrypt,
  buildAuthCryptedMessage,
};
