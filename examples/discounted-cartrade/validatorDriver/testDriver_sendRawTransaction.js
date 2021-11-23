/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * testDriver_sendRawTransaction.js
 */

var request = require("request");

// Specify the server (Validator) of the communication destination
var validatorUrl = "https://localhost:5050";
console.log("validatorUrl: " + validatorUrl);

// for signing
var Common = require("ethereumjs-common").default;
var Tx = require("ethereumjs-tx").Transaction;
const Web3 = require("web3");
var gethUrl = "http://localhost:8545";
console.log("gethUrl: " + gethUrl);
const provider = new Web3.providers.HttpProvider(gethUrl);
const web3 = new Web3(provider);

//ethereumjs-tx2.1.2_support
const customCommon = Common.forCustomChain(
  "mainnet",
  {
    name: "geth1",
    networkId: 10,
    chainId: 10,
  },
  "petersburg"
);

var fromAddress = "ec709e1774f0ce4aba47b52a499f9abaaa159f71";
var fromAddressPkey =
  "40d7e5931a6e0807d3ebd70518f635dbf575975d3bb564ff34c99be416067c89";
var toAddress = "9d624f7995e8bd70251f8265f2f9f2b49f169c55";
var amount = 50;

var gas = 21000;

function json2str(jsonObj) {
  try {
    return JSON.stringify(jsonObj);
  } catch (error) {
    return null;
  }
}

function makeTxTransferNumericAsset() {
  //web3_v1.2.9_support
  web3.eth.getTransactionCount("0x" + fromAddress).then((_nance) => {
    var txnCount = _nance;
    // NOTE: No need to count up.

    var gasPrice = web3.eth.gasPrice;

    var privKey = Buffer.from(fromAddressPkey, "hex");
    console.log("##privKey=" + fromAddressPkey);
    var rawTx = {
      nonce: web3.utils.toHex(txnCount),
      to: "0x" + toAddress,
      value: amount,
      gas: gas,
    };
    console.log("txnCount=" + web3.utils.toHex(txnCount));
    console.log("##rawTx=" + json2str(rawTx));
    var tx = new Tx(rawTx, { common: customCommon });
    tx.sign(privKey);
    var serializedTx = tx.serialize();
    var serializedTxHex = "0x" + serializedTx.toString("hex");
    console.log("##serializedTxHex=" + serializedTxHex);

    var param = {
      apiType: "sendRawTransaction",
      progress: "",
      data: {
        serializedTx: serializedTxHex,
      },
    };
    var target =
      "http://localhost:5000/validatorDriver?validator=ethereum&func=requestLedgerOperation&param=" +
      JSON.stringify(param);

    console.log("url : " + target);

    const options = {
      url: target,
      method: "GET",
    };

    request(options, (error, response, body) => {
      if (error !== null) {
        console.log("error:", error);
        return false;
      }

      console.log("statusCode:", response && response.statusCode);
      console.log("body:", body);
    });
  });
}

makeTxTransferNumericAsset();
