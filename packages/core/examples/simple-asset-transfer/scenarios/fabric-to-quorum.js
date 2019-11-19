const log4js = require(`log4js`);
const ConnectorQuorum = require(`../quorum/connector.js`);
const ConnectorFabric = require(`../fabric/connector.js`);
const Client = require(`@hyperledger-labs/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`fabric-to-quorum`);
logger.level = `info`;
const connectorQuorum = new ConnectorQuorum(conf.blockchains.quorum);
const connectorFabric = new ConnectorFabric(conf.blockchains.fabric);
const fabricFederationClient = new Client({ validators: conf.federations.fabric });
const fabricAsset = conf.assets.fabric;

(async () => {
  try {
    // Step.1 Create asset on Fabric
    const createdAsset = await connectorFabric.createAsset(fabricAsset);
    logger.info(`Asset has been created: ${JSON.stringify(createdAsset)}`);

    // Step.2: Lock asset on Fabric
    const targetDLTId = `QUORUM_DLT2`;
    const receiverPubKey = `031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b`;
    const lockedAsset = await connectorFabric.lockAsset(fabricAsset.asset_id, targetDLTId, receiverPubKey);
    logger.info(`Asset has been locked: ${JSON.stringify(lockedAsset)}`);

    // Step 2.5 (optional): Query the asset on Fabric
    const assetInfo = await connectorFabric.getAsset(fabricAsset.asset_id);
    logger.info(`Asset has been queried: ${JSON.stringify(assetInfo)}`);

    // Step.3 Ask For Signatures to the Fabric federation
    const targetDLTType = `QUORUM`;
    const multiSignature = await fabricFederationClient.askForSignatures(fabricAsset.asset_id, targetDLTType);
    logger.info(`Signatures are:`, JSON.stringify(multiSignature.signatures));

    // Step.4: Verify Signatures on the Quorum side
    const verifications = await connectorQuorum.verifyMultisig(multiSignature);
    logger.info(`Signatures have been verified: ${JSON.stringify(verifications)}`);

    // Step.5 Creating a copy of the exported asset on the Quorum side
    const result = await connectorQuorum.copyAsset(multiSignature);
    logger.info(`Asset has been copied: ${JSON.stringify(result)}`);

    return;
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
