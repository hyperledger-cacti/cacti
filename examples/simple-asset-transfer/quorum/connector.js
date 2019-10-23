const rp = require(`request-promise-native`);

const { Connector } = require(`@hyperledger/blockchain-integration-framework`);

class MyQuorumConnector extends Connector.QUORUM {
  /**
   * Create Asset
   * @param {object} asset - The Asset.
   */
  async createAsset(asset) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/assets`,
        auth: {
          bearer: token,
        },
        form: asset,
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Lock Asset
   * @param {string} assetId - The Asset ID.
   * @param {string} targetDLTId - The Target DLT ID.
   * @param {string} receiverPubKey - The Receiver Public Key.
   */
  async lockAsset(assetId, targetDLTId, receiverPubKey) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/assets/${assetId}`,
        auth: {
          bearer: token,
        },
        form: {
          targetDLTId,
          receiverPubKey,
        },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Set Asset Property
   * @param {string} assetId - The Asset ID.
   * @param {string} name - The Property Name.
   * @param {string} value - The Property Value.
   */
  async setProperty(assetId, name, value) {
    try {
      const token = await this.getAccessToken();
      const res = rp({
        method: `PUT`,
        uri: `${this.options.url}/api/v1/assets/${assetId}`,
        auth: {
          bearer: token,
        },
        form: {
          name,
          value,
        },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get asset
   * @param {string} assetId - The Asset ID.
   */
  async getAsset(assetId) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `GET`,
        uri: `${this.options.url}/api/v1/assets/${assetId}`,
        auth: {
          bearer: token,
        },
        json: true,
      });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = MyQuorumConnector;
