const log4js = require(`log4js`);
const ConnectorCorda = require(`../corda/connector.js`);
const ConnectorQuorum = require(`../quorum/connector.js`);
const ConnectorBesu = require(`../besu/connector.js`);
const ConnectorFabric = require(`../fabric/connector.js`);
const Client = require(`@hyperledger-labs/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`share-public-keys`);
logger.level = `info`;
const connectorCorda = new ConnectorCorda(conf.blockchains.corda);
const connectorQuorum = new ConnectorQuorum(conf.blockchains.quorum);
const connectorBesu = new ConnectorBesu(conf.blockchains.besu);
const connectorFabric = new ConnectorFabric(conf.blockchains.fabric);

(async () => {
  try {
    const noQuorum = process.argv.indexOf('noquorum') > -1;
    const noFabric = process.argv.indexOf('nofabric') > -1;
    const noCorda = process.argv.indexOf('nocorda') > -1;
    const noBesu = process.argv.indexOf('nobesu') > -1;

    // Step 1.1: Ask for Corda public keys
    let cordaPubKeys = [];
    if (!noCorda) {
      const askForCordaPubKeyRequests = conf.federations.corda.map(endpoint => Client.askForPubKey(endpoint));
      cordaPubKeys = await Promise.all(askForCordaPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { cordaPubKeys });
    }

    // Step 1.2: Ask for Quorum public keys
    let quorumPubKeys = [];
    if (!noQuorum) {
      const askForQuorumPubKeyRequests = conf.federations.quorum.map(endpoint => Client.askForPubKey(endpoint));
      quorumPubKeys = await Promise.all(askForQuorumPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { quorumPubKeys });
    }

    // Step 1.3: Ask for Fabric public keys
    let fabricPubKeys = [];
    if (!noFabric) {
      const askForFabricPubKeyRequests = conf.federations.fabric.map(endpoint => Client.askForPubKey(endpoint));
      fabricPubKeys = await Promise.all(askForFabricPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { fabricPubKeys });
    }

    // Step 1.4: Ask for Besu public keys
    let besuPubKeys = [];
    if (!noBesu) {
      const askForBesuPubKeyRequests = conf.federations.besu.map(endpoint => Client.askForPubKey(endpoint));
      besuPubKeys = await Promise.all(askForBesuPubKeyRequests);
      logger.info(`Foreign Public Keys has been received`, { besuPubKeys });
    }

    // Step 2.1 Add Corda + Quorum + Besu public keys to Fabric network
    if (!noFabric) {
      const addQuorumValToFabricRequests = await quorumPubKeys.map((key, index) =>
        connectorFabric.addForeignValidator(key, `quorum_validator_${index + 1}`)
      );
      const quorumValForFabric = await Promise.all(addQuorumValToFabricRequests);
      logger.info(`Foreign Validators has been added to Fabric successfully`, { quorumValForFabric });

      const addBesuValToFabricRequests = await besuPubKeys.map((key, index) =>
        connectorFabric.addForeignValidator(key, `besu_validator_${index + 1}`)
      );
      const besuValForFabric = await Promise.all(addBesuValToFabricRequests);
      logger.info(`Foreign Validators has been added to Fabric successfully`, { besuValForFabric });

      const addCordaValToFabricRequests = cordaPubKeys.map((key, index) =>
        connectorFabric.addForeignValidator(key, `corda_validator_${index + 1}`)
      );
      const cordaValForFabric = await Promise.all(addCordaValToFabricRequests);
      logger.info(`Foreign Validators has been added to Fabric successfully`, { cordaValForFabric });
    }

    // Step 2.2 Add Fabric + Quorum + Besu public keys to Corda network
    if (!noCorda) {
      const addQuorumValToCordaRequests = await quorumPubKeys.map((key, index) =>
        connectorCorda.addForeignValidator(key, `quorum_validator_${index + 1}`)
      );
      const quorumValForCorda = await Promise.all(addQuorumValToCordaRequests);
      logger.info(`Foreign Validators has been added to Corda successfully`, { quorumValForCorda });

      const addBesuValToCordaRequests = await besuPubKeys.map((key, index) =>
        connectorCorda.addForeignValidator(key, `besu_validator_${index + 1}`)
      );
      const besuValForCorda = await Promise.all(addBesuValToCordaRequests);
      logger.info(`Foreign Validators has been added to Corda successfully`, { besuValForCorda });

      const addFabricValToCordaRequests = await fabricPubKeys.map((key, index) =>
        connectorCorda.addForeignValidator(key, `fabric_validator_${index + 1}`)
      );
      const fabricValForCorda = await Promise.all(addFabricValToCordaRequests);
      logger.info(`Foreign Validators has been added to Corda successfully`, { fabricValForCorda });
    }

    // Step 2.3 Add Corda + Fabric + Besu pubic keys to Quorum network
    if (!noQuorum) {
      const addCordaValToQuorumRequests = cordaPubKeys.map((key, index) =>
        connectorQuorum.addForeignValidator(key, `corda_validator_${index + 1}`)
      );
      const cordaValForQuorum = await Promise.all(addCordaValToQuorumRequests);
      logger.info(`Foreign Validators has been added to Quorum successfully`, { cordaValForQuorum });

      const addBesuValToQuorumRequests = besuPubKeys.map((key, index) =>
        connectorQuorum.addForeignValidator(key, `besu_validator_${index + 1}`)
      );
      const besuValForQuorum = await Promise.all(addBesuValToQuorumRequests);
      logger.info(`Foreign Validators has been added to Quorum successfully`, { besuValForQuorum });

      const addFabricValToQuorumRequests = fabricPubKeys.map((key, index) =>
        connectorQuorum.addForeignValidator(key, `fabric_validator_${index + 1}`)
      );
      const fabricValForQuorum = await Promise.all(addFabricValToQuorumRequests);
      logger.info(`Foreign Validators has been added to Quorum successfully`, { fabricValForQuorum });
    }

    // Step 2.4 Fabric + Quourm + Corda Keys to Besu Network
    if (!noBesu) {
      for (let [index, key] of cordaPubKeys.entries()) {
        await connectorBesu.addForeignValidator(key, `corda_validator_${index + 1}`);
      }
      logger.info(`Foreign Validators has been added to Besu successfully`, { cordaPubKeys });

      for (let [index, key] of quorumPubKeys.entries()) {
        await connectorBesu.addForeignValidator(key, `quorum_validator_${index + 1}`);
      }
      logger.info(`Foreign Validators has been added to Besu successfully`, { quorumPubKeys });

      for (let [index, key] of fabricPubKeys.entries()) {
        await connectorBesu.addForeignValidator(key, `fabric_validator_${index + 1}`);
      }
      logger.info(`Foreign Validators has been added to Besu successfully`, { fabricPubKeys });
    }
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
