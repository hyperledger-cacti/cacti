/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * connector_if.js
 */

/*
 * Summary:
 * Adapter: a part independent on end-chains (connector side)
 * Communication portion with the connector server
 */

var io = require('socket.io-client');
var HttpsProxyAgent = require('https-proxy-agent');
var proxy = process.env.http_proxy;
var agent = null;
if (proxy) {
	agent = new HttpsProxyAgent(proxy);
}
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('connector_if[' + process.pid + ']');
logger.level = config.logLevel;

// socket correspondence table between core to adapter and adapter to connector
var sockets = {};

exports.request = function(client, func, args) {
	return new Promise((resolve, reject) => {

		var socket = sockets[client.id];
		if (socket && socket.connected) {
			var requestData = {
				func : func,
				args : args
			};
			socket.emit('request', requestData);
		} else {
			// return as failure if socket with connector is missing or not connected
			if (socket) {
				delete sockets[client.id];
				logger.info(Object.keys(sockets));
			}
			var errorResponse = {
				'status' : 503,
				'errorDetail' : 'Connecter server not connected.'
			};
			return reject(errorResponse);
		}

		socket.on('response', function (res) {
			logger.info('on:response');
			logger.info(res);
			return resolve(res);
		});

		socket.on('connector_error', function (e) {
			logger.error('on:connector_error');
			return reject(e);
		});

		socket.on('disconnect', function (reason) {
			logger.info('on:disconnect');
			logger.info(reason);
			if (sockets[client.id]) {
				delete sockets[client.id];
				logger.info(Object.keys(sockets));
			}
			// socket disconnect from connector also disconnect socket between corresponding core and adapter
			client.disconnect();
		});

	});
}

exports.startMonitor = function(client, cb) {
	var socket = sockets[client.id];
	if (socket && socket.connected) {
		socket.emit('startMonitor');
	} else {
		// Disconnecting the socket on the core side if there is no socket or connection with the connector side
		if (socket) {
			delete sockets[client.id];
			logger.info(Object.keys(sockets));
		}
		client.disconnect();
	}

	socket.on('eventReceived', function (res) {
		logger.info('on:eventReceived');
		cb(res);
	});
	socket.on('monitor_error', function (res) {
		logger.error('on:monitor_error');
		// Return on error with same callback as event received
		// (In the end, it will be judged by res.status later, so it might be good to collect all the emits from the cooperating server into one.)
		cb(res);
	});
	socket.on('disconnect', function (reason) {
		logger.info('on:disconnect/monitor');
		logger.info(reason);
		if (sockets[client.id]) {
			delete sockets[client.id];
			logger.info(Object.keys(sockets));
		}
		// socket disconnect from connector also disconnect socket between corresponding core and adapter
		client.disconnect();
	});
}

exports.stopMonitor = function(clientid) {
	var socket = sockets[clientid];
	if (socket) {
		socket.emit('stopMonitor');
	}
}


// socket connection between an adapter and a connector when socket connection from core side
exports.connect = function(clientid, connecter_url) {
	return new Promise((resolve, reject) => {
		if (!sockets[clientid]) {
			var options = {
				rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
				reconnection : false,
				timeout : 20000
			};
			if (agent) {
				options.agent = agent;
			}
			var socket = io(connecter_url, options);

			socket.on('connect', function() {
				logger.info('on:connect/connecter server')
				sockets[clientid] = socket;
				logger.info(Object.keys(sockets));
				return resolve();
			});

			socket.on('connect_error', function() {
				logger.error('on:connect_error/connecter server')
				return reject('connect_error');
			});

			socket.on('connect_timeout', function() {
				logger.error('on:connect_timeout/connecter server')
				return reject('connect_timeout');
			});
		}
	});
}

// socket disconnect between an adapter and a connector when socket is disconnected from core side
exports.disconnect = function(clientid) {
	if (sockets[clientid]) {
		if (!sockets[clientid].disconnected) {
			sockets[clientid].disconnect();
		}
		delete sockets[clientid];
		logger.info(Object.keys(sockets));
	}
}

