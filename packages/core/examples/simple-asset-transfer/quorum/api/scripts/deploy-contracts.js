const Artifactor = require('truffle-artifactor');
const contracts = require('../utils/contracts');
const config = require('../config/config');
const logger = require('../utils/logger')('deployContracts');
const web3Http = require('../utils/web3-http');

async function deployRoot() {
  const rootBuild = contracts.getBuild('Root');
  const rootContract = contracts.getContract('Root', undefined, web3Http);
  const contract = await contracts.newPublicContract(rootContract);
  rootBuild.networks = { address: contract.options.address };

  const artifactor = new Artifactor(config.solidity.buildFolder);
  await artifactor
    .save(rootBuild, `${config.solidity.buildFolder}${rootBuild.contractName}`)
    .catch(error => logger.log('error', 'Contract artifacts saving failed: %s', error));

  logger.log('info', 'Root Deployed %s', rootBuild.networks.address);
}

module.exports = (async () => {
  try {
    // We need a re-try mechanism to be more resilient against race conditions that come up on stronger hardware
    const maxTries = 5;
    const delayBetweenTries = 15000;
    let tryCount = 1;
    let notSuccessful = true;
    while (tryCount <= maxTries && notSuccessful) {
      logger.info(`Attempting to deploy contracts: #${tryCount}...`);
      try {
        // eslint-disable-next-line no-await-in-loop
        await deployRoot();
        notSuccessful = false;
      } catch (ex) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, delayBetweenTries));
        logger.info(`Attempt #${tryCount} to deploy contract failed`, ex);
      }
      tryCount += 1;
    }
    if (notSuccessful) {
      throw new Error(`Failed to deploy contracts after ${maxTries} attempts. See logs above for details.`);
    }
    if (config.env !== 'test') {
      /* Forcibly exit the process as we suspect that web3.js may leave dangling
        open network connections that prevent normal exit. */
      logger.log('info', 'All done, exiting...');
      process.exit();
    }
  } catch (error) {
    logger.log('error', 'deployContracts was not finished: %s', error);
  }
})();
