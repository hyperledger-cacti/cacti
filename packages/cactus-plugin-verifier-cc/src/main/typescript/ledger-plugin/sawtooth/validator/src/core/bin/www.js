#!/usr/bin/env node
"use strict";
/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * www.js
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* Summary:
 * Connector: a part independent of end-chains
 */
/**
 * Module dependencies.
 */
const app_1 = __importDefault(require("../app"));
const debug = require('debug')('connector:server');
const https = require("https");
const default_1 = require("../config/default");
import fs from "fs";
// Log settings
const log4js_1 = require("log4js");
const logger = log4js_1.getLogger('connector_main[' + process.pid + ']');
logger.level = default_1.config.logLevel;
// implementation class of a part dependent of end-chains (server plugin)
//import { ServerPlugin } from '../../dependent/ServerPlugin';
//const Splug = new ServerPlugin();
// destination dependency (MONITOR) implementation class
const ServerMonitorPlugin_1 = require("../../dependent/ServerMonitorPlugin");
const Smonitor = new ServerMonitorPlugin_1.ServerMonitorPlugin();
/**
 * Get port from environment and store in Express.
 */
const sslport = normalizePort(process.env.PORT || default_1.config.sslParam.port);
app_1.default.set('port', sslport);
// Specify private key and certificate
const sslParam = {
    key: fs.readFileSync(default_1.config.sslParam.key),
    cert: fs.readFileSync(default_1.config.sslParam.cert),
};
/**
 * Create HTTPS server.
 */
const server = https.createServer(sslParam, app_1.default); // Start as an https server.
const io = require('socket.io')(server);
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
    const port = parseInt(val, 10);
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
    const bind = typeof sslport === 'string'
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
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
io.on('connection', function (client) {
    logger.info('Client ' + client.id + ' connected.');
    /**
     * request: The server plugin's request to execute a function
     * @param {JSON} data: Request Body (following format)
     * JSON: {
     *          "func":        (string) Function name ,// For example : "transferNumericAsset"
     *          "args":        (Object) argument// for example , {"from" : "xxx" , "to" : "yyy" , "value" : "10,000"}
     *       }
    **/
    /*
        client.on('request', function(data) {
            const func = data.func;
            const args = data.args;
            console.log('##[HL-BC] Invoke smart contract to transfer asset(D1)');
            logger.info('*** REQUEST ***');
            logger.info('Client ID :' + client.id);
            logger.info('Data  :' + JSON.stringify(data));
    
            // Check for the existence of the specified function and call it if it exists.
            if (Splug.isExistFunction(func)) {
                // Can be called with Server plugin function name.
                Splug[func](args)
                .then((respObj) => {
                    logger.info('*** RESPONSE ***');
                    logger.info('Client ID :' + client.id);
                    logger.info('Response  :' + JSON.stringify(respObj));
                    client.emit("response", respObj);
                })
                .catch((errObj) => {
                    logger.error('*** ERROR ***');
                    logger.error('Client ID :' + client.id);
                    logger.error('Detail    :' + JSON.stringify(errObj));
                    client.emit("connector_error", errObj);
                });
            } else {
                // No such function
                const emsg = "Function " + func + " not found!";
                logger.error(emsg);
                const retObj = {
                    "status" : 504,
                    "errorDetail" : emsg
                };
                client.emit("connector_error", retObj);
            }
        });
    
        // TODO: "request2" -> "request"
        client.on('request2', function(data) {
            const methodType = data.method.type;
            // const args = data.args;
            const args = {};
            args["contract"] = data.contract;
            args["method"] = data.method;
            args["args"] = data.args;
            if (data.reqID !== undefined) {
                logger.info(`##add reqID: ${data.reqID}`);
                args["reqID"] = data.reqID;
            }
    
    
            console.log('##[HL-BC] Invoke smart contract to transfer asset(D1)');
            logger.info('*** REQUEST ***');
            logger.info('Client ID :' + client.id);
            logger.info('Data  :' + JSON.stringify(data));
    
            // Check for the existence of the specified function and call it if it exists.
            if (methodType === "web3Eth") {
                // Can be called with Server plugin function name.
                Splug.web3Eth(args)
                .then((respObj) => {
                    logger.info('*** RESPONSE ***');
                    logger.info('Client ID :' + client.id);
                    logger.info('Response  :' + JSON.stringify(respObj));
                    client.emit("response", respObj);
                })
                .catch((errObj) => {
                    logger.error('*** ERROR ***');
                    logger.error('Client ID :' + client.id);
                    logger.error('Detail    :' + JSON.stringify(errObj));
                    client.emit("connector_error", errObj);
                });
            } else if (methodType === "contract") {
                // Can be called with Server plugin function name.
                Splug.contract(args)
                .then((respObj) => {
                    logger.info('*** RESPONSE ***');
                    logger.info('Client ID :' + client.id);
                    logger.info('Response  :' + JSON.stringify(respObj));
                    client.emit("response", respObj);
                })
                .catch((errObj) => {
                    logger.error('*** ERROR ***');
                    logger.error('Client ID :' + client.id);
                    logger.error('Detail    :' + JSON.stringify(errObj));
                    client.emit("connector_error", errObj);
                });
            } else {
                // No such function
                const emsg = "method.type " + methodType + " not found!";
                logger.error(emsg);
                const retObj = {
                    "status" : 504,
                    "errorDetail" : emsg
                };
                client.emit("connector_error", retObj);
            }
        });
    */
    /**
     * startMonitor: starting block generation event monitoring
    **/
    client.on('startMonitor', function (data) {
        // Callback to receive monitoring results
        const cb = function (callbackData) {
            let emitType = "";
            if (callbackData.status == 200) {
                emitType = "eventReceived";
                logger.info('event data callbacked.');
            }
            else {
                emitType = "monitor_error";
            }
            client.emit(emitType, callbackData);
        };
        Smonitor.startMonitor(client.id, data.filterKey, cb);
    });
    /**
     * stopMonitor: block generation events monitoring stopping
    **/
    /*
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
    */
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3d3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid3d3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7Ozs7O0dBS0c7Ozs7O0FBRUg7O0dBRUc7QUFFSDs7R0FFRztBQUVILGlEQUF5QjtBQUN6QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNuRCwrQkFBZ0M7QUFDaEMsK0NBQTJDO0FBQzNDLHlCQUEwQjtBQUUxQixlQUFlO0FBQ2YsbUNBQW1DO0FBQ25DLE1BQU0sTUFBTSxHQUFHLGtCQUFTLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNoRSxNQUFNLENBQUMsS0FBSyxHQUFHLGdCQUFNLENBQUMsUUFBUSxDQUFDO0FBRS9CLHlFQUF5RTtBQUN6RSw4REFBOEQ7QUFDOUQsbUNBQW1DO0FBRW5DLHdEQUF3RDtBQUN4RCw2RUFBMEU7QUFDMUUsTUFBTSxRQUFRLEdBQUcsSUFBSSx5Q0FBbUIsRUFBRSxDQUFDO0FBRTNDOztHQUVHO0FBRUgsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLGdCQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hFLGFBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRXpCLHNDQUFzQztBQUN0QyxNQUFNLFFBQVEsR0FBRztJQUNiLEdBQUcsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGdCQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztJQUN6QyxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Q0FDOUMsQ0FBQztBQUVGOztHQUVHO0FBRUgsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUs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