/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * validatrorDriver_getNumericBalance.js
 */

////////
// Usage
// 1) Set parameter to parameter variable
//      [parameter variables of getNumericBalance] referredAddress
// 2) Specify the function to execute with "requestData"
// 3) execute
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

// for test
// ec1-accounts[0] Address: {686b88b469a06e663e9c1c448ae646e1d6031c73}
// ec1-accounts[1] Address: {9bece585f400a2714c99aff66a09814aa75de781}
// ec1-accounts[2] Address: {7370b07a74c4fe2caadf38c6d5788aa77d3a8843}
// ec1-accounts[3] Address: {a075cfe69fae5160c4284ee778ea02d6fb4b8f74}
// ec1-accounts[4] Address: {b5431683f672782f0ebc74830047d824e7d3e05b}

// ## Request for "getNumericBalance"
var referedAddress = "9bece585f400a2714c99aff66a09814aa75de781";
var func1 = "getNumericBalance";
var args1 = {
	referedAddress : referedAddress
};

// function param
var requestData = {
	func : func1,  // func1 or func1
	args : args1   // arg1 or arg1
};



function json2str(jsonObj) {
    try {
        return JSON.stringify(jsonObj);
    }
    catch (error) {
        return null;
    }
}


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
