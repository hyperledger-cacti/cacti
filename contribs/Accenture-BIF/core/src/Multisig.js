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

  static isNonEmptyString(arg) {
    return arg && typeof arg === 'string';
  }

  /**
   * Change the raw message and reset options
   * @param {string} msg Message
   * @return {string} Formatted Message
   */
  setMsg(msg) {
    if (!Multisig.isNonEmptyString(msg)) {
      throw new TypeError('Argument must be a non-empty string');
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
    if (!Multisig.isNonEmptyString(pubKey) || !Multisig.isNonEmptyString(signedMsg)) {
      throw new TypeError('Arguments must be public key and signatures as strings');
    }
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
    if (!this.msg) {
      throw new TypeError('Message is not set yet');
    }
    if (!Multisig.isNonEmptyString(pubKey) && !Multisig.isNonEmptyString(signedMsg)) {
      throw new TypeError('Arguments must be public key and signatures as strings');
    }
    if (!(pubKey in this.signatures)) {
      this.signatures[pubKey] = signedMsg;
    }
    return this.signatures;
  }

  /**
   * Verify if the instance contains a list of signature
   * @param {string[]} requiredPubKeys Required Public Keys
   * @returns {boolean[]} verified Signatures
   */
  verifyRequiredSignature(requiredPubKeys) {
    if (!requiredPubKeys || !requiredPubKeys.constructor === Array) {
      throw new Error('Argument must be an array of public keys');
    }
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
