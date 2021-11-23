/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * adapter_if.js
 */

/* Summary:
 * Libraries for EC operation requests via federated servers
 * 
 * Entry point:
 * None (For lib)
*/

var CoreAPIUtil = require('../CoreAPIUtil.js');

// Base package dependency declaration
var util = require('util');
var process = require('process');
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
var logger = log4js.getLogger('adapter_if[' + process.pid + ']');
logger.level = config.logLevel;

/**
 * send: send request to adapter
 * @param {string} url: Adapter URL (Example: "https:// 12.34.56.78: 4030")
 * @param {JSON} params: Information to determine the distribution of the operation to be performed
**/
function send(url, params) {
	return new Promise((resolve, reject) => {
		// https://socket.io/docs/client-api/
		// set retry with false to avoid infinite loop when connection failure.
		// set timeout with default value, to make it easy to edit.
		var options = {
			rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
			reconnection : false,
			timeout : 20000
		};
		if (agent) {
			options.agent = agent;
		}
		var socket = io(url, options);

		// Successful connection from core to adapter
		socket.on('connect', () => {
			logger.info('on:connect/adapter');
		});

		// Disconnecting from adapter
		socket.on('disconnect', (reason) => {
			logger.info('on:disconnect/adapter');
			logger.info(reason);
			// Adapter or my self, do not return an explicit disconnect as a failure
			if (reason != 'io server disconnect' && reason != 'io client disconnect') {
				var ret_obj = {
					"status" : 503,
					"errorDetail" : reason
				};
				return reject(ret_obj);
			}
		});

		// Successful connection from core to adapter to connector
		socket.on('connect_connecter_server', () => {
			logger.info('on:connect/connecter');
			socket.emit('requestEcOperation', params);
		});

		// Connection failure from adapter to connector
		socket.on('error_connecter_server', (err_obj) => {
			logger.error('on:error/connecter');
			logger.error(JSON.stringify(err_obj));
			return reject(err_obj);
			// Disconnect between core and adapter is executed by adapter
		});

		function tmout(err) {
			// Connection failed or TIMEOUT.
			logger.error(err.toString());
			var emsg = "Cooperation node down?";
			var ret_obj = {
				"status" : 404,
				"errorDetail" : emsg
			};
			if(!socket.disconnected) {
				socket.disconnect();
			}
			return reject(ret_obj);
		}

		// Both are returned as the same error.
		socket.on('connect_error', function(err){
			logger.error('on:connect_error/adapter');
			return tmout(err);
		});
		socket.on('connect_timeout', function(err){
			logger.error('on:connect_timeout/adapter');
			return tmout(err);
		});

		socket.on('responseEcOperation', function (res) {
			logger.info('on:responseEcOperation/adapter');
			if(!socket.disconnected) {
				socket.disconnect();
			}
			return resolve(res);
		});

		socket.on('errorEcOperation', function (e) {
			logger.error('on:errorEcOperation/adapter');
			if(!socket.disconnected) {
				socket.disconnect();
			}
			return reject(e);
		});

	});
}

exports.send = function(url, params) {
	return send(url, params);
}
