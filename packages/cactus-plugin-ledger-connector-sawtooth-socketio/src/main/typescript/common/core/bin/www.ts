#!/usr/bin/env node

/*
 * Copyright 2022 Hyperledger Cactus Contributors
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
import https = require("https");

// Overwrite config read path
export const DEFAULT_NODE_CONFIG_DIR =
  "/etc/cactus/connector-sawtooth-socketio/";
if (!process.env["NODE_CONFIG_DIR"]) {
  // Must be set before import config
  process.env["NODE_CONFIG_DIR"] = DEFAULT_NODE_CONFIG_DIR;
}
import { configRead } from "@hyperledger/cactus-cmd-socketio-server";

import fs = require("fs");
import { Server } from "socket.io"
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("connector_main[" + process.pid + "]");
logger.level = configRead('logLevel', 'info');

// destination dependency (MONITOR) implementation class
import { ServerMonitorPlugin } from "../../../connector/ServerMonitorPlugin";

// Normalize a port into a number, string, or false.
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

export async function startSawtoothSocketIOConnector() {
  const Smonitor = new ServerMonitorPlugin();

  // Get port from environment and store in Express.
  const sslport = normalizePort(process.env.PORT || configRead('sslParam.port'));
  app.set("port", sslport);

  // Specify private key and certificate
  let keyString: string;
  let certString: string;
  try {
    keyString = configRead<string>('sslParam.keyValue');
    certString = configRead<string>('sslParam.certValue');
  } catch {
    keyString = fs.readFileSync(configRead('sslParam.key'), "ascii");
    certString = fs.readFileSync(configRead('sslParam.cert'), "ascii");
  }

  // Create HTTPS server.
  const server = https.createServer({
    key: keyString,
    cert: certString,
  }, app); // Start as an https server.
  const io = new Server(server);

  // Event listener for HTTPS server "error" event.
  server.on("error", (error: any) => {
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
      case "EADDRINUSE":
        console.error(bind + " is already in use");
        process.exit(1);
      default:
        throw error;
    }
  });

  io.on("connection", function (client) {
    logger.info("Client " + client.id + " connected.");

    // startMonitor: starting block generation event monitoring
    client.on("startMonitor", function (data) {

      if (!data || !data.filterKey) {
        client.emit("error", {
          status: 400,
          errorDetail: "filterKey is required for startMonitor on sawtooth ledger",
        });
      }

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


    client.on("stopMonitor", function () {
      Smonitor.stopMonitor(client.id);
    });

    client.on("disconnect", function (reason) {
      logger.info("Client " + client.id + " disconnected.");
      logger.info("Reason    :" + reason);
      // Stop monitoring if disconnected client is for event monitoring
      Smonitor.stopMonitor(client.id);
    });
  });

  // Listen on provided port, on all network interfaces.
  return new Promise<https.Server>((resolve) => server.listen(sslport, () => resolve(server)));
}

if (require.main === module) {
  // When this file executed as a script, not loaded as module - run the connector
  startSawtoothSocketIOConnector().then((server) => {
    const addr = server.address();

    if (!addr) {
      logger.error("Could not get running server address - exit.");
      process.exit(1);
    }

    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    logger.debug("Listening on " + bind);
  }).catch((err) => {
    logger.error("Could not start sawtooth-socketio connector:", err);
  });
}
