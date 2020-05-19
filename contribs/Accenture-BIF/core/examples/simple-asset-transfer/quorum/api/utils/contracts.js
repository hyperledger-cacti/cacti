const path = require('path');
const web3 = require('./web3');
const config = require('../config/config');
const logger = require('../utils/logger')('contracts');

const Contracts = {
  EMPTY_ADDRESS: '0x0000000000000000000000000000000000000000',

  getBuild(name) {
    const fullName = path.join('../', config.solidity.buildFolder, `${name}.json`);
    delete require.cache[require.resolve(fullName)];
    // eslint-disable-next-line import/no-dynamic-require, global-require
    this[name] = require(fullName);
    return this[name];
  },

  getContract(contractName, version) {
    const name = version && version > 1 ? path.join(`v${version}`, contractName) : contractName;
    if (!this[name]) {
      this.getBuild(name);
    }

    if (!this[`${name}Contract`]) {
      let contract;
      if (Object.keys(this[name].networks || {}).length) {
        contract = new web3.eth.Contract(this[name].abi, this[name].networks.address);
      } else {
        contract = new web3.eth.Contract(this[name].abi);
      }
      contract.options.data = this[name].bytecode;
      this[`${name}Contract`] = contract;
    }
    return this[`${name}Contract`];
  },

  newContract(name, address) {
    if (!this[name]) {
      this.getBuild(name);
    }
    if (!this[name + address]) {
      this[name + address] = new web3.eth.Contract(this[name].abi, address);
    }
    return this[name + address];
  },

  async newPublicContract(contractObject, ...contractArguments) {
    const newContract = await contractObject
      .deploy({
        arguments: contractArguments,
      })
      .send({
        from: web3.eth.defaultAccount,
        gas: 10000000,
      })
      .on('transactionHash', txHash => logger.log('info', `newPublicContract: txHash:${txHash}`));
    logger.log('debug', `newPublicContract: ${newContract.options.address}`);
    return newContract;
  },

  async newPrivateContract(contractObject, privateFor, ...contractArguments) {
    const newContract = await contractObject
      .deploy({
        arguments: contractArguments,
      })
      .send({
        from: web3.eth.defaultAccount,
        gas: 100000000,
        privateFor,
      })
      .on('transactionHash', txHash => logger.log('debug', `newPrivateContract: txHash:${txHash}`));
    logger.log('debug', `newPrivateContract: ${newContract.options.address}`);
    return newContract;
  },
};

module.exports = Contracts;
