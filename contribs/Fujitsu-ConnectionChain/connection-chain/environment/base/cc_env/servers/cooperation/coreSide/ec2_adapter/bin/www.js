#!/usr/bin/env node

/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * www.js
 */

/* Summary:
 * Adapter: a part independent of end-chains (core side)
 */

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('adapter:server');
var fs = require('fs');
var https = require('https');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('adapter_main[' + process.pid + ']');
logger.level = config.logLevel;

// Implementation class of connectors dependent on endchains
var ClientPlugin = require('../lib/dependent/ClientPlugin.js');
var Cplug = new ClientPlugin();
// Library of adapter independent of end-chains (connector side)
var connector_if = require('../lib/connector_if.js');

/**
 * Get port from environment and store in Express.
 */

var sslport = normalizePort(process.env.PORT || config.sslParam.port);
app.set('port', sslport);

// Specify private key and certificate
var sslParam = {
	key: fs.readFileSync(config.sslParam.key),
	cert: fs.readFileSync(config.sslParam.cert)
};

/**
 * Create HTTPS server.
 */

var server = https.createServer(sslParam, app);	// Start as an https server.
var io = require('socket.io')(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(sslport, function(){
	console.log('listening on *:' + sslport);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTPS server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof sslport === 'string'
    ? 'Pipe ' + sslport
    : 'Port ' + sslport;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTPS server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

io.on('connection', function(client) {
	logger.info('Client ' + client.id + ' connected.');

	// Create a connection with the connector side that is associated with the client from the connected core side
	connector_if.connect(client.id, config.connecter_url)
	.then(() => {
		logger.info('Client ' + client.id + ' connected connecter server.');
		// Notify the core of a successful connection with the connector
		client.emit('connect_connecter_server');
	})
	.catch((reason) => {
		logger.error('Client ' + client.id + ' not connected connecter server.');
		// Notify the core of a failed connection with the connector & Disconnect core side
		var errorResponse = {
			'status' : 503,
			'errorDetail' : 'Connecter server not connected. reason: ' + reason
		};
		client.emit('error_connecter_server', errorResponse);
		client.disconnect();
		logger.info('Client ' + client.id + ' disconnected.');
	});

	/**
	 * requestEcOperation: EC operation request
	 * @param {JSON} params: Information to determine the distribution of operations to be performed on the EC side
	**/
	client.on('requestEcOperation', function(params) {
		logger.info('*** REQUEST ***');
		logger.info('Client ID :' + client.id);
		logger.info('Params    :' + JSON.stringify(params));

		Cplug.execConnecterApi(client, params)
		.then((res) => {
			client.emit('responseEcOperation', res);
		})
		.catch((e) => {
			client.emit('errorEcOperation', e);
		});
	});

	/**
	 * startMonitor: starting event monitor
	**/
	client.on('startMonitor', function() {
		logger.info('*** START MONITOR ***');
		logger.info('Client ID :' + client.id);
		// Use normal callback instead of Promise because the event is continuously received many times
		var cb = function(res) {
			if (res.status == 200) {
				client.emit('eventReceived', res);
			} else {
				client.emit('monitor_error', res);
			}
		}
		Cplug.startMonitor(client, cb);
	});

	/**
	 * stopMonitor: stopping event monitor
	**/
	client.on('stopMonitor', function() {
		logger.info('*** STOP MONITOR ***');
		logger.info('Client ID :' + client.id);
		Cplug.stopMonitor(client.id);
	});

	client.on('disconnect', function(reason) {
		logger.info('Client ' + client.id + ' disconnected.');
		logger.info('Reason    :' + reason);
		// disconnect the connecter associated with the disconnected client
		connector_if.disconnect(client.id);
	});

});

