/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_sendTransaction.js
 */

// File for direct operation of geth
// Asset Transfer
var SplugConfig = require('./PluginConfig.js');
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
var accounts = web3.eth.accounts;
var res = web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: web3.toWei(100000, "wei")});
console.log(res);
res = web3.eth.sendTransaction({from: accounts[0], to: accounts[3], value: web3.toWei(1000, "wei")});
console.log(res);
res = web3.eth.sendTransaction({from: accounts[0], to: accounts[4], value: web3.toWei(1000, "wei")});
console.log(res);
