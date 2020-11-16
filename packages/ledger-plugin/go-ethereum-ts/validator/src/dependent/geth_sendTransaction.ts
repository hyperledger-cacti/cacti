/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_sendTransaction.js
 */

// File for direct operation of geth
// Asset Transfer
import { SplugConfig } from './PluginConfig';
import { Web3 } from 'web3';
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
const accounts = web3.eth.accounts;
let res = web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: web3.toWei(100000, "wei")});
console.log(res);
res = web3.eth.sendTransaction({from: accounts[0], to: accounts[3], value: web3.toWei(1000, "wei")});
console.log(res);
res = web3.eth.sendTransaction({from: accounts[0], to: accounts[4], value: web3.toWei(1000, "wei")});
console.log(res);
