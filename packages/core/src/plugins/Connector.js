/* eslint-disable class-methods-use-this */
const url = require(`url`);

const connectors = `${__dirname}/connectors`;

/**
 * Standardised wrapper for Blockchain specific calls.
 * Define the necessary functions to call interoperability specific on-chain logic.
 * Supported platforms: FABRIC, QUORUM
 *
 * @example
 * const connector = new Connector({
 *  url: `your_url`,
 *  username: `your_userName`,
 *  password: `your_password`,
 * })
 *
 * const quorumConnector = connector.QUORUM();
 * const fabricConnector = connector.FABRIC();
 * const cordaConnector = connector.CORDA();
 *
 * @tutorial connector
 */
class Connector {
  /**
   * Fabric connector initialization
   * @static
   * @return {ConnectorFabric} Fabric Connector class instance
   */
  static get FABRIC() {
    return require(`${connectors}/ConnectorFabric`); // eslint-disable-line
  }

  /**
   * Quorum connector initialization
   * @static
   * @return {ConnectorQuorum} Fabric Connector class instance
   */
  static get QUORUM() {
    return require(`${connectors}/ConnectorQuorum`); // eslint-disable-line
  }

  /**
   * Besu connector initialization
   * @static
   * @return {ConnectorBesu} Fabric Connector class instance
   */
  static get BESU() {
    return require(`${connectors}/ConnectorBesu`); // eslint-disable-line
  }

  /**
   * Corda connector initialization
   * @static
   * @return {ConnectorCorda} Corda Connector class instance
   */
  static get CORDA() {
    return require(`${connectors}/ConnectorCorda`); // eslint-disable-line
  }

  /**
   * @param {Object} options
   * @param {String} options.url url address
   * @param {String} options.username api access user name
   * @param {String} options.password api access password
   */
  constructor(options = {}) {
    if (this.constructor === Connector) {
      throw new TypeError(`can not instanciate abstract class.`);
    }
    if (!options.url) {
      throw new ReferenceError(`parameters 'url' is required for Connector constructor`);
    }
    this.options = { ...options };
    this.checkParam();
  }

  checkUrl() {
    const urlCheck = url.parse(this.options.url);
    if (!urlCheck.hostname || !urlCheck.protocol) {
      throw new TypeError(`invalid URL provided: ${this.options.url}`);
    }
    if (urlCheck.port && (urlCheck.port < 1024 || urlCheck.port > 49151)) {
      throw new RangeError(`invalid Port in URL: ${this.options.url}`);
    }
    return this.options.url;
  }

  checkParam() {
    this.checkUrl();
  }

  /**
   * @typedef {ForeignValidator} ForeignValidator
   * @property {String} name Validator name
   * @property {String} type Validator type
   * @property {String} pubKey Validator Public Key
   * @property {String} ethAddress Validator Eth Address
   */

  /**
   * Add the public key of a foreign validator
   * (abstract method of addForeignValidator, callable method should be implemented in DLT specific child)
   * @abstract
   * @param {string} pubKey public key
   * @param {string} name foreign validator name
   * @return {ForeignValidator} - Foreign Validator object
   */
  async addForeignValidator() {
    throw new TypeError(`Not allow to call 'Connector's addForeignValidator' from child class.`);
  }

  /**
   * Get Access Token
   * (abstract method of getAccessToken, callable method should be implemented in Example specific child)
   * @abstract
   * @return {string} - Token if valid credentials are provided
   */
  async getAccessToken() {
    throw new TypeError(`Not allow to call 'Connector's getAccessToken' from child class.`);
  }

  /**
   * @typedef {Multisig} MultisigObject
   * @property {String} msg message
   * @property {Object} signatures signatures
   */

  /**
   * Verify multiple signatures against registered foreignValidators
   * (abstract method of verifyMultisig, callable method should be implemented in DLT specific child)
   * @abstract
   * @param {MultisigObject} multisig
   * @return {VerifySignatureResponse[]} - Array of Verify Signature Response
   */
  async verifyMultisig() {
    throw new TypeError(`Not allow to call 'Connector's verifyMultisig' from child class.`);
  }

  /**
   * @typedef {VerifySignatureResponse} VerifySignatureResponse
   * @property {String} signature signature
   * @property {String} ethAddress Eth Address
   */

  /**
   * Verify that a message matches a specific (signature, pubKey) tupple
   * pubKey should match a registered foreignValidator
   * (abstract method of verifySignature, callable method should be implemented in DLT specific child)
   * @abstract
   * @param {string} message message
   * @param {string} signature signature
   * @return {VerifySignatureResponse} - Verify Signature Response
   */
  async verifySignature() {
    throw new TypeError(`Not allow to call 'Connector's verifySignature' from child class.`);
  }
}
module.exports = Connector;
