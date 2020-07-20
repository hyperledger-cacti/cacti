#!/usr/bin/env node

/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 *
 * www.ts
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
var https = require('http');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('connector_main[' + process.pid + ']');
logger.level = config.logLevel;

// implementation class of a part dependent of end-chains (server plugin)
// var ServerPlugin = require('../../dependent/ServerPlugin.js');
// var Splug = new ServerPlugin();
// destination dependency (MONITOR) implementation class
// var ServerMonitorPlugin = require('../../dependent/ServerMonitorPlugin.js');
// var Smonitor = new ServerMonitorPlugin();

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

var server = https.createServer(app);   // Start as an https server.
// var io = require('socket.io')(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(sslport, function () {
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

