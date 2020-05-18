const rp = require(`request-promise-native`);

const { Connector } = require(`@hyperledger-labs/blockchain-integration-framework`);

class MyCordaConnector extends Connector.CORDA {
  static formatAsset(asset, targetDLTType) {
    switch (targetDLTType) {
      case 'FABRIC':
        return {
          asset_id: asset.assetId,
          dltId: asset.dltID,
          origin: asset.origin.map(item => ({
            origin_dlt_id: `DLT100`,
            origin_asset_id: `Asset_DLT100_1`,
          })),
          properties: {
            property1: asset.property1,
            property2: asset.property2,
          },
          locked: asset.locked,
          targetDltId: asset.targetDltId,
          receiverPk: asset.receiverPK,
        };
      default:
        return asset;
    }
  }

  /**
   * Create Asset
   * @param {object} asset - The Asset.
   */
  async createAsset(asset) {
    try {
      const token = await this.getAccessToken();
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/api/v1/asset/create`,
        auth: {
          bearer: token,
        },
        body: {
          ...asset,
          async: false
        },
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
        uri: `${this.options.url}/api/v1/asset/lock`,
        auth: {
          bearer: token,
        },
        body: {
          targetDLTId,
          receiverPubKey,
          assetId,
          async: false
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
  // async setProperty(assetId, name, value) {
  //   try {
  //     const token = await this.getAccessToken();
  //     const res = rp({
  //       method: `PUT`,
  //       uri: `${this.options.url}/api/v1/assets/${assetId}`,
  //       auth: {
  //         bearer: token,
  //       },
  //       form: {
  //         name,
  //         value,
  //       },
  //       json: true,
  //     });
  //     return res;
  //   } catch (error) {
  //     return Promise.reject(error);
  //   }
  // }

  /**
   * Get asset
   * @param {string} assetId - The Asset ID.
   */
  async getAsset(assetId, targetDLTType = '') {
    try {
      const token = await this.getAccessToken();
      const asset = await rp({
        method: `GET`,
        uri: `${this.options.url}/api/v1/asset/${assetId}`,
        auth: {
          bearer: token,
        },
        json: true,
      });
      return MyCordaConnector.formatAsset(asset, targetDLTType);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = MyCordaConnector;
