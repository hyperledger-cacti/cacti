/* eslint-disable no-await-in-loop */
/* eslint no-use-before-define: ["error", { "variables": false }] */
const zmq = require(`zeromq`);
const log4js = require(`log4js`);
const { Etcd3 } = require('etcd3');
const uuidV4 = require('uuid/v4');

const fedcom = require(`./federation-communication`);
const conf = require(`../config.json`);
const Connector = require(`./plugins/Connector`);
const Crypto = require(`./crypto-utils`);
const Multisig = require(`./Multisig`);

const logger = log4js.getLogger(`Validator`);
logger.level = `DEBUG`;

const CACTUS_LEADER = 'cactus/leader';

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
   */
  constructor(blockchainClient, options) {
    if (!(blockchainClient instanceof Connector)) {
      throw new Error(`Validator needs a valid connector to get started`);
    }
    this.blockchainClient = blockchainClient;
    Object.assign(this, options);

    this.publishSocket = null;
    this.requestSocket = null;
    this.availableFollowers = [];
    this.intervalExec = null;
    this.clientRepSocket = null;
    this.currentMultisig = new Multisig();
    this.electionTimeout = conf.electionTimeout;
    this.randomizedLeadershipPoolInterval = this.electionTimeout / 3 + (Math.random() * this.electionTimeout) / 3;

    this.selfNodeInfo = {
      id: uuidV4(),
      pid: process.pid,
      startedAt: new Date(),
      networkInfo: {
        leaderPubAddr: this.pubAddr,
        leaderRepAddr: this.repAddr,
        leaderClientRepAddr: this.clientRepAddr,
      },
    };

    logger.debug(`Creating new validator instance. Node info: `, JSON.stringify(this.selfNodeInfo));

    // etcd setup
    this.EtcdConstructor = typeof this.EtcdConstructor === 'function' ? this.EtcdConstructor : Etcd3;
    this.etcdClient = this.createEtcdClient();

    this.setupLeaderElections();
  }

  isCurrentNodeLeader() {
    return typeof this.leaderNodeInfo === 'object' && this.leaderNodeInfo.id === this.selfNodeInfo.id;
  }

  createEtcdClient() {
    if (typeof this.EtcdConstructor !== 'function') {
      throw new TypeError(`Validator#createEtcdClient() expected this.EtcdConstructor to be function.`);
    }
    if (!Array.isArray(this.etcdHosts)) {
      throw new TypeError(`Validator#createEtcdClient() expected this.etcdHosts to be an Array<string>.`);
    }
    logger.debug(`Creating etcd client with hosts`, this.etcdHosts);
    return new this.EtcdConstructor({
      hosts: this.etcdHosts,
    });
  }

  async setupLeaderElections() {
    const leaseTtlSeconds = Math.round(this.electionTimeout / 1000);
    logger.debug(`Creating lease with TTL=${leaseTtlSeconds} seconds...`);
    const theLease = this.etcdClient.lease(leaseTtlSeconds);

    theLease.on('lost', () => logger.debug(['LEASE:keepaliveLost']));
    theLease.on('keepaliveFailed', () => logger.warn(['LEASE:keepaliveFailed']));
    theLease.on('keepaliveEstablished', () => logger.debug(['LEASE:keepaliveEstablished']));

    const maxTries = 25;
    let didSucceed = false;
    let tryIndex = 1;
    let lastError;
    const tryDelayMs = 5000;
    while (tryIndex < maxTries && !didSucceed) {
      tryIndex += 1;
      try {
        logger.debug(`Calling attemptToBecomeLeader() ${maxTries}/${tryIndex}`);
        await this.attemptToBecomeLeader(theLease);
        didSucceed = true;
      } catch (ex) {
        didSucceed = false;
        lastError = ex;
        logger.debug(`Will re-try attemptToBecomeLeader() ...`);
        await new Promise(resolve => setTimeout(resolve, tryDelayMs));
      }
    }
    if (!didSucceed) {
      throw lastError;
    }

    // Setup the watcher
    const watcher = await this.etcdClient
      .watch()
      .key(CACTUS_LEADER)
      .create();
    logger.debug(`Etcd watcher set up OK.`);

    watcher
      .on('disconnected', () => logger.debug('[WATCH] disconnected...', this.selfNodeInfo))
      .on('connected', () => logger.debug('[WATCH] successfully reconnected!', this.selfNodeInfo))
      .on('put', res => {
        const newLeaderNodeInfoJson = res.value.toString('utf8');
        logger.debug(`[WATCH] key ${CACTUS_LEADER} got set to new value: `, newLeaderNodeInfoJson);
        const newLeaderNodeInfo = JSON.parse(newLeaderNodeInfoJson);
        this.switchToNewLeader(newLeaderNodeInfo);
        // TODO: check if this gets called when leader ttl expires as well. If yes, we can pounce on that to attempt
        // leadership.
      });
    // Finished settig up watcher

    setInterval(this.attemptToBecomeLeader.bind(this, theLease), this.randomizedLeadershipPoolInterval);
    logger.debug(`Scheduled regular attemptToBecomeLeader() calls every ${this.randomizedLeadershipPoolInterval}ms`);
  }

  attemptToBecomeLeader(theLease) {
    if (this.isCurrentNodeLeader()) {
      return Promise.resolve();
    }
    return this.etcdClient
      .if(CACTUS_LEADER, 'Lease', '==', 0)
      .then(theLease.put(CACTUS_LEADER).value(JSON.stringify(this.selfNodeInfo)))
      .else(this.etcdClient.get(CACTUS_LEADER))
      .commit()
      .then(txnResponse => {
        logger.debug(`attemptToBecomeLeader() succeeded=${txnResponse.succeeded}`);
        let newLeaderNodeInfo;
        if (txnResponse.succeeded) {
          newLeaderNodeInfo = this.selfNodeInfo;
        } else {
          // For details on the txResponse structure visit the link below:
          // https://mixer.github.io/etcd3/interfaces/rpc_.itxnresponse.html
          const { responses } = txnResponse;
          const [getCactusLeaderResponse] = responses;
          const { response_range: responseRange } = getCactusLeaderResponse;
          const { kvs } = responseRange;
          const [newLeaderNodeInfoEntry] = kvs;
          const { value: newLeaderNodeInfoBuffer } = newLeaderNodeInfoEntry;
          const newLeaderNodeInfoJson = newLeaderNodeInfoBuffer.toString('utf8');
          logger.debug(`attemptToBecomeLeader() newLeaderNodeInfoJson=${newLeaderNodeInfoJson}`);
          newLeaderNodeInfo = JSON.parse(newLeaderNodeInfoJson);
        }
        this.switchToNewLeader(newLeaderNodeInfo);
      });
  }

  /**
   * Start Validator
   * @return {void}
   */
  start() {
    this.startClientServer();
  }

  /**
   * Stop Validator
   * @return {void}
   */
  stop() {
    if (this.isCurrentNodeLeader()) {
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
    logger.debug(`I am : (${this.pubAddr}, ${this.repAddr}, ${this.clientRepAddr})`);

    this.type = fedcom.VALIDATOR_TYPE.LEADER;
    this.publishSocket = zmq.socket(`pub`);
    this.publishSocket.bindSync(this.leaderPubAddr);
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
    logger.debug(`My Leader is : (${this.leaderPubAddr}, ${this.leaderRepAddr}, ${this.leaderClientRepAddr})`);

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
   * Change local parameters to adjust to new leader
   * @return {void}
   */
  switchToNewLeader(newLeaderNodeInfo) {
    if (this.leaderNodeInfo && this.leaderNodeInfo.id === newLeaderNodeInfo.id) {
      logger.debug(`switchToNewLeader() leader is same as before...`, JSON.stringify(newLeaderNodeInfo));
    } else {
      logger.debug(`switchToNewLeader() leader is different from before...`, JSON.stringify(newLeaderNodeInfo));
    }
    this.leaderNodeInfo = newLeaderNodeInfo;

    // TODO(peter.somogyvari): Once leader election has enough test coverage, get rid of these property assignments
    // and just use the this.leaderNodeInfo.networkInfo object directly everywhere.
    this.leaderPubAddr = this.leaderNodeInfo.networkInfo.leaderPubAddr;
    this.leaderRepAddr = this.leaderNodeInfo.networkInfo.leaderRepAddr;
    this.leaderClientRepAddr = this.leaderNodeInfo.networkInfo.leaderClientRepAddr;

    // Stop the pub and rep sockets
    if (this.publishSocket) {
      this.publishSocket.close();
    }

    if (this.requestSocket) {
      this.requestSocket.close();
      this.requestSocket = null;
    }

    if (this.isCurrentNodeLeader()) {
      this.startAsLeader();
    } else {
      this.startAsFollower();
    }
  }
}

module.exports = Validator;
