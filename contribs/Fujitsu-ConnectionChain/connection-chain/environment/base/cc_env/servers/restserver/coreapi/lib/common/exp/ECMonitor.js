/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ECMonitor.js
 */

/* Summary:
 * Event motinoring of end-chain
*/

var EventEntrance = require('../EventEntrance.js');

// Dependency declaration of base package 
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
var logger = log4js.getLogger('ECMonitor_exp[' + process.pid + ']');
logger.level = config.logLevel;

var ECMonitor = class {

	constructor(chainId, adapterUrl) {
		this._id = chainId; // Using chainId, EventMediator gets the destination EC information
		this._asUrl = adapterUrl;
		this._socket = null;
	}

	start() {
		try {
			logger.info('Connecting adapter server.');
			var options = {
					rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
					reconnection : true, // connection with adapter fails but repeats
					reconnectionDelay : 5000, // Default 1000
					reconnectionDelayMax : 10000 // Default 5000
				};
			if (agent) {
				options.agent = agent;
			}
			this._socket = io(this._asUrl, options); // Connect to the adapter

			// Successful connection from core to adapter
			this._socket.on('connect', () => {
				logger.info('on:connect/adapter');
				// Do not start monitoring yet at this time
			});

			var reconnect = function(socket) {
				logger.info('Reconnecting adapter server.');
				if (socket) {
					socket.connect();
				}
			}

			// Disconnecting from adapter
			this._socket.on('disconnect', (reason) => {
				logger.info('on:disconnect/adapter');
				logger.info(reason);
				// Attempt to reconnect if explicit disconnect (Disconnecting by the adapter without connecting to the connector server side)
				if (reason == 'io server disconnect') {
					// Wait for the same amount of time as defined reconnectionDelayMax options
					var delay = this._socket.io._reconnectionDelayMax;
					setTimeout(reconnect, delay, this._socket);
				}
			});

			// Successful connection (core => adapter => connector server)
			this._socket.on('connect_connecter_server', () => {
				logger.info('on:connect/connecter');
				logger.info('Start monitor.');
				// Now finally the adapter (via connector servers) starts monitoring
				this._socket.emit('startMonitor');
			});

			// Connection failure (adapter => connector server)
			this._socket.on('error_connecter_server', (err_obj) => {
				logger.error('on:error/connecter');
				logger.error(JSON.stringify(err_obj));
				// Disconnected from adapter
			});

			this._socket.on('connect_error', (err) => {
				logger.error('on:connect_error/adapter');
				var err_obj = {
					"status" : 404,
					"errorDetail" : err
				};
				logger.error(JSON.stringify(err_obj));
				if(!this._socket.disconnected) {
					this._socket.disconnect();
				}
			});

			this._socket.on('connect_timeout', (err) => {
				logger.error('on:connect_timeout/adapter');
				var err_obj = {
					"status" : 404,
					"errorDetail" : err
				};
				logger.error(JSON.stringify(err_obj));
				if(!this._socket.disconnected) {
					this._socket.disconnect();
				}
			});

			// Receive event notification from adapter (via connector servers)
			this._socket.on('eventReceived', (res_obj) => {
				logger.info('on:eventReceived');
				logger.info('*** Receive Event ***');
				logger.info('chain id :' + this._id);
				var events = res_obj.events;
				var len = events.length;
				logger.info('events.length :' + len);
				for (var i = 0; i < len; i++) {
					var eventData = events[i].data;
					var eventId = events[i].id;
					logger.info('event id :' + eventId);
					logger.info('event data :');
					logger.info(JSON.stringify(eventData));
					// Request to perform subsequent processing
					EventEntrance.action_fromEC(this._id, eventId, eventData);
				}
			});

			this._socket.on('monitor_error', (err_obj) => {
				logger.error('on:monitor_error');
				logger.error(JSON.stringify(err_obj));
			});

		} catch (e) {
			logger.error(JSON.stringify(e));
		}
	}

	end() {
		logger.info('Stop monitor.');
		if (this._socket) {
			//this._socket.emit('stopMonitor');
			// The monitor will connect a new socket each time it starts, so you have to disconnect it when it stops.
			// We have created a connector server side to stop monitoring when the connection is broken, so this is all you need.
			this._socket.disconnect();
		}
	}
};

module.exports = ECMonitor;
