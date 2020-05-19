const contracts = require('../utils/contracts');
const logger = require('../utils/logger')('rootWrapper');

async function getAsset(assetId) {
  logger.log('debug', 'getAsset assetId: %s', assetId);

  const { receipt, output } = await contracts.callMethod('Root', 'getAsset', [assetId]);
  const asset = {
    assetId,
    dltID: output.dltID,
    origin: JSON.parse(output.origins),
    property1: output.property1,
    property2: output.property2,
    locked: output.locked,
    targetDltId: output.targetDltId,
    receiverPK: output.receiverPK,
  };

  logger.log('debug', 'getAsset: %j', asset);
  return asset;
}

async function createAsset(assetId, origin, properties) {
  logger.log('debug', 'createAsset: %s %j %j', assetId, origin, properties);

  const { property1, property2 } = properties;
  const originString = JSON.stringify(origin);
  const { receipt, output } = await contracts.callMethod('Root', 'createAsset', [
    assetId,
    originString,
    property1,
    property2,
  ]);

  logger.log('debug', 'createAsset receipt %j', receipt);
  logger.log('debug', 'createAsset output %j', output);
  return output;
}

async function lockAsset(assetId, targetDltId, receiverPK) {
  logger.log('debug', 'lockAsset: %s %s %s', assetId, targetDltId, receiverPK);
  const { receipt, output } = await contracts.callMethod('Root', 'lockAsset', [assetId, targetDltId, receiverPK]);
  logger.log('debug', 'lockAsset receipt %j', receipt);
  return output;
}

async function setProperty(assetId, propertyName, propertyValue) {
  logger.log('debug', 'setProperty: %s %s %s', assetId, propertyName, propertyValue);
  const { receipt, output } = await contracts.callMethod('Root', 'setProperty', [assetId, propertyName, propertyValue]);
  return output;
}

module.exports = {
  getAsset,
  createAsset,
  lockAsset,
  setProperty,
};
