const Web3 = require('web3');
const EEAClient = require('web3-eea');
const config = require('../config/config');
const logger = require('../utils/logger')('web3');

const rpcApiHost = `http://${config.web3.host[`${process.platform}`]}:${config.web3.rpcPort}`;
logger.info(`Using web3 from ${rpcApiHost}...`);
const web3Provider = new Web3.providers.HttpProvider(rpcApiHost);
const web3 = new EEAClient(new Web3(web3Provider), 2018);
web3.eth.defaultAccount = config.web3.ethKey;
module.exports = web3;
