/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_getAccounts.js
 */

// File for direct operation of geth
// Account & balance checking
var SplugConfig = require('./PluginConfig.js');
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
var accounts = web3.eth.accounts;
for (var i=0; i<accounts.length; i++){
	console.log("accounts[" + i + "]");
	console.log("    address:" + accounts[i]);
	var res = web3.eth.getBalance(accounts[i]);
	console.log("    balance:" + res.toString(10));
}
