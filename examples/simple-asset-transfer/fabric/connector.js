const rp = require(`request-promise-native`);
const { Connector } = require(`@hyperledger-labs/blockchain-integration-framework`);

class MyFabricConnector extends Connector.FABRIC {
  static snakeToCamel(str) {
    return str.replace(/(_\w)/g, m => m[1].toUpperCase());
  }

  static objectKeysSnakeToCamel(obj) {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = MyFabricConnector.snakeToCamel(key);
      const value = obj[key];
      const isArray = Array.isArray(value);
      acc[newKey] = isArray ? value.map(item => MyFabricConnector.objectKeysSnakeToCamel(item)) : value;
      return acc;
    }, {});
  }

  static omitDeep(obj, omitKey) {
    return Object.keys(obj).reduce(
      (acc, key) => {
        if (key === omitKey) return acc;
        acc[key] = obj[key];
        return acc;
      },
      { ...obj[omitKey] }
    );
  }

  static renameKeysByMap(obj, map) {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = map[key] || key;
      const value = obj[key];
      const isArray = Array.isArray(value);
      acc[newKey] = isArray ? value.map(item => MyFabricConnector.renameKeysByMap(item, map)) : value;
      return acc;
    }, {});
  }

  static standardizeAssetOutput(asset) {
    const camelAsset = MyFabricConnector.objectKeysSnakeToCamel(asset);
    const deepOmitedAsset = MyFabricConnector.omitDeep(camelAsset, 'properties');
    return MyFabricConnector.renameKeysByMap(deepOmitedAsset, {
      dltId: 'dltID',
      originDltId: 'originDLTId',
      receiverPk: 'receiverPK',
    });
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
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: {
          bearer: token,
        },
        body: {
          fcn: `createAsset`,
          args: [JSON.stringify(asset)],
        },
        json: true,
      });
      if (typeof res !== `object` || res.success === false) {
        // REFAC standardise outputs
        throw new Error(JSON.stringify(res));
      }
      const createdAsset = await this.getAsset(asset.asset_id);
      return createdAsset;
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
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: {
          bearer: token,
        },
        body: {
          fcn: `lockAsset`,
          args: [assetId, targetDLTId, receiverPubKey],
        },
        json: true,
      });
      if (typeof res !== `object` || res.success === false) {
        // REFAC standardise outputs
        throw new Error(JSON.stringify(res));
      }

      const lockedAsset = await this.getAsset(assetId);
      return lockedAsset;
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
      const res = await rp({
        method: `POST`,
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: {
          bearer: token,
        },
        body: {
          fcn: `setProperty`,
          args: [assetId, name, value],
        },
        json: true,
      });

      if (typeof res !== `object` || res.success === false) {
        throw new Error(JSON.stringify(res));
      }
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
      this.checkPeerName(); // checking query parameter before calling the API
      const token = await this.getAccessToken();
      const res = await rp({
        method: `GET`,
        uri: `${this.options.url}/channels/mychannel/chaincodes/mycc`,
        auth: {
          bearer: token,
        },
        qs: {
          peer: this.options.peerName,
          fcn: `query`,
          args: JSON.stringify([assetId]), // TOTEST
        },
        json: true,
      });
      if (typeof res === `string` && res.includes(`Error`)) {
        throw new Error(res);
      }
      return MyFabricConnector.standardizeAssetOutput(res);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = MyFabricConnector;
