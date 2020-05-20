const rp = require(`request-promise-native`);

const Connector = require(`../Connector`);

class ConnectorCorda extends Connector {
  checkUserName() {
    if (!this.options.username) {
      throw new ReferenceError(`option "username" is required`);
    }
    if (typeof this.options.username !== `string`) {
      throw new TypeError(`invalid username provided: ${this.options.username}`);
    }
  }

  checkPassword() {
    if (!this.options.password) {
      throw new ReferenceError(`option "password" is required`);
    }
    if (typeof this.options.password !== `string`) {
      throw new TypeError(`invalid password provided: ${this.options.password}`);
    }
  }

  checkParam() {
    super.checkParam();
    this.checkPassword();
    this.checkUserName();
  }

  /**
   * Request Blockchain API access token
   * @returns {string} - Token
   */
  async getAccessToken() {
    try {
      this.checkUrl();
      this.checkUserName();
      this.checkPassword();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/auth/login`,
        body: { username: this.options.username, password: this.options.password },
        json: true,
      });
      return res.token;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Add the public key of a foreign validator in the Corda ledger
   * @param {string} pubKey
   * @param {string} name
   */
  async addForeignValidator(pubKey, name, type = 'FOREIGN_VALIDATOR') {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/actors/create`,
        auth: { bearer: token },
        body: {
          name,
          pubKey,
          type,
          async: false,
        },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Verify that a message matches a specific (signature, pubKey) tupple
   * pubKey should match a registered foreignValidator in the Corda ledger
   * @param {string} message
   * @param {string} signature
   * @return {object} { message: string, signatures: string[], verify: boolean[], verifyStateRef: string? }
   */
  async verifySignature(message, signature) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/actors/verify`,
        auth: { bearer: token },
        body: { message, signatures: [signature] },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Verify multiple signatures against registered foreignValidators in the Corda ledger
   * @param {multisig} multisig
   * @return {object} { message: string, signatures: string[], verify: boolean[], verifyStateRef: string? }
   *
   *  message: message from request
   *  signatures: signatures from request
   *  verify: result of verification
   *  verifyStateRef: reference to VerifyState or null if verification failed
   */
  async verifyMultisig(multisig) {
    if (!multisig.msg) {
      throw new ReferenceError(`Multisig message required to verify commitments`);
    }
    const token = await this.getAccessToken();
    const message = multisig.msg;
    const signatures = Object.values(multisig.signatures);
    try {
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/actors/verify`,
        auth: { bearer: token },
        body: { message, signatures },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Creating a copy of the exported asset in the Corda ledger
   * @param {multisig} multisig
   * @return {object}
   *  { message: string, signatures: string[], verify: boolean[], verifyStateRef: string?, transactionHash: string? }
   *
   *  message        : message from request
   *  signatures     : signatures from request
   *  verify         : result of verification
   *  verifyStateRef : reference to VerifyState or null if verification failed
   *  transactionHash: Id of the transaction that created the new asset, or null if verification or creation failed
   */
  async copyAsset(multisig) {
    if (!multisig.msg) {
      throw new ReferenceError(`Multisig message required to verify commitments`);
    }
    const message = multisig.msg;
    const signatures = Object.values(multisig.signatures);
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/actors/verify-and-create`,
        auth: { bearer: token },
        body: { message, signatures },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = ConnectorCorda;
