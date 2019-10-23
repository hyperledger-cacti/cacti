const rp = require(`request-promise-native`);
const log4js = require('log4js');

const pathToChaincode = `mycc/`;
const pathToChannel = `../../artifacts/channel/mychannel.tx`
const logger = log4js.getLogger('init-network');
logger.level = 'INFO';

async function enroll(username, orgName) {
  const res = JSON.parse(
    await rp({
      method: `POST`,
      uri: `http://localhost:4000/users`,
      form: {
        username,
        orgName,
      },
    })
  );
  if (res.success) {
    logger.info(res.message);
    return res.token;
  }
  return Promise.reject(new Error(res.message));
}

(async () => {
  try {
    // enrolling 2 admin users for each organisation
    const tokenOrg1 = await enroll(`Naima`, `Org1`);
    await enroll(`Mike`, `Org1`);
    const tokenOrg2 = await enroll(`Hugo`, `Org2`);
    await enroll(`Luca`, `Org2`);

    const createChannel = await rp({
      method: `POST`,
      uri: `http://localhost:4000/channels`,
      auth: {
        bearer: tokenOrg1,
      },
      body: {
        channelName: `mychannel`,
        channelConfigPath: pathToChannel,
      },
      json: true,
    });

    if(!createChannel.success) {
      throw new Error(createChannel.message);
    }
    logger.info(createChannel.message);

    const org1JoinChannel = await rp({
      method: `POST`,
      uri: `http://localhost:4000/channels/mychannel/peers`,
      auth: {
        bearer: tokenOrg1,
      },
      body: {
        peers: [`peer0.org1.example.com`, `peer1.org1.example.com`],
      },
      json: true,
    });

    if(!org1JoinChannel.success) {
      throw new Error(org1JoinChannel.message);
    }
    logger.info(org1JoinChannel.message);

    const org1InstallChaincode = await rp({
      method: `POST`,
      uri: `http://localhost:4000/chaincodes`,
      auth: {
        bearer: tokenOrg1,
      },
      body: {
        peers: [`peer0.org1.example.com`, `peer1.org1.example.com`],
        chaincodeName: `mycc`,
        chaincodePath: pathToChaincode,
        chaincodeType: `golang`,
        chaincodeVersion: `v1`,
      },
      json: true,
    });

    if(!org1InstallChaincode.success) {
      throw new Error(org1InstallChaincode.message);
    }
    logger.info(org1InstallChaincode.message);

    const org2JoinChannel = await rp({
      method: `POST`,
      uri: `http://localhost:4000/channels/mychannel/peers`,
      auth: {
        bearer: tokenOrg2,
      },
      body: {
        peers: [`peer0.org2.example.com`, `peer1.org2.example.com`],
      },
      json: true,
    });

    if(!org2JoinChannel.success) {
      throw new Error(org2JoinChannel.message);
    }
    logger.info(org2JoinChannel.message);

    const org2InstallChaincode = await rp({
      method: `POST`,
      uri: `http://localhost:4000/chaincodes`,
      auth: {
        bearer: tokenOrg2,
      },
      body: {
        peers: [`peer0.org2.example.com`, `peer1.org2.example.com`],
        chaincodeName: `mycc`,
        chaincodePath: pathToChaincode,
        chaincodeType: `golang`,
        chaincodeVersion: `v1`,
      },
      json: true,
    });

    if(!org2InstallChaincode.success) {
      throw new Error(org2InstallChaincode.message);
    }
    logger.info(org2InstallChaincode.message);

    const org1InstantiateChaincode = await rp({
      method: `POST`,
      uri: `http://localhost:4000/channels/mychannel/chaincodes`,
      auth: {
        bearer: tokenOrg1,
      },
      body: {
        chaincodeName: `mycc`,
        chaincodeVersion: `v1`,
        chaincodeType: `golang`,
        args: [`a`, `created`],
      },
      json: true,
    });

    if(!org1InstantiateChaincode.success) {
      throw new Error(org1InstantiateChaincode.message);
    }
    logger.info(org1InstantiateChaincode.message);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();