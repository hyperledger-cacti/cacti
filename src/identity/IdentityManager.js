/* eslint no-use-before-define: ["error", { "variables": false }] */
const sdk = require('indy-sdk');
const sleep = require('sleep');

const fedcom = require(`../federation-communication`);
const conf = require(`./config.json`);
const Crypto = require(`./crypto-utils`);
const Store = require(`./Store`);

/**
 * IdentityManager
 *
 * @example
 * const steward = {
 *  did: `steward_did`,
 *  key: `steward_key`,
 *  wallet: `steward_wallet`
 * }
 *
 * const indy = new IndyManager(poolHandle);
 * await indy.initializeIdentity(steward)
 * validator.start();
 * validator.stop();
 */
class IdentityManager {
  /**
   * @param {Object} poolHandle Indy ledger pool
   */
  constructor(poolHandle) {
    this.poolHandle = poolHandle;
  }
  /**
   * Initialize the identity of the Validator
   * @param {object} steward
   * @returns {void}
   */
  async initializeIdentity(steward) {
    try {
      await sdk.createWallet({ id: this.name }, { key: this.password });
    } catch (e) {
      if (e.message !== 'WalletAlreadyExistsError') {
        console.warn('create wallet failed with message: ' + e.message);
        throw e;
      }
    } finally {
      console.info('wallet already exist, try to open wallet');
    }
    this.walletHandle = await sdk.openWallet({ id: this.name }, { key: this.password });

    [this.endpointDid, this.pubVerkey] = await sdk.createAndStoreMyDid(this.walletHandle, {});
    let didMeta = JSON.stringify({
      primary: true,
      schemas: [],
      credential_definitions: [],
    });
    await sdk.setDidMetadata(this.walletHandle, this.endpointDid, didMeta);
    let nymRequest = await sdk.buildNymRequest(steward.did, this.endpointDid, this.pubVerKey, null, 'TRUST_ANCHOR');
    await sdk.signAndSubmitRequest(this.poolHandle, steward.wallet, steward.did, nymRequest);
    let attributeRequest = await sdk.buildAttribRequest(
      this.endpointDid,
      this.endpointDid,
      null,
      { endpoint: { ha: this.pubAddr } },
      null
    );
    await sdk.signAndSubmitRequest(this.poolHandle, this.walletHandle, this.endpointDid, attributeRequest);
    await Crypto.createMasterSecret(this.walletHandle, this.endpointDid);
    return;
  }

  /**
   * Multi-sign a request
   * @param {object} request
   * @returns {object}
   */
  async multiSignRequest(request) {
    return sdk.multiSignRequest(this.walletHandle, this.endpointDid, request);
  }

  /**
   * Submit a request
   * @param {object} request
   * @returns {object}
   */
  async submitRequest(request) {
    return sdk.submitRequest(this.poolHandle, request);
  }

  /**
   * Sign and submit a request
   * @param {object} request
   * @returns {object}
   */
  async signAndSubmitRequest(request) {
    return sdk.signAndSubmitRequest(this.poolHandle, this.walletHandle, this.endpointDid, request);
  }

  /**
   * Send a request for credentials
   * @param {string} toDid
   * @param {object} message
   * @returns {void}
   */
  async sendCredRequest(toDid, encryptedMessage) {
    let credentialOffer = await Crypto.authDecrypt(this.walletHandle, this.endpointDid, encryptedMessage);
    let getCredDefRequest = await sdk.buildGetCredDefRequest(this.endpointDid, credentialOffer.cred_def_id);
    let getCredDefResponse = await submitRequest(getCredDefRequest);
    let [, credDef] = await sdk.parseGetCredDefResponse(getCredDefResponse);
    let metadata = await sdk.getDidMetadata(this.walletHandle, this.endpointDid);
    metadata = JSON.parse(metadata);
    let masterSecretId = metadata['master_secret_id'];
    let [credRequest, credRequestMetadata] = await sdk.proverCreateCredentialReq(
      this.walletHandle,
      this.endpointDid,
      credentialOffer,
      credDef,
      masterSecretId
    );
    Store.pendingCredentialRequests.write(credRequest, credRequestMetadata);
    let message = await Crypto.buildAuthcryptedMessage(
      this.walletHandle,
      this.endpointDid,
      toDid,
      MESSAGE_TYPES.REQUEST,
      credRequest
    );
    return sendAnonCryptedMessage(toDid, message);
  }

