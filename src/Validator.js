/* eslint no-use-before-define: ["error", { "variables": false }] */
const zmq = require(`zeromq`);
const log4js = require(`log4js`);

const fedcom = require(`./federation-communication`);
const conf = require(`../config.json`);
const Connector = require(`./pluggins/Connector`);
const Crypto = require(`./crypto-utils`);
const Multisig = require(`./Multisig`);

const logger = log4js.getLogger(`Validator`);
logger.level = `DEBUG`;

/**
 * Validator
 *
 * @example
 * const options = {
 *  privKey: `your_privKey`,
 *  pubKey: `your_pubKey`,
 *  clientRepAddr: `your_clientRepAddr`,
 *  pubAddr: `your_pubAddr`,
 *  repAddr: `your_repAddr`,
 *  leaderPubAddr: `your_leaderPubAddr`,
 *  leaderRepAddr: `your_leaderRepAddr`,
 *  leaderClientRepAddr: `your_leaderClientRepAddr`,
 *  type: `your_type`,
 * })
 *
 * const validator = new Validator(new Connector.FABRIC(config.blockchains.fabric), options);
 *
 * validator.start();
 * validator.stop();
 *
 */
class Validator {
  /**
   * @param {Object} blockchainClient Standardised wrapper for Blockchain specific calls.
   * supported platforms: FABRIC, QUORUM
   * @param {Object} options
   * @param {String} options.privKey Private Key
   * @param {String} options.pubKey Public Key
   * @param {String} options.clientRepAddr Client Rep address
   * @param {String} options.pubAddr Public address
   * @param {String} options.repAddr Rep address
   * @param {String} options.leaderPubAddr Leader Public address
   * @param {String} options.leaderRepAddr Leader Rep address
   * @param {String} options.leaderClientRepAddr Leader Client Rep address
   * @param {String} options.type Validator type
   */
  constructor(blockchainClient, options) {
    if (!(blockchainClient instanceof Connector)) {
      throw new Error(`Validator needs a valid connector to get started`);
    }
    this.blockchainClient = blockchainClient;

    Object.assign(this, options);
    if (this.type === fedcom.VALIDATOR_TYPE.LEADER) {
      this.leaderPubAddr = options.pubAddr;
      this.leaderRepAddr = options.repAddr;
      this.leaderClientRepAddr = options.clientRepAddr;
    } else {
      this.leaderPubAddr = options.leaderPubAddr;
      this.leaderRepAddr = options.leaderRepAddr;
      this.leaderClientRepAddr = options.leaderClientRepAddr;
    }

    this.publishSocket = null;
    this.requestSocket = null;
    this.availableFollowers = [];
    this.intervalExec = null;
    this.clientRepSocket = null;
    this.currentMultisig = new Multisig();
    this.electionTimeout = conf.electionTimeout;
  }

  /**
   * Start Validator
   * @return {void}
   */
  start() {
    this.startClientServer();

    if (this.type === fedcom.VALIDATOR_TYPE.LEADER) {
      this.startAsLeader();
    } else {
      this.startAsFollower();
    }
  }

  /**
   * Stop Validator
   * @return {void}
   */
  stop() {
    if (this.type === fedcom.VALIDATOR_TYPE.LEADER) {
      clearInterval(this.intervalExec);
      this.requestSocket.close();
    }
    if (this.publishSocket) this.publishSocket.close();
    if (this.clientRepSocket) this.clientRepSocket.close();
  }

  /**
   * Start listening to requests from other Validators
   * Acts as a Leader Validator type
   * @return {void}
   */
  startAsLeader() {
    logger.debug(`Starting as Leader ...`);
    logger.debug(
      `I am : 
      (${this.pubAddr},
      ${this.repAddr},
      ${this.clientRepAddr})`
    );

    this.type = fedcom.VALIDATOR_TYPE.LEADER;
    this.publishSocket = zmq.socket(`pub`);
    this.publishSocket.bindSync(this.leaderPubAddr);
    this.intervalExec = this.newLeaderElection();
    this.requestSocket = zmq.socket(`rep`);
    this.requestSocket.bindSync(this.leaderRepAddr);
    this.requestSocket.on(`message`, fedcom.ValidatorAsLeaderMessage.bind(this));
  }

  /**
   * Start listening to requests from other Validators
   * Acts as a Follower Validator type
   * @return {void}
   */
  startAsFollower() {
    logger.debug(`Starting as Follower... `);
    logger.debug(
      `My Leader is : 
      (${this.leaderPubAddr},
      ${this.leaderRepAddr},
      ${this.leaderClientRepAddr})`
    );

    this.type = fedcom.VALIDATOR_TYPE.FOLLOWER;
    this.publishSocket = zmq.socket(`sub`);
    this.publishSocket.connect(this.leaderPubAddr);
    this.publishSocket.subscribe(``);
    this.publishSocket.on(`message`, fedcom.ValidatorAsFollowerMessage.bind(this));
  }

  /**
   * Start listening to FederationClient`s requests from participants
   * @return {void}
   */
  startClientServer() {
    // Set the client reply socket to listen to any client requests
    this.clientRepSocket = zmq.socket(`rep`);
    this.clientRepSocket.bindSync(this.clientRepAddr);
    this.clientRepSocket.on(`message`, fedcom.ValidatorClientServerMessage.bind(this));
  }

