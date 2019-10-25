const log4js = require(`log4js`);
const ConnectorQuorum = require(`../quorum/connector.js`);
const ConnectorFabric = require(`../fabric/connector.js`);
const Client = require(`@hyperledger/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`share-public-keys`);
logger.level = `info`;
const connectorQuorum = new ConnectorQuorum(conf.blockchains.quorum);
const connectorFabric = new ConnectorFabric(conf.blockchains.fabric);

(async () => {
  try {
    // Step.1: Ask for Quorum public keys
    const askForQuorumPubKeyRequests = conf.federations.quorum.map(endpoint =>
      Client.askForPubKey(endpoint)
    );
    const quorumPubKeys = await Promise.all(askForQuorumPubKeyRequests);
    logger.info(`Foreign Public Keys has been received`, { quorumPubKeys });

    // Step.2 Add Quorum public keys to Fabric network
    const quorumValidators = await quorumPubKeys.reduce(
      (acc, currentKey, index) =>
        acc.then(() => connectorFabric.addForeignValidator(currentKey, `quorum_validator_${index + 1}`)),
      Promise.resolve()
    );
    logger.info(`Foreign Validators has been added successfully`, { quorumValidators });

    // Step.3: Ask for Fabric public keys
    const askForFabricPubKeyRequests = conf.federations.fabric.map(endpoint =>
      Client.askForPubKey(endpoint)
    );
    const fabricPubKeys = await Promise.all(askForFabricPubKeyRequests);
    logger.info(`Foreign Public Keys has been received`, { fabricPubKeys });

    // Step.4 Add Fabric pubic keys to Quorum network
    const addFabricValidatorsRequests = fabricPubKeys.map((key, index) =>
      connectorQuorum.addForeignValidator(key, `fabric_validator_${index + 1}`)
    );
    const fabricValidators = await Promise.all(addFabricValidatorsRequests);
    logger.info(`Foreign Validators has been added successfully`, { fabricValidators });
    return;
  } catch (error) {
    logger.info(error);
    process.exit(1);
  }
})();
