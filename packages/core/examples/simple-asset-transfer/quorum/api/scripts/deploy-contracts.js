const Artifactor = require('truffle-artifactor');
const contracts = require('../utils/contracts');
const config = require('../config/config');
const logger = require('../utils/logger')('deployContracts');

async function deployRoot() {
  const rootBuild = contracts.getBuild('Root');
  const rootContract = contracts.getContract('Root');
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
    await deployRoot();
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
