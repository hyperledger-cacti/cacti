#!/usr/bin/env node

/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * www.js
 */

/* Summary:
 * Connector: a part independent of end-chains
 */

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('connector:server');
var fs = require('fs');
var https = require('https');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('connector_main[' + process.pid + ']');
logger.level = config.logLevel;

// implementation class of a part dependent of end-chains (server plugin)
var ServerPlugin = require('../../dependent/ServerPlugin.js');
var Splug = new ServerPlugin();
// destination dependency (MONITOR) implementation class
var ServerMonitorPlugin = require('../../dependent/ServerMonitorPlugin.js');
var Smonitor = new ServerMonitorPlugin();

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

	/**
	 * request: The server plugin's request to execute a function
	 * @param {JSON} data: Request Body (following format)
	 * JSON: {
	 *          "func":        (string) Function name ,// For example : "transferNumericAsset"
	 *          "args":        (Object) argument// for example , {"from" : "xxx" , "to" : "yyy" , "value" : "10,000"}
	 *       }
	**/
	client.on('request', function(data) {
		var func = data.func;
		var args = data.args;
		console.log('##[HL-BC] Invoke smart contract to transfer asset(D1)');
		logger.info('*** REQUEST ***');
		logger.info('Client ID :' + client.id);
		logger.info('Data  :' + JSON.stringify(data));

		// Check for the existence of the specified function and call it if it exists.
		if (Splug.isExistFunction(func)) {
			// Can be called with Server plugin function name.
			Splug[func](args)
			.then((resp_obj) => {
				logger.info('*** RESPONSE ***');
				logger.info('Client ID :' + client.id);
				logger.info('Response  :' + JSON.stringify(resp_obj));
				client.emit("response", resp_obj);
			})
			.catch((err_obj) => {
				logger.error('*** ERROR ***');
				logger.error('Client ID :' + client.id);
				logger.error('Detail    :' + JSON.stringify(err_obj));
				client.emit("connector_error", err_obj);
			});
		} else {
			// No such function
			var emsg = "Function " + func + " not found!";
			logger.error(emsg);
			var ret_obj = {
				"status" : 504,
				"errorDetail" : emsg
			};
			client.emit("connector_error", ret_obj);
		}
	});

	/**
	 * startMonitor: starting block generation event monitoring
	**/
	client.on('startMonitor', function() {
		// Callback to receive monitoring results
		var cb = function(callbackData) {
			var emit_type = "";
			if(callbackData.status == 200) {
				emit_type = "eventReceived";
				logger.info('event data callbacked.');
			} else {
				emit_type = "monitor_error";
			}
			client.emit(emit_type, callbackData);
		}

		Smonitor.startMonitor(client.id, cb);
	});

	/**
	 * stopMonitor: block generation events monitoring stopping
	**/
	// I think it is more common to stop from the disconnect described later, but I will prepare for it.
	client.on('stopMonitor', function(reason) {
		Smonitor.stopMonitor(client.id);
	});

	client.on('disconnect', function(reason) {
		// Unexpected disconnect as well as explicit disconnect request can be received here
		logger.info('Client ' + client.id + ' disconnected.');
		logger.info('Reason    :' + reason);
		// Stop monitoring if disconnected client is for event monitoring
		Smonitor.stopMonitor(client.id);
	});

});

