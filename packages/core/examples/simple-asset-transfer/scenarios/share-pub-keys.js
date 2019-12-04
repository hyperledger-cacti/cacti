const log4js = require(`log4js`);
const ConnectorCorda = require(`../corda/connector.js`);
const ConnectorQuorum = require(`../quorum/connector.js`);
const ConnectorFabric = require(`../fabric/connector.js`);
const Client = require(`@hyperledger-labs/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`share-public-keys`);
logger.level = `info`;
const connectorCorda = new ConnectorCorda(conf.blockchains.corda);
const connectorQuorum = new ConnectorQuorum(conf.blockchains.quorum);
const connectorFabric = new ConnectorFabric(conf.blockchains.fabric);

(async () => {
  try {
    const noQuorum = process.argv.indexOf('noquorum') > -1;
    const noFabric = process.argv.indexOf('nofabric') > -1;
    const noCorda = process.argv.indexOf('nocorda') > -1;

    // Step.1: Ask for Corda public keys
    let cordaPubKeys;
    if (!noCorda) {
      const askForCordaPubKeyRequests = conf.federations.corda.map(endpoint => Client.askForPubKey(endpoint));
      cordaPubKeys = await Promise.all(askForCordaPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { cordaPubKeys });
    }

    // Step.2: Ask for Quorum public keys
    let quorumPubKeys;
    if (!noQuorum) {
      const askForQuorumPubKeyRequests = conf.federations.quorum.map(endpoint => Client.askForPubKey(endpoint));
      quorumPubKeys = await Promise.all(askForQuorumPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { quorumPubKeys });
    }

    // Step.3: Ask for Fabric public keys
    let fabricPubKeys;
    if (!noFabric) {
      const askForFabricPubKeyRequests = conf.federations.fabric.map(endpoint => Client.askForPubKey(endpoint));
      fabricPubKeys = await Promise.all(askForFabricPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { fabricPubKeys });
    }

    // Step.4 Add Corda + Quorum public keys to Fabric network
    if (!noCorda && !noFabric) {
      const cordaValForFabric = await cordaPubKeys.reduce(
        (acc, currentKey, index) =>
          acc.then(() => connectorFabric.addForeignValidator(currentKey, `corda_validator_${index + 1}`)),
        Promise.resolve()
      );
      logger.info(`Corda Validators has been added to Fabric successfully`, { cordaValForFabric });
    }
    if (!noQuorum && !noFabric) {
      const quorumValForFabric = await quorumPubKeys.reduce(
        (acc, currentKey, index) =>
          acc.then(() => connectorFabric.addForeignValidator(currentKey, `quorum_validator_${index + 1}`)),
        Promise.resolve()
      );
      logger.info(`Quorum Validators has been added to Fabric successfully`, { quorumValForFabric });
    }

    // Step.5 Add Fabric + Quorum public keys to Corda network
    if (!noQuorum && !noCorda) {
      const addQuorumValToCordaRequests = await quorumPubKeys.map((key, index) =>
        connectorCorda.addForeignValidator(key, `quorum_validator_${index + 1}`)
      );
      const quorumValForCorda = await Promise.all(addQuorumValToCordaRequests);
      logger.info(`Foreign Validators has been added to Corda successfully`, { quorumValForCorda });
    }
    if (!noFabric && !noCorda) {
      const addFabricValToCordaRequests = await fabricPubKeys.map((key, index) =>
        connectorCorda.addForeignValidator(key, `fabric_validator_${index + 1}`)
      );
      const fabricValForCorda = await Promise.all(addFabricValToCordaRequests);
      logger.info(`Foreign Validators has been added to Corda successfully`, { fabricValForCorda });
    }

    // Step.6 Add Corda + Fabric pubic keys to Quorum network
    if (!noCorda && !noQuorum) {
      const addCordaValToQuorumRequests = cordaPubKeys.map((key, index) =>
        connectorQuorum.addForeignValidator(key, `corda_validator_${index + 1}`)
      );
      const cordaValForQuorum = await Promise.all(addCordaValToQuorumRequests);
      logger.info(`Foreign Validators has been added to Quorum successfully`, { cordaValForQuorum });
    }
    if (!noFabric && !noQuorum) {
      const addFabricValToQuorumRequests = fabricPubKeys.map((key, index) =>
        connectorQuorum.addForeignValidator(key, `fabric_validator_${index + 1}`)
      );
      const fabricValForQuorum = await Promise.all(addFabricValToQuorumRequests);
      logger.info(`Foreign Validators has been added to Quorum successfully`, { fabricValForQuorum });
    }
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
