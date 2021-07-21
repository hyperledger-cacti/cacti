/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * getBalance.js
 */
const Web3 = require("web3");
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider("http://localhost:8545"));
const fromAccount = "0x06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97";
const toAccount = "0x9d624f7995e8bd70251f8265f2f9f2b49f169c55";
console.log("The balance of fromAccount:");
var res = web3.eth.getBalance(fromAccount);
console.log(res);
console.log("The balance of toAccount:");
var res = web3.eth.getBalance(toAccount);
console.log(res);