  /**
   * TODO: should be integrated within examples/simple-asset-transfer folder
   * Verify the existence of the Data in the Blockchain
   * @param {string} type
   * @param {object} dataToSign
   * @param {object} connector
   * @returns {string}
   */
  async checkData(type, dataToSign, targetDLTType) {
    const typeError = new Error(`Unknown sign protocol: ${type}`);
    switch (type) {
      case `ASSET_ID`:
        try {
          const asset = await this.blockchainClient.getAsset(dataToSign, targetDLTType);
          if (asset && asset.locked) {
            const data = JSON.stringify(asset);
            return data;
          }
          return null; // TODO asset is not ready for export, action: reject instead
        } catch (error) {
          return Promise.reject(error);
        }
      default:
        return Promise.reject(typeError);
    }
  }

  /**
   * @typedef {DataSignResult} DataSignResult
   * @property {String} signature Signature
   * @property {String} data data
   */

  /**
   * Verify the existence of the Data in the Blockchain then sign it
   * @param {string} type Validator type
   * @param {object} dataToSign Data To Sign
   * @param {string} targetDLTType Target DLT Type
   * @returns {Promise<DataSignResult>} DataSignResult
   */
  async dataSign(type, dataToSign, targetDLTType) {
    const invalidError = new Error(`request rejected by validator`);
    try {
      const data = await this.checkData(type, dataToSign, targetDLTType);
      if (data) {
        logger.debug(`Signing the following asset: '${data}'`);
        const signature = await Crypto.signMsg(data, this.privKey, targetDLTType);
        return { signature, data };
      }
      throw invalidError;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Select on validator in the specified pool to be the leader of the next round
   * @static
   * @param {string[]} aliveValidators - Alive Validators
   * @return {string} Next Leader Address
   */
  static selectNextLeader(aliveValidators) {
    const index = Math.floor(Math.random() * Math.floor(aliveValidators.length));
    return aliveValidators[index];
  }

  /**
   * Sign locally and broadcast remaining job to alive validators
   * @param {string} type Validator type
   * @param {object} dataToSign Data To Sign
   * @param {string} targetDLTType Target DLT Type
   * @return {Promise<Boolean>} success / error
   */
  async broadcastSignRequest(type, data, targetDLTType) {
    // Leader starts the process of gathering signatures only if the asset exists and is locked
    try {
      const leaderSignature = await this.dataSign(type, data, targetDLTType);
      if (!leaderSignature) {
        throw new Error(`Leader did not validate the data`);
      }
      this.currentMultisig.setMsg(leaderSignature.data);
      this.currentMultisig.addSignature(this.pubKey, leaderSignature.signature);
    } catch (error) {
      logger.debug(error);
      return Promise.reject(error);
    }
    logger.debug(`Multisig state is : ${JSON.stringify(this.currentMultisig)}`);
    // Braodcast the signature request to get the followers` signatures
    const signatureReq = { type: fedcom.MSG_TYPE.SIGN, data, targetDLTType, requester: this.leaderRepAddr };
    this.publishSocket.send([fedcom.MSG_TYPE.SIGN, JSON.stringify(signatureReq)]);
    return new Promise(resolve => setTimeout(resolve.bind(this, true), conf.timeout));
  }

  /**
   * Prepare validator pool and select new leader
   * @return {string} Interval Id.
   */
  newLeaderElection() {
    return setInterval(() => {
      this.availableFollowers = [];

      logger.debug(`Sending heartbeat request`);
      this.publishSocket.send([fedcom.MSG_TYPE.HEARTBEAT, `{}`]);

      setTimeout(() => {
        // Select the next leader
        if (this.availableFollowers.length !== 0) {
          const nextLeader = Validator.selectNextLeader(this.availableFollowers);
          this.publishSocket.send([fedcom.MSG_TYPE.NEWLEADER, JSON.stringify(nextLeader)]);
          // Switch from leader to follower
          this.switchToNewLeader(nextLeader);
        }
      }, conf.timeout);
    }, this.electionTimeout);
  }

  /**
   * Change local parameters to adjust to new leader
   * @param {Object} newLeader
   * @param {string} newLeader.pub New Leader Public Address
   * @param {string} newLeader.rep New Leader Rep Address
   * @param {string} newLeader.clientRep New Leader Client Rep Address
   * @return {void}
   */
  switchToNewLeader(newLeader) {
    // Update leader address
    this.leaderPubAddr = newLeader.pub;
    this.leaderRepAddr = newLeader.rep;
    this.leaderClientRepAddr = newLeader.clientRep;

    // Stop the pub and rep sockets
    this.publishSocket.close();

    if (this.type === fedcom.VALIDATOR_TYPE.LEADER) {
      // REFAC: this if content could go to line ~206
      // (right before newLeaderElection/switchToNewLeader)
      // but that would need to refac the test
      this.requestSocket.close();
      this.requestSocket = null;
      clearInterval(this.intervalExec);
      this.intervalExec = null;
    }

    if (this.pubAddr === newLeader.pub) {
      this.startAsLeader();
      return;
    }

    // Follower updates its references to the new leader
    this.startAsFollower();
  }
}

module.exports = Validator;