  /**
   * Accept an incoming credential offer and store it to the Identity wallet
   * @param {string} fromDid
   * @param {object} message
   * @returns {void}
   */
  async acceptAndStoreCredential(fromDid, encryptedMessage) {
    let credential = await Crypto.authDecrypt(this.walletHandle, this.endpointDid, encryptedMessage);
    let credentialRequestMetadata;
    let pendingCredentialRequests = Store.pendingCredentialRequests.getAll();
    for (let pendingCredReq of pendingCredentialRequests) {
      if (pendingCredReq.credRequestJson.cred_def_id === credential.cred_def_id) {
        credentialRequestMetadata = pendingCredReq.credRequestMetadataJson;
      }
    }
    let getCredDefRequest = await sdk.buildGetCredDefRequest(this.endpointDid, credentialOffer.cred_def_id);
    let getCredDefResponse = await submitRequest(getCredDefRequest);
    let [, credDef] = await sdk.parseGetCredDefResponse(getCredDefResponse);
    let getRevocRegDefRequest = await sdk.buildGetRevocRegDefRequest(this.endpointDid, credential['rev_reg_id']);
    let getRevocRegDefResponse = await submitRequest(getRevocRegDefRequest);
    let [, revocRegDef] = await sdk.parseGetRevocRegDefResponse(getRevocRegDefResponse);
    await sdk.proverStoreCredential(
      this.walletHandle,
      null,
      credentialRequestMetadata,
      credential,
      credDef,
      revocRegDef
    );
  }

  /**
      * Create a proof from a proof request
      * @param {object} proofRequest
      * @returns {object}

      * @example
      * var proofRequest = {
      *   'nonce': '123432421212',
      *   'name': 'proof_req_1',
      *   'version': '0.1',
      *   'requested_attributes': {
      *     'attr1_referent': { 'name': 'name' }
      *   },
      *   'requested_predicates': {
      *     'predicate1_referent': { 'name': 'age', 'p_type': '>=', 'p_value': 18 }
      *   },
      *   'non_revoked': { 'from': 80, 'to': 100 }
      * }
      */
  async createProof(proofRequest) {
    //TODO should be adapted to the Validator credential format.
    let credsForProofRequest = await sdk.proverGetCredentialsForProofReq(this.walletHandle, proofRequest);
    let credsForProof = {};
    for (let attr of Object.keys(proofRequest.requested_attributes)) {
      credsForProof[`${credsForProofRequest['attrs'][attr][0]['cred_info']['referent']}`] =
        credsForProofRequest['attrs'][attr][0]['cred_info'];
    }

    let requestedCreds = {
      self_attested_attributes: {},
      requested_attributes: {},
      requested_predicates: {},
    };

    for (let attr of Object.keys(proofRequest.requested_attributes)) {
      requestedCreds.requested_attributes[attr] = {
        cred_id: credsForProofRequest['attrs'][attr][0]['cred_info']['referent'],
        revealed: true,
      };
    }

    let schemas = {};
    let credDefs = {};
    let revocStates = {};
    //TODO get revocRegDefId from registry contract or from proofRequest
    for (let referent of Object.keys(credsForProof)) {
      let item = identifiers[referent];
      let getSchemaRequest = await sdk.buildGetSchemaRequest(this.endpointDid, item['schema_id']);
      let getSchemaResponse = await sdk.submitRequest(getSchemaRequest);
      let [, schema] = await sdk.parseGetSchemaResponse(getSchemaResponse);
      schemas[schema.id] = schema;

      let getCredDefRequest = await sdk.buildGetCredDefRequest(this.endpointDid, item['cred_def_id']);
      let getCredDefResponse = await submitRequest(getCredDefRequest);
      let [credDefId, credDef] = await sdk.parseGetCredDefResponse(getCredDefResponse);
      credDefs[credDefId] = credDef;

      let getRevocRegDefRequest = await sdk.buildGetRevocRegDefRequest(this.endpointDid, item['rev_reg_id']);
      let getRevocRegDefResponse = await submitRequest(getRevocRegDefRequest);
      let [, revocRegDef] = await sdk.parseGetRevocRegDefResponse(getRevocRegDefResponse);
      let timestamp = Math.floor(Date.now() / 1000);
      //TODO get blobReaderHandle and revocDelta
      let revocState = await sdk.createRevocationState(
        blobReaderHandle,
        revocRegDef,
        revocDelta,
        timestamp,
        item['cred_rev_id']
      );
      revocStates[timestamp] = revocState;
    }
    let metadata = await sdk.getDidMetadata(this.walletHandle, this.endpointDid);
    metadata = JSON.parse(metadata);
    let masterSecretId = metadata['master_secret_id'];
    var proof = await sdk.proverCreateProof(
      this.walletHandle,
      proofRequest,
      requestedCreds,
      masterSecretId,
      schemas,
      credDefs,
      revocStates
    );
    return proof;
  }

