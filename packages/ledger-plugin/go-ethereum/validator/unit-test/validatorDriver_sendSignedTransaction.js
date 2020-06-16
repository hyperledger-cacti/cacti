/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * validatrorDriver_sendRawTransaction.js
 */

////////
// Usage
// 1) Set parameter to parameter variable
//      [parameter variables of sendRawTransaction] fromAddress,fromAddressPkey,toAddress,amount,amount
// 2) execute
//
////////

// Validator test program.(socket.io client)
var io = require('socket.io-client');
var config = require('config');

// Specify the server (Validator) of the communication destination
var validatorUrl = config.validatorUrl;
console.log('validatorUrl: ' + validatorUrl);
var options = {
	rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
	reconnection : false,
	timeout : 20000
};
var socket = io(validatorUrl, options);

// for signing
var Tx = require('ethereumjs-tx');
const Web3 = require('web3');
var gethUrl = config.gethUrl;
console.log('gethUrl: ' + gethUrl);
const provider = new Web3.providers.HttpProvider(gethUrl);
const web3 = new Web3(provider);


// for test
// ec1-accounts[0] Address: {686b88b469a06e663e9c1c448ae646e1d6031c73}, pkey: fe47fab697963b8ab1ed82817db727f6b2f7cf522584da89cea82958224f6540
// ec1-accounts[1] Address: {9bece585f400a2714c99aff66a09814aa75de781}, pkey: ee00377add8fcc7509cde13b974e12d5d7032462689b5398c275ca271c5f2b92
// ec1-accounts[2] Address: {7370b07a74c4fe2caadf38c6d5788aa77d3a8843}, pkey: 6a6c15c2d03f41f2de94027a5ddde7f6631b72cac8ea102f386ceafa93aab236
// ec1-accounts[3] Address: {a075cfe69fae5160c4284ee778ea02d6fb4b8f74}, pkey: 34e3c7eaec470daaec0a104448103e685c9ae71f782efa9fc74f3fc0092676da
// ec1-accounts[4] Address: {b5431683f672782f0ebc74830047d824e7d3e05b}, pkey: 2925a764049f0041fb8681a0acc8502388066aaa7228cee5216d01ce4d4117f7

// ## Request Params
var fromAddress = "686b88b469a06e663e9c1c448ae646e1d6031c73";
var fromAddressPkey = "fe47fab697963b8ab1ed82817db727f6b2f7cf522584da89cea82958224f6540";
var toAddress = "9bece585f400a2714c99aff66a09814aa75de781";
var amount = 50;

var gas = 21000;

function json2str(jsonObj) {
    try {
        return JSON.stringify(jsonObj);
    }
    catch (error) {
        return null;
    }
}

function makeTxTransferNumericAsset() {
	var txnCount = web3.eth.getTransactionCount('0x' + fromAddress);
	//	NOTE: No need to count up.
	
	var gasPrice = web3.eth.gasPrice;
	
	var privKey  = Buffer.from(fromAddressPkey, 'hex');
	console.log('##privKey=' + fromAddressPkey);
	var rawTx = {
		"nonce" : web3.toHex(txnCount),
		"to" : '0x' + toAddress,
		"value" : amount,
		"gas" : gas,
	}
	console.log('##rawTx=' + json2str(rawTx));
	var tx = new Tx(rawTx);
	tx.sign(privKey);
	var serializedTx = tx.serialize();
	var serializedTxHex = '0x' + serializedTx.toString('hex');
	console.log('##serializedTxHex=' + serializedTxHex);
	return (serializedTxHex);
}

var func = "sendRawTransaction";
var args = {
	serializedTx : makeTxTransferNumericAsset(),
};

// function param
var requestData = {
	func : func,
	args : args
};



socket.on('connect_error', (err) => {
  console.log('####connect_error:', err);
  // end communication
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_timeout', (err) => {
  console.log('####Error:', err);
  // end communication
  socket.disconnect();
  process.exit(0);
});

socket.on('error', (err) => {
  console.log('####Error:', err);
});

socket.on('eventReceived', function (res) {
	// output the data received from the client
	console.log('#[recv]eventReceived, res: ' + json2str(res));
});


function requestStopMonitor() {
	console.log('##exec requestStopMonitor()');
	socket.emit('stopMonitor');
	
	setTimeout(function(){
	  // end communication
	  socket.disconnect();
	  process.exit(0);
	},5000);
}

// request StartMonitor
function requestStartMonitor() {
	console.log('##exec requestStartMonitor()');
	socket.emit('startMonitor');
	
	setTimeout(requestStopMonitor,15000);
}


function sendRequest() {
	// 
	console.log('exec sendRequest()');
	console.log('#[send]requestData: ' + json2str(requestData));
	socket.emit('request', requestData);
}

setTimeout(requestStartMonitor, 2000);
setTimeout(sendRequest, 4000);
