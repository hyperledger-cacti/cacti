const log4js = require(`log4js`);
const ConnectorCorda = require(`../corda/connector.js`);
const ConnectorFabric = require(`../fabric/connector.js`);
const Client = require(`@hyperledger-labs/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`corda-to-fabric`);
logger.level = `info`;
const connectorFabric = new ConnectorFabric(conf.blockchains.fabric);
const connectorCorda = new ConnectorCorda(conf.blockchains.corda);
const cordaFederationClient = new Client({ validators: conf.federations.corda });
const cordaAsset = conf.assets.corda;

(async () => {
  try {
    // Step.1 Create asset on Corda
    const createdAsset = await connectorCorda.createAsset(cordaAsset);
    logger.info(`Asset has been created: ${JSON.stringify(createdAsset)}`);

    // Step.2: Lock asset on Corda
    const targetDLTId = `FABRIC_DLT1`;
    const receiverPubKey = `031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b`;
    const lockedAsset = await connectorCorda.lockAsset(cordaAsset.assetId, targetDLTId, receiverPubKey);
    logger.info(`Asset has been locked: ${JSON.stringify(lockedAsset)}`);

    const targetDLTType = 'FABRIC';

    // Step 2.5 (optional): Query the asset on Corda
    const assetInfo = await connectorCorda.getAsset(cordaAsset.assetId, targetDLTType);
    logger.info(`${targetDLTType} formatted asset has been queried: ${JSON.stringify(assetInfo)}`);

    // Step.3 Ask For Signatures to the Corda federation
    const multiSignature = await cordaFederationClient.askForSignatures(cordaAsset.assetId, targetDLTType);
    logger.info(`Signatures are:`, JSON.stringify(multiSignature.signatures));

    // Step.4: Verify Signatures on Fabric
    const verifications = await connectorFabric.verifyMultisig(multiSignature);
    logger.info(`Signatures have been verified: ${JSON.stringify(verifications)}`);

    // Step.5 Creating a copy of the exported asset on Quorum
    const result = await connectorFabric.copyAsset(multiSignature);
    logger.info(`Asset has been copied: ${JSON.stringify(result)}`);

    return;
  } catch (error) {
    logger.info(error);
    process.exit(1);
  }
})();
