const contracts = require('../utils/contracts');
const web3 = require('../utils/web3');
const logger = require('../utils/logger')('rootWrapper');

const rootContract = contracts.getContract('Root');

async function getAsset(assetId) {
  logger.log('debug', 'getAsset assetId: %s', assetId);

  const assetData = await rootContract.methods.getAsset(assetId).call();
  const asset = {
    assetId,
    dltID: assetData.dltID,
    origin: JSON.parse(assetData.origins),
    property1: assetData.property1,
    property2: assetData.property2,
    locked: assetData.locked,
    targetDltId: assetData.targetDltId,
    receiverPK: assetData.receiverPK,
  };

  logger.log('debug', 'getAsset: %j', asset);
  return asset;
}

async function createAsset(assetId, origin, properties) {
  logger.log('debug', 'createAsset: %s %j %j', assetId, origin, properties);

  const { property1, property2 } = properties;
  const originString = JSON.stringify(origin);
  const receipt = await rootContract.methods.createAsset(assetId, originString, property1, property2).send({
    from: web3.eth.defaultAccount,
    gas: 3000000,
  });

  logger.log('debug', 'createAsset receipt %j', receipt);
  return receipt;
}

async function lockAsset(assetId, targetDltId, receiverPK) {
  logger.log('debug', 'lockAsset: %s %s %s', assetId, targetDltId, receiverPK);
  const receipt = await rootContract.methods.lockAsset(assetId, targetDltId, receiverPK).send({
    from: web3.eth.defaultAccount,
    gas: 3000000,
  });
  logger.log('debug', 'lockAsset receipt %j', receipt);
  return receipt;
}

async function setProperty(assetId, propertyName, propertyValue) {
  logger.log('debug', 'setProperty: %s %s %s', assetId, propertyName, propertyValue);
  const receipt = await rootContract.methods.setProperty(assetId, propertyName, propertyValue).send({
    from: web3.eth.defaultAccount,
    gas: 3000000,
  });
  logger.log('debug', 'setProperty receipt %j', receipt);
  return receipt;
}

module.exports = {
  getAsset,
  createAsset,
  lockAsset,
  setProperty,
};