  /**
   * send a proof to a specified DID
   * @param {string} toDid
   * @param {object} proof
   * @returns {object}
   */
  sendProof(toDid, proof) {}

  /**
   * Create a credential schema
   * @param {string} name
   * @param {double} version
   * @param {object} attributes
   * @returns {void}
   */
  async createSchema(mame, version, attributes) {
    let [id, schema] = await sdk.issuerCreateSchema(this.endpointDid, name, version, attributes);
    let schemaRequest = await sdk.buildSchemaRequest(this.endpointDid, schema);
    await signAndSubmitRequest(schemaRequest);
    //add schema Id to registry contract using this.blockchainClient
  }

  /**
   * Create a credential definition fron a schema
   * @param {string} schemaId
   * @param {string} tag
   * @returns {object}
   */
  async createCredDefRequest(schemaId, tag) {
    //TODO get schema schemaId from registry contract
    let getSchemaRequest = await sdk.buildGetSchemaRequest(this.endpointDid, schemaId);
    let getSchemaResponse = await submitRequest(getSchemaRequest);
    let [, schema] = await sdk.parseGetSchemaResponse(getSchemaResponse);
    let [credDefId, credDef] = await sdk.issuerCreateAndStoreCredentialDef(
      this.walletHandle,
      this.endpointDid,
      schema,
      tag,
      'CL',
      '{"support_revocation": true}'
    );
    let credDefRequest = await sdk.buildCredDefRequest(this.endpointDid, credDef);
    let signedcredDefRequest = await multiSignRequest(credDefRequest);
    return signedcredDefRequest;
    //await sdk.submitRequest(this.poolHandle, signedcredDefRequest);
    //add CredDefId to registry contract using this.blockchainClient
  }

  /**
   * Create a revocation registry associated to a credential definition
   * @param {string} credDefId
   * @param {string} tag
   * @returns {object}
   */
  async createRevocRegDef(credDefId, tag) {
    //TODO store tails in the blockchainClient to share it between Validators
    let tailsWriterConfig = {
      base_dir: tempy.directory(),
      uri_pattern: '',
    };
    let blobWriterHandle = await sdk.openBlobStorageWriter('default', tailsWriterConfig);
    let [revocRegDefId, revocRegDef, revocRegEntry] = await sdk.issuerCreateAndStoreRevocReg(
      this.walletHandle,
      this.endpointDid,
      null,
      tag,
      credDefId,
      {
        max_cred_num: 5,
      },
      blobWriterHandle
    );
    let revocRegDefRequest = await sdk.buildRevocRegDefRequest(this.endpointDid, revocRegDef);
    return multiSignRequest(revocRegDefRequest);
    //await signAndSubmitRequest(revocRegDefRequest);
    //add revocRegDefId and tailsWriterConfig to registry contract using this.blockchainClient after submission
  }

