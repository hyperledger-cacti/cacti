const Validator = require(`@hyperledger-labs/blockchain-integration-framework`).Validator;
const { genKeyFile } = require(`@hyperledger-labs/blockchain-integration-framework`).cryptoUtils;
const ConnectorFabric = require(`./fabric/connector`);
const ConnectorQuorum = require(`./quorum/connector`);
const ConnectorCorda = require(`./corda/connector`);

(async () => {
  const keypair = await genKeyFile(`/federation/keypair`);
  const validatorOptions = {
    clientRepAddr: process.env.CLIENT_REP_ADDR,
    pubAddr: process.env.PUB_ADDR,
    repAddr: process.env.REP_ADDR,
    leaderPubAddr: process.env.LEAD_PUB_ADDR,
    leaderRepAddr: process.env.LEAD_REP_ADDR,
    leaderClientRepAddr: process.env.LEAD_CLIENT_REP_ADDR,
    dlType: process.env.DLT_TYPE,
    type: process.env.TYPE,
    pubKey: keypair.pk,
    privKey: keypair.sk,
  };
  const connectorOptions = {
    username: process.env.USER_NAME,
    orgName: process.env.ORG_NAME,
    peerName: process.env.PEER_NAME,
    password: process.env.PASSWORD,
    url: process.env.URL,
    port: process.env.PORT,
  };

  let connector;
  switch (validatorOptions.dlType) {
    case `FABRIC`:
      connector = new ConnectorFabric(connectorOptions);
      break;
    case `QUORUM`:
      connector = new ConnectorQuorum(connectorOptions);
      break;
    case `CORDA`:
      connector = new ConnectorCorda(connectorOptions);
      break;
    default:
      throw new Error(`undefined dlType`);
  }

  const validator = new Validator(connector, validatorOptions);
  validator.start();
})();
