/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_getBlock.js
 */

// File for direct operation of geth
// checking block information
import { SplugConfig } from './PluginConfig';
import { Web3 } from 'web3';
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
const res = web3.eth.getBlock(0); // get 0th block information
console.log(res);
