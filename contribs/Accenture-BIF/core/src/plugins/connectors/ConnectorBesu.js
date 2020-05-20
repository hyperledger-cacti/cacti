const rp = require(`request-promise-native`);

const Connector = require(`../Connector`);

class ConnectorBesu extends Connector {
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
        form: { username: this.options.username, password: this.options.password },
        json: true,
      });
      return res.token;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Add the public key of a foreign validator in the Besu ledger
   * @param {string} pubKey
   * @param {string} name
   */
  async addForeignValidator(pubKey, name) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/actors`,
        auth: { bearer: token },
        form: { name, pubKey },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Verify that a message matches a specific (signature, pubKey) tupple
   * pubKey should match a registered foreignValidator in the Besu ledger
   * @param {string} message
   * @param {string} signature
   */
  async verifySignature(message, signature) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/actors/verify`,
        auth: { bearer: token },
        form: { message, signatures: [signature] },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Verify multiple signatures against registered foreignValidators in the Besu ledger
   * @param {multisig} multisig
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
        form: { message, signatures },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Creating a copy of the exported asset in the Besu ledger
   * @param {multisig} multisig
   * @return {result} result - Create info response.
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
        form: { message, signatures, minGood: signatures.length },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = ConnectorBesu;
