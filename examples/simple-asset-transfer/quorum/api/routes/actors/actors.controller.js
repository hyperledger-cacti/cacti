/**
 * @module quorum/api/actors
 */

const actorWrapper = require('../../wrappers/actor.wrapper');
const { pubKeyToEthAddress } = require('../../utils');
const contracts = require('../../utils/contracts');
const logger = require('../../utils/logger')('actors-controller');

/**
 * Register Actor
 * @property {string} req.body.name - The Actor Name.
 * @returns {Actor}
 */
async function registerActor(req, res) {
  const { name, type, constKey = '', pubKey, host = '', port = 0 } = req.body;
  logger.log('debug', 'registerActor - start %s %s %s %s %s %s', name, type, constKey, pubKey, host, port);
  const ethAddress = pubKeyToEthAddress(pubKey);
  await actorWrapper.registerActor({ name, type, constKey, ethAddress, host, port });
  logger.log('debug', 'registerActor - end ');
  res.status(200).send({ name, type, pubKey, ethAddress });
}

async function getActorDetails(req, res) {
  const { actorAddress } = req.params;
  logger.log('debug', 'getActorDetails - start %j', actorAddress);
  const actorDetails = await actorWrapper.getActorDetails(actorAddress);
  logger.log('debug', 'getActorDetails - end: %j', actorDetails);
  res.status(200).send(actorDetails);
}

async function getAllActors(req, res) {
  logger.log('debug', 'getAllActors - start');
  const actorsAddresses = await actorWrapper.getAllActors();
  logger.log('debug', 'getAllActors - end: %j', actorsAddresses);
  res.status(200).send(actorsAddresses);
}

async function getAllActorsDetails(req, res) {
  logger.log('debug', 'getAllActorsDetails - start');
  const actors = await actorWrapper.getAllActors();
  const actorsDetails = await Promise.all(
    actors.map(async actor => ({
      ...(await actorWrapper.getActorDetails(actor)),
    }))
  );
  logger.log('debug', 'getAllActorsDetails - end: %j', actorsDetails);
  res.status(200).send(actorsDetails.filter(actor => actor.actorType !== '3')); // TODO
}

/**
 * Verify
 * @property {string} req.body.message - Message hash.
 * @property {array} req.body.signatures - The array of signatures.
 * @returns {Boolean}
 */
async function verify(req, res) {
  logger.log('debug', 'verify - start %j', req.body);

  const { message, signatures } = req.body;
  const result = await actorWrapper.verify(message, signatures);

  logger.log('debug', 'verify - end %s', result);
  return res.json(result);
}

/**
 * Verify and Create Asset
 * @property {string} req.body.message - Message hash.
 * @property {array} req.body.signatures - The array of signatures.
 * @property {number} req.body.minGood - Minimum number of good signatures.
 * @returns {Boolean}
 */
async function verifyAndCreate(req, res) {
  logger.log('debug', 'verifyAndCreate - start %j', req.body);

  const { message, signatures, minGood } = req.body;
  const result = await actorWrapper.verifyAndCreate(message, signatures, minGood || signatures.length);

  logger.log('debug', 'verifyAndCreate - end %s', result);
  return res.json(result);
}

module.exports = {
  registerActor,
  getActorDetails,
  getAllActors,
  getAllActorsDetails,
  verify,
  verifyAndCreate,
};
