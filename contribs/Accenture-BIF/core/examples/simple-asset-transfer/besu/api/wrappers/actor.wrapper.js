const utils = require('../utils');
const contracts = require('../utils/contracts');
const logger = require('../utils/logger')('actorWrapper');
const rlp = require('rlp');

const rootContract = contracts.getContract('Root');

const ActorTypes = {
  PARTICIPANT: 0,
  VALIDATOR: 1,
  FOREIGN_VALIDATOR: 2,
};

async function registerActor({ name, type, constKey, ethAddress, host, port }) {
  logger.log(
    'debug',
    'registerActor actorName: %s %s %s %s %s %s',
    name,
    ActorTypes[type],
    constKey,
    ethAddress,
    host,
    port
  );

  const receipt = await contracts.callMethod('Root', 'registerActor', [
    name,
    constKey,
    ethAddress,
    ActorTypes[type],
    host,
    port,
  ]);

  return receipt;
}

async function removeActor(actorAddress) {
  logger.log('debug', 'removeActor actorAddress: %s', actorAddress);
  const { receipt, output } = await contracts.callMethod('Root', 'removeActor', [actorAddress]);

  return output;
}

async function getActorDetails(actorAddress) {
  logger.log('debug', 'getActorDetails actorAddress: %s', actorAddress);
  contracts.newContract('Actor', actorAddress);
  const { receipt, output } = await contracts.callMethod('Actor', 'getActorDetails', []);
  const res = {
    address: actorAddress,
    name: output[0],
    constKey: output[1],
    ethAddress: output[2],
    type: Object.keys(ActorTypes)[Number(output[3])],
    host: output[4],
    port: Number(output[5]),
    dataRef: output[6],
  };
  res.messagingUrl = `http://${res.host}:${res.port}/api/v1/messages`; // TODO: remove from here
  logger.log('debug', 'getActorDetails: %j', res);
  return res;
}

async function getAllActors() {
  const { receipt, output } = await contracts.callMethod('Root', 'getAllActors', []);
  return output;
}

async function getMyActor() {
  const { receipt, output } = await contracts.callMethod('Root', 'getMyActor', []);
  return output;
}

async function ethToActor(ethAddress) {
  const { receipt, output } = await contracts.callMethod('Root', 'ethToActor', [ethAddress]);
  return output;
}

async function getActorDetailsByKey(actorEthKey) {
  const actorAddress = await ethToActor(actorEthKey);
  return getActorDetails(actorAddress);
}

async function getAllActorsDetails() {
  const actors = await getAllActors();
  return Promise.all(actors.map(async actor => getActorDetails(actor)));
}

async function getActorNameToDetailsMapping() {
  return utils.makeIndex(await getAllActorsDetails(), actor => actor.actorName);
}

async function getActorAddressToNameMapping() {
  return utils.makeIndex(
    await getAllActorsDetails(),
    actor => actor.actorEthAddress.toLowerCase(),
    actor => actor.actorName
  );
}

async function getMyActorDetails() {
  return getActorDetails(await getMyActor());
}

function checkAndTrim(signature) {
  signature = signature.startsWith('0x') ? signature.substr(2) : signature;

  // const versionMissing = /^[0-9A-Fa-f]{128}$/;
  // if (signature.match(versionMissing) == null) {
  //   logger.log('warn', 'Signature %s missing version, defaulting to 27', signature);
  //   return signature + '27';
  // }

  const re = /^[0-9A-Fa-f]{130}$/;
  if (signature.match(re) == null) {
    logger.log('warn', 'Signature %s does not fit the format %s', signature, re);
    return Array(130)
      .fill('0')
      .join('');
  }
  return signature;
}

async function verify(message, signatures = []) {
  const signs = signatures.map(checkAndTrim).join('');
  const { receipt, output } = await contracts.callMethod('Root', 'verify', [message, `0x${signs}`]);
  return output;
}

async function verifyAndCreate(message, signatures = [], minGood) {
  const signs = signatures.map(checkAndTrim).join('');
  const { receipt, output } = await contracts.callMethod('Root', 'verifyAndCreate', [message, `0x${signs}`, minGood]);
  return output;
}

module.exports = {
  registerActor,
  removeActor,
  getActorDetails,
  getAllActors,
  getMyActor,
  ethToActor,
  getActorDetailsByKey,
  getAllActorsDetails,
  getActorNameToDetailsMapping,
  getActorAddressToNameMapping,
  getMyActorDetails,
  verify,
  verifyAndCreate,
};
