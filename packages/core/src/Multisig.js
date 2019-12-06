const secp256k1 = require(`secp256k1`);
const cryptoUtils = require(`./crypto-utils`);

class Multisig {
  /**
   * @param {String} msg Message
   */
  constructor(msg) {
    this.msg = null;
    this.formattedMsg = null;
    this.signatures = {};

    if (msg) {
      this.setMsg(msg);
    }
  }

  /**
   * Change the raw message and reset options
   * @param {string} msg Message
   * @return {string} Formatted Message
   */
  setMsg(msg) {
    if (typeof msg !== 'string') {
      throw new Error('argument must be a string');
    }
    this.msg = msg;
    this.formattedMsg = cryptoUtils.dataHash(this.msg);
    this.signatures = {};
    return this.formattedMsg;
  }

  /**
   * Verify if a signed message correspond to the current message and provided public key
   * @param {string} signedMsg
   * @param {string} pubKey
   * @return {boolean} Verify Signature Result
   */
  verifySignature(pubKey, signedMsg) {
    return secp256k1.verify(
      Buffer.from(this.formattedMsg, `hex`),
      Buffer.from(signedMsg, `hex`),
      Buffer.from(pubKey, `hex`)
    );
  }

  /**
   * Add a signature to this Multisig instance
   * @param {string} signedMsg
   * @param {string} pubKey
   * @return {object} Signatures
   */
  addSignature(pubKey, signedMsg) {
    if (this.msg !== null && pubKey !== undefined && signedMsg !== undefined) {
      if (!(pubKey in this.signatures)) {
        this.signatures[pubKey] = signedMsg;
      }
    }
    return this.signatures;
  }

  /**
   * Verify if the instance contains a list of signature
   * @param {string[]} requiredPubKeys Required Public Keys
   * @returns {boolean[]} verified Signatures
   */
  verifyRequiredSignature(requiredPubKeys) {
    const verifiedSignatures = [];
    requiredPubKeys.forEach(pubKey => {
      let verify = false;
      if (pubKey in this.signatures) {
        verify = true;
      }
      verifiedSignatures.push(verify);
    });
    return verifiedSignatures;
  }
}

module.exports = Multisig;
