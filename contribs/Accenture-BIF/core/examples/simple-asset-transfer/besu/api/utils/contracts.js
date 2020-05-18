const path = require('path');
const web3 = require('./web3');
const config = require('../config/config');
const { orion, besu } = require('../config/keys');
const logger = require('../utils/logger')('contracts');

const destinationKeys = Object.entries(orion).reduce(
  (acc, val) => (val[0] == config.web3.host.linux ? acc : acc.concat(val[1].publicKey)),
  []
);

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

  encodeFunctionInput(buildName, name, arguments) {
    if (!this[buildName]) {
      this.getBuild(buildName);
    }
    const functionAbi = this[buildName].abi.find(e => {
      return e.name === name;
    });
    const functionArgs = web3.eth.abi.encodeParameters(functionAbi.inputs, arguments).slice(2);

    return functionAbi.signature + functionArgs;
  },

  decodeFunctionOutput(buildName, name, receipt) {
    if (!this[buildName]) {
      this.getBuild(buildName);
    }
    const functionAbi = this[buildName].abi.find(e => {
      return e.name === name;
    });
    logger.debug(JSON.stringify(functionAbi.outputs));
    const output = web3.eth.abi.decodeParameters(functionAbi.outputs, receipt.output);
    if (output.__length__ == 1) {
      return output['0'];
    }

    return output;
  },

  async callMethod(buildName, name, arguments) {
    logger.debug(`${buildName}.${name}(${arguments})`);
    const methodData = this.encodeFunctionInput(buildName, name, arguments);

    const functionCall = {
      to: this[`${buildName}Contract`].options.address,
      data: methodData,
      privateFrom: orion[config.web3.host.linux].publicKey,
      privateFor: destinationKeys,
      privateKey: besu[config.web3.host.linux].privateKey,
    };
    const txHash = await web3.eea.sendRawTransaction(functionCall);
    logger.info(`${buildName}.${name}(): txHash:${txHash}`);

    const receipt = await web3.priv.getTransactionReceipt(txHash, orion[config.web3.host.linux].publicKey);
    logger.debug(`${buildName}.${name}() receipt ${JSON.stringify(receipt)}`);

    if (receipt.status == '0x0') {
      throw new Error('Transaction Failed');
    }

    const output = this.decodeFunctionOutput(buildName, name, receipt);

    logger.debug(`${buildName}.${name}() returns ${JSON.stringify(output)}`);
    return { receipt, output };
  },

  async newPublicContract(contractObject, ...contractArguments) {
    const contractOptions = {
      data: contractObject.options.data,
      privateFrom: orion[config.web3.host.linux].publicKey,
      privateFor: destinationKeys,
      privateKey: besu[config.web3.host.linux].privateKey,
    };

    if (contractObject.networks) {
      contractOptions.to = contractObject.networks.address;
    }

    const txHash = await web3.eea.sendRawTransaction(contractOptions);
    logger.log('info', `newPublicContract: txHash:${txHash}`);

    const receipt = await web3.priv.getTransactionReceipt(txHash, orion[config.web3.host.linux].publicKey);

    contractObject.options.address = receipt.contractAddress;

    return contractObject;

    // const newContract = await contractObject
    //   .deploy({
    //     arguments: contractArguments,
    //   })
    //   .send({
    //     from: web3.eth.defaultAccount,
    //     gas: 10000000,
    //   })
    //   .on('transactionHash', txHash => logger.log('info', `newPublicContract: txHash:${txHash}`));
    // logger.log('debug', `newPublicContract: ${newContract.options.address}`);
    // return newContract;
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
