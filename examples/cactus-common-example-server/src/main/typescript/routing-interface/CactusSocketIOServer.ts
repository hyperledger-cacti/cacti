#!/usr/bin/env node

/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * www.ts
 */

/**
 * Module dependencies.
 */

import { app, runExpressApp } from "../business-logic-plugin/app";
import debugModule = require("debug");
import http = require("http");
import { ConfigUtil } from "./util/ConfigUtil";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
import { BusinessLogicPlugin } from "../business-logic-plugin/BusinessLogicPlugin";
import { setTargetBLPInstance } from "../business-logic-plugin/BLP_config";
const moduleName = "www";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export type BLPConfig = {
  id: string;
  plugin: BusinessLogicPlugin;
};

export function startCactusSocketIOServer(
  blp?: BLPConfig | BLPConfig[],
  onListening?: () => void,
) {
  if (blp) {
    // Support both single and multiple BLPs
    if (!Array.isArray(blp)) {
      blp = [blp];
    }

    blp.forEach((cfg) => {
      logger.info("Using BLP with id =", cfg.id);
      setTargetBLPInstance(cfg.id, cfg.plugin);
    });
  }

  runExpressApp();

  /**
   * Get port from environment and store in Express.
   */
  const port = normalizePort(
    process.env.CACTUS_PORT || config.applicationHostInfo.hostPort,
  );

  const hostname: string =
    process.env.CACTUS_HOSTNAME ||
    config.applicationHostInfo.hostName ||
    "127.0.0.1";
  logger.info(`listening on ${hostname}:${port}`);
  app.set("port", port);

  /**
   * Create HTTP server.
   */
  const server = http.createServer(app);

  /**
   * Event listener for HTTP server "error" event.
   */

  function onError(error: any): void {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        logger.error(bind + " requires elevated privileges");
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger.error(bind + " is already in use");
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */
  if (!onListening) {
    onListening = () => {
      const addr = server.address();
      if (addr) {
        const bind =
          typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
        debugModule("Listening on " + bind);
      } else {
        throw new Error("Could not get server address!");
      }
    };
  }

  /**
   * Listen on provided port, on all network interfaces.
   */
  server.listen(port as number, hostname);
  server.on("error", onError);
  server.on("listening", onListening);

  return server;
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string): number | string | boolean {
  const nport = parseInt(val, 10);

  if (isNaN(nport)) {
    // named pipe
    return val;
  }

  if (nport >= 0) {
    // port number
    return nport;
  }

  return false;
}
