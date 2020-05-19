/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_getBlock.js
 */

// File for direct operation of geth
// checking block information
var SplugConfig = require('./PluginConfig.js');
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
var res = web3.eth.getBlock(0); // get 0th block information
console.log(res);
