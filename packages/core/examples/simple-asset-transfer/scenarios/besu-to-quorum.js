const log4js = require(`log4js`);
const ConnectorQuorum = require(`../quorum/connector.js`);
const ConnectorBesu = require(`../besu/connector.js`);
const Client = require(`@hyperledger-labs/blockchain-integration-framework`).Client;
const conf = require(`./config`);

const logger = log4js.getLogger(`besu-to-quorum`);
logger.level = `info`;
const connectorQuorum = new ConnectorQuorum(conf.blockchains.quorum);
const connectorBesu = new ConnectorBesu(conf.blockchains.besu);
const besuFederationClient = new Client({ validators: conf.federations.besu });
const besuAsset = conf.assets.besu;

(async () => {
  try {
    // Step.1 Create asset on Besu
    const createdAsset = await connectorBesu.createAsset(besuAsset);
    logger.info(`Asset has been created: ${JSON.stringify(createdAsset)}`);

    // Step.2: Lock asset on Besu
    const targetDLTId = `QUORUM_DLT2`;
    const receiverPubKey = `031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b`;
    const lockedAsset = await connectorBesu.lockAsset(besuAsset.assetId, targetDLTId, receiverPubKey);
    logger.info(`Asset has been locked: ${JSON.stringify(lockedAsset)}`);

    // Step 2.5 (optional): Query the asset on Besu
    const assetInfo = await connectorBesu.getAsset(besuAsset.assetId);
    logger.info(`Asset has been queried: ${JSON.stringify(assetInfo)}`);

    // Step.3 Ask For Signatures to the Besu federation
    const targetDLTType = `QUORUM`;
    const multiSignature = await besuFederationClient.askForSignatures(besuAsset.assetId, targetDLTType);
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
