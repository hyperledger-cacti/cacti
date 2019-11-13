/**
 * @module quorum/api/assets
 */

const rootWrapper = require('../../wrappers/root.wrapper');
const logger = require('../../utils/logger')('assets.controller');

/**
 * Get asset
 * @property {string} req.params.assetId - The Asset ID.
 * @returns {Asset}
 */
async function getAsset(req, res) {
  logger.log('debug', 'getAsset - start %s', req.params.assetId);

  const asset = await rootWrapper.getAsset(req.params.assetId);

  logger.log('debug', 'getAsset - end %j', asset);
  return res.json(asset);
}

/**
 * Create Asset
 * @property {string} req.body.assetId - The Asset ID.
 * @property {array} req.body.origin - The Origin array.
 * @property {object} req.body.properties - The Asset Properties.
 * @returns {Asset}
 */
async function createAsset(req, res) {
  logger.log('debug', 'createAsset - start %j', req.body);

  const { assetId, origin, properties } = req.body;
  await rootWrapper.createAsset(assetId, origin, properties);
  const asset = await rootWrapper.getAsset(assetId);

  logger.log('debug', 'createAsset - end %j', asset);
  return res.json(asset);
}

/**
 * Lock Asset
 * @property {string} req.params.assetId - The Asset ID.
 * @property {string} req.body.targetDLTId - The Target DLT Id.
 * @property {string} req.body.receiverPubKey - The Receiver Public Key.
 * @returns {Asset}
 */
async function lockAsset(req, res) {
  logger.log('debug', 'lockAsset - start %j', req.body);

  const { targetDLTId, receiverPubKey } = req.body;
  const { assetId } = req.params;
  await rootWrapper.lockAsset(assetId, targetDLTId, receiverPubKey);
  const asset = await rootWrapper.getAsset(assetId);

  logger.log('debug', 'lockAsset - end %j', asset);
  return res.json(asset);
}

/**
 * Set Asset Property
 * @property {string} req.params.assetId - The Asset ID.
 * @property {string} req.body.name - The Property Name.
 * @property {string} req.body.value - The Property Value.
 * @returns {Asset}
 */
async function setProperty(req, res) {
  logger.log('debug', 'setProperty - start %j', req.body);

  const { name, value } = req.body;
  const { assetId } = req.params;
  await rootWrapper.setProperty(assetId, name, value);
  const asset = await rootWrapper.getAsset(assetId);

  logger.log('debug', 'setProperty - end %j', asset);
  return res.json(asset);
}

module.exports = { getAsset, createAsset, lockAsset, setProperty };
