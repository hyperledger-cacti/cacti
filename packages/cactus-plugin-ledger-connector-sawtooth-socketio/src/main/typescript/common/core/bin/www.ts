#!/usr/bin/env node

/*
 * Copyright 2021 Hyperledger Cactus Contributors
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

import app from "../app";
const debug = require("debug")("connector:server");
import https = require("https");
import * as config from "../config";
import fs = require("fs");
import { Server } from "socket.io"

// Log settings
import { getLogger } from "log4js";
const logger = getLogger("connector_main[" + process.pid + "]");
logger.level = config.read('logLevel', 'info');

// destination dependency (MONITOR) implementation class
import { ServerMonitorPlugin } from "../../../connector/ServerMonitorPlugin";
const Smonitor = new ServerMonitorPlugin();

/**
 * Get port from environment and store in Express.
 */

const sslport = normalizePort(process.env.PORT || config.read('sslParam.port'));
app.set("port", sslport);

// Specify private key and certificate
const sslParam = {
  key: fs.readFileSync(config.read('sslParam.key')),
  cert: fs.readFileSync(config.read('sslParam.cert')),
};

/**
 * Create HTTPS server.
 */

const server = https.createServer(sslParam, app); // Start as an https server.
const io = new Server(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(sslport, function () {
  console.log("listening on *:" + sslport);
});
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
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

function onError(error: any) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind =
    typeof sslport === "string" ? "Pipe " + sslport : "Port " + sslport;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
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

  if (!addr) {
    logger.error("Could not get running server address - exit.");
    process.exit(1);
  }

  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

io.on("connection", function (client) {
  logger.info("Client " + client.id + " connected.");

  /**
   * startMonitor: starting block generation event monitoring
   **/
  client.on("startMonitor", function (data) {
    Smonitor.startMonitor(client.id, data.filterKey, (callbackData) => {
      let emitType = "";
      if (callbackData.status == 200) {
        emitType = "eventReceived";
        logger.info("event data callbacked.");
      } else {
        emitType = "monitor_error";
      }
      client.emit(emitType, callbackData);
    });
  });
});
