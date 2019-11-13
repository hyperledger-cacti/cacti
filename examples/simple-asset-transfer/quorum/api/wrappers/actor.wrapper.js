const utils = require('../utils');
const contracts = require('../utils/contracts');
const web3 = require('../utils/web3');
const logger = require('../utils/logger')('actorWrapper');

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
  const receipt = await rootContract.methods
    .registerActor(name, constKey, ethAddress, ActorTypes[type], host, port)
    .send({
      from: web3.eth.defaultAccount,
      gas: 3000000,
    });
  logger.log('debug', 'registerActor receipt %j', receipt);
  return receipt;
}

async function removeActor(actorAddress) {
  logger.log('debug', 'removeActor actorAddress: %s', actorAddress);
  const receipt = await rootContract.methods.removeActor(actorAddress).send({
    from: web3.eth.defaultAccount,
    gas: 300000000,
  });
  logger.log('debug', 'removeActor: %j', receipt);
  return receipt;
}

async function getActorDetails(actorAddress) {
  logger.log('debug', 'getActorDetails actorAddress: %s', actorAddress);
  const actorContract = contracts.newContract('Actor', actorAddress);
  const actorDetails = await actorContract.methods.getActorDetails().call();
  const res = {
    address: actorAddress,
    name: actorDetails[0],
    constKey: actorDetails[1],
    ethAddress: actorDetails[2],
    type: Object.keys(ActorTypes)[Number(actorDetails[3])],
    host: actorDetails[4],
    port: Number(actorDetails[5]),
    dataRef: actorDetails[6],
  };
  res.messagingUrl = `http://${res.host}:${res.port}/api/v1/messages`; // TODO: remove from here
  logger.log('debug', 'getActorDetails: %j', res);
  return res;
}

async function getAllActors() {
  return rootContract.methods.getAllActors().call();
}

async function getMyActor() {
  return rootContract.methods.getMyActor().call();
}

async function ethToActor(ethAddress) {
  return rootContract.methods.ethToActor(ethAddress).call();
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
  const re = /^(0x)?[0-9A-Fa-f]{130}$/;
  if (signature.match(re) == null) {
    logger.log('warn', 'Signature %s does not fit the format %s', signature, re);
    return Array(130).fill('0').join('');
  }
  return signature.startsWith('0x') ? signature.substr(2) : signature;
}

async function verify(message, signatures = []) {
  const signs = signatures.map(checkAndTrim).join('');
  return rootContract.methods.verify(message, `0x${signs}`).call();
}

async function verifyAndCreate(message, signatures = [], minGood) {
  const signs = signatures.map(checkAndTrim).join('');
  return rootContract.methods.verifyAndCreate(message, `0x${signs}`, minGood).send({
    from: web3.eth.defaultAccount,
    gas: 300000000,
  });
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
  verifyAndCreate
};
