const rp = require(`request-promise-native`);

const Connector = require(`../Connector`);

class ConnectorFabric extends Connector {
  checkUserName() {
    if (!this.options.username) {
      throw new ReferenceError(`option "username" is required`);
    }
    if (typeof this.options.username !== `string`) {
      throw new TypeError(`invalid username provided: ${this.options.username}`);
    }
  }

  checkOrgName() {
    if (!this.options.orgName) {
      throw new ReferenceError(`option "orgName" is required`);
    }
    if (typeof this.options.orgName !== `string`) {
      throw new TypeError(`invalid orgName provided: ${this.options.orgName}`);
    }
  }

  checkPeerName() {
    if (!this.options.peerName) {
      throw new ReferenceError(`option "peerName" is required`);
    }
    if (typeof this.options.peerName !== `string`) {
      throw new TypeError(`invalid peerName provided: ${this.options.peerName}`);
    }
  }

  checkParam() {
    super.checkParam();
    this.checkUserName();
    this.checkOrgName();
    this.checkPeerName();
  }

  /**
   * Request Blockchain API access token
   * @returns {string} - Token
   */
  async getAccessToken() {
    try {
      this.checkUrl();
      this.checkUserName();
      this.checkOrgName();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/users`,
        form: { username: this.options.username, orgName: this.options.orgName },
        json: true,
      });
      if (!res.success) {
        // REFAC standardise outputs
        throw new Error(JSON.stringify(res));
      }
      return res.token;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Add the public key of a foreign validator in the Fabric ledger
   * @param {string} pubKey
   * @param {string} name
   */
  async addForeignValidator(pubKey, name) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: { bearer: token },
        body: {
          fcn: `addPubKey`,
          args: [pubKey, name],
        },
        json: true,
      });
      if (!res.success) {
        // REFAC standardise outputs
        throw new Error(JSON.stringify(res));
      }
      return res.message;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Verify that a message matches a specific (signature, pubKey) tupple
   * pubKey should match a registered foreignValidator in the Fabric ledger
   * @param {string} message
   * @param {string} pubKey
   * @param {string} signature
   * @return {boolean}
   */
  async verifySignature(message, pubKey, signature) {
    try {
      this.checkPeerName(); // checking query parameter before calling the API
      const token = await this.getAccessToken();
      const res = await rp({
        method: `GET`,
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: { bearer: token },
        qs: {
          peer: this.options.peerName,
          fcn: `verify`,
          args: JSON.stringify([message, pubKey, signature]),
        },
        json: true,
      });
      if (res.includes(`Error`) || !(res instanceof Array)) {
        throw new Error(res);
      }
      return res[0]; // REFAC standardise output
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Verify multiple signatures against registered foreignValidators in the Fabric ledger
   * @param {multisig} multisig
   */
  async verifyMultisig(multisig) {
    try {
      this.checkPeerName(); // checking query parameter before calling the API
      if (!multisig.msg) {
        throw new ReferenceError(`Multisig message required to verify commitments`);
      }
      const token = await this.getAccessToken();
      const pubKeys = Object.keys(multisig.signatures);
      const signedMessages = Object.values(multisig.signatures);
      const args = [multisig.msg];
      for (let i = 0; i < pubKeys.length; i += 1) {
        args.push(pubKeys[i]);
        args.push(signedMessages[i]);
      }
      const res = await rp({
        method: `GET`,
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: { bearer: token },
        qs: {
          peer: this.options.peerName,
          fcn: `verify`,
          args: JSON.stringify(args),
        },
        json: true,
      });
      if (res.includes(`Error`) || !(res instanceof Array)) {
        throw new Error(res);
      }
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Creating a copy of the exported asset in the Fabric ledger
   * @param {multisig} multisig
   * @return {result} result - Create info response.
   */
  async copyAsset(multisig) {
    try {
      this.checkPeerName(); // checking query parameter before calling the API
      if (!multisig.msg) {
        throw new ReferenceError(`Multisig message required to verify commitments`);
      }
      const token = await this.getAccessToken();
      const pubKeys = Object.keys(multisig.signatures);
      const signedMessages = Object.values(multisig.signatures);
      const args = [String(multisig.numGood || signedMessages.length), multisig.msg];
      for (let i = 0; i < pubKeys.length; i += 1) {
        args.push(pubKeys[i]);
        args.push(signedMessages[i]);
      }
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: { bearer: token },
        body: {
          fcn: `verifyAndCreate`,
          args,
        },
        json: true,
      });
      if (!res.success) {
        // REFAC standardise outputs
        throw new Error(JSON.stringify(res));
      }
      return res.message;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = ConnectorFabric;
