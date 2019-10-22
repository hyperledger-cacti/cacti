const Web3 = require('web3');
const config = require('../config/config');

const option = `ws://${config.web3.host[`${process.platform}`]}:${config.web3.port}`;
const web3 = new Web3(option);

web3.eth.defaultAccount = config.web3.ethKey;

module.exports = web3;