  /**
   * Send a credential offer to a specified DID
   * @param {string} toDid
   * @param {string} credDefId
   * @returns {object}
   */
  async sendCredOffer(toDid, credDefId) {
    let credOffer = await sdk.issuerCreateCredentialOffer(this.walletHandle, credDefId);
    await Store.pendingCredentialOffers.write(credOffer);
    let message = await Crypto.buildAuthcryptedMessage(
      this.walletHandle,
      this.endpointDid,
      toDid,
      MESSAGE_TYPES.OFFER,
      credOffer
    );
    return sendAnonCryptedMessage(toDid, message);
  }

  async sendAnonCryptedMessage(toDid, message) {
    message = JSON.stringify(message);
    let getAttrRequest = await sdk.buildGetAttribRequest(this.endpointDid, toDid, 'endpoint', null, null);
    let res = await waitUntilApplied(this.poolHandle, getAttrRequest, data => data['result']['data'] != null);
    let endpoint = JSON.parse(res.result.data).endpoint.ha;
    let encryptedMessage = await Crypto.anonCrypt(this.poolHandle, this.walletHandle, toDid, message);
    //send encryptedMessage using fedcom?
  }

  async waitUntilApplied(ph, req, cond) {
    for (let i = 0; i < 3; i++) {
      let res = await sdk.submitRequest(ph, req);

      if (cond(res)) {
        return res;
      }

      await sleep.sleep(5 * 1000);
    }
  }

  /**
   * Send a credential to a specified DID
   * @param {string} toDid
   * @param {object} message
   * @param {object} credValues
   * @returns {object}
   */
  async sendCredential(toDid, encryptedMessage, credentialValues) {
    let credentialRequest = await Crypto.authDecrypt(this.walletHandle, this.endpointDid, encryptedMessage);
    let getCredDefRequest = await sdk.buildGetCredDefRequest(this.endpointDid, credentialRequest.cred_def_id);
    let getCredDefResponse = await submitRequest(getCredDefRequest);
    let [, credDef] = await sdk.parseGetCredDefResponse(getCredDefResponse);

    let credentialOffer;
    let pendingCredOfferId;
    let pendingCredOffers = Store.pendingCredentialOffers.getAll();
    for (let pendingCredOffer of pendingCredOffers) {
      if (pendingCredOffer.offer.cred_def_id === credDef.id) {
        pendingCredOfferId = pendingCredOffer.id;
        credentialOffer = pendingCredOffer.offer;
      }
    }
    //TODO get and lock the blobReader's tailsWriterConfig from registry contract
    //TODO get revocRegDefId from registry contract
    let blobReaderHandle = await sdk.openBlobStorageReader('default', tailsWriterConfig);

    let [credential, revocId, revocDelta] = await sdk.issuerCreateCredential(
      this.walletHandle,
      credentialOffer,
      credentialRequest,
      credentialValues,
      revocRegDefId,
      blobReaderHandle
    );
    let message = await Crypto.buildAuthcryptedMessage(this.endpointDid, toDid, MESSAGE_TYPES.CREDENTIAL, credential);
    await Crypto.sendAnonCryptedMessage(theirEndpointDid, message);
    Store.pendingCredentialOffers.delete(pendingCredOfferId);
    //store credential to the registry contract associated with blobReaderHandle, revocId and revocDelta
  }

  /**
   * Revoke a credentail already issued
   * @param {string} credential
   * @returns {object}
   */
  async revokeCredential(credential) {
    //TODO get, from registry contract, blobReaderHandle, revocId and revocDelta associated to credential
    //TODO get get revocRegDefId from registry contract
    let revokedDelta = await sdk.issuerRevokeCredential(this.walletHandle, blobReaderHandle, revocRegDefId, revocId);
    let mergedDelta = await sdk.issuerMergeRevocationRegistryDeltas(revocDelta, revokedDelta);
    let entryRequest = await sdk.buildRevocRegEntryRequest(this.endpointDid, revocRegDefId, 'CL_ACCUM', mergedDelta);
    await signAndSubmitRequest(entryRequest); //TODO consider Multisig if needed
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

module.exports = IdentityManager;
