/* eslint no-use-before-define: ["error", { "variables": false }] */
const zmq = require(`zeromq`);
const log4js = require(`log4js`);

const fedcom = require(`./federation-communication`);
const conf = require(`../config`);
const Multisig = require(`./Multisig.js`);

const logger = log4js.getLogger(`Client`);
logger.level = `DEBUG`;

/**
 * Simple Client to enable communication with federation validators
 */
class Client {
  /**
   * @param {Object} options
   * @param {String[]} options.validators Validators addresses
   */
  constructor(options) {
    if (!Object.keys(options).length) {
      throw new Error(`Client options required`);
    }

    if (!options.validators || !options.validators.length) {
      throw new Error(`options.validators array must be specified`);
    }

    this.options = options;
  }

  /**
   * Send a request to a validator and wait (max TIMEOUT) for the answer
   * @return {Promise<string>} Result
   */
  static get validatorRequest() {
    return fedcom.sendRequestToValidator;
  }

  /**
   * Check if the given validator is responsive
   * @property {string} validatorAddr - The Validator Endpoint.
   * @return {boolean}
   */
  static isValidatorAlive(validatorAddr) {
    return new Promise((resolve, reject) => {
      try {
        const socket = zmq.socket(`req`);
        socket.connect(validatorAddr);

        const timeoutId = setTimeout(() => {
          socket.close();
          logger.debug(`${validatorAddr} is not alive`);
          return resolve(false);
        }, conf.timeout);

        const messageHandler = fedcom.ClientIsValidatorAliveMessage.bind(null, {
          logger,
          promise: { resolve, reject },
          socket,
          timeoutId,
          validatorAddr,
        });

        socket.on(`message`, messageHandler);

        return socket.send(
          JSON.stringify({
            type: fedcom.REQ_TYPE.HEARTBEAT,
          })
        );
      } catch (error) {
        logger.error(error);
        return reject(error);
      }
    });
  }

  /**
   * Query pubKey of a validator
   * @property {string} validatorAddr - The Validator Endpoint.
   * @return {string}
   */
  static async askForPubKey(validatorAddr) {
    try {
      const isAlive = await Client.isValidatorAlive(validatorAddr);
      if (!isAlive) {
        throw new Error(`validator is not alive`);
      }

      logger.debug(`Now querying the server ${validatorAddr} for public key`);
      return Client.validatorRequest(validatorAddr, {
        type: fedcom.REQ_TYPE.PUB_KEY,
      });
    } catch (error) {
      logger.error(error);
      return Promise.reject(error);
    }
  }

  /**
   * Look for an 'alive' validator from the validator list
   * @return {string}
   */
  async findValidator(index = 0) {
    try {
      const validatorAddr = this.options.validators[index];
      const found = await Client.isValidatorAlive(validatorAddr);
      if (!found) {
        const nextIndex = (index + 1) % this.options.validators.length;
        return this.findValidator(nextIndex);
      }
      return validatorAddr;
    } catch (error) {
      logger.debug(error);
      return Promise.reject(error);
    }
  }

  /**
   * Ask to the alive validators to sign a piece of data
   * @param {string} assetId
   * @return {Multisig}
   */
  async askForSignatures(assetId, targetDLTType) {
    try {
      const validatorAddr = await this.findValidator();
      logger.info(`Now querying the server ${validatorAddr} for data signature`);

      const response = await Client.validatorRequest(validatorAddr, {
        type: fedcom.REQ_TYPE.SIGN_REQ,
        data: assetId,
        targetDLTType,
      });
      logger.debug({ response });
      // REFAC: return should be a multisig
      return Object.assign(new Multisig(), JSON.parse(response.toString()).signatures);
    } catch (error) {
      logger.debug(error);
      return Promise.reject(error);
    }
  }
}

module.exports = Client;
