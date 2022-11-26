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

import app from "../app";
import https = require("https");

// Overwrite config read path
export const DEFAULT_NODE_CONFIG_DIR =
  "/etc/cactus/connector-go-ethereum-socketio/";
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

// implementation class of a part dependent of end-chains (server plugin)
import { ServerPlugin } from "../../../connector/ServerPlugin";

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

export async function startGoEthereumSocketIOConnector() {
  const Splug = new ServerPlugin();
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
        break;
      case "EADDRINUSE":
        console.error(bind + " is already in use");
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  io.on("connection", function (client) {
    logger.info("Client " + client.id + " connected.");

    /**
     * request: The server plugin's request to execute a function
     * @param {JSON} data: Request Body (following format)
     * JSON: {
     *          "func":        (string) Function name ,// For example : "transferNumericAsset"
     *          "args":        (Object) argument// for example , {"from" : "xxx" , "to" : "yyy" , "value" : "10,000"}
     *       }
     **/
    client.on("request", function (data) {
      const func = data.func;
      const args = data.args;
      console.log("##[HL-BC] Invoke smart contract to transfer asset(D1)");
      logger.info("*** REQUEST ***");
      logger.info("Client ID :" + client.id);
      logger.info("Data  :" + JSON.stringify(data));

      // Check for the existence of the specified function and call it if it exists.
      if (Splug.isExistFunction(func)) {
        // Can be called with Server plugin function name.
        (Splug as any)[func](args)
          .then((respObj: unknown) => {
            logger.info("*** RESPONSE ***");
            logger.info("Client ID :" + client.id);
            logger.info("Response  :" + JSON.stringify(respObj));
            client.emit("response", respObj);
          })
          .catch((errObj: unknown) => {
            logger.error("*** ERROR ***");
            logger.error("Client ID :" + client.id);
            logger.error("Detail    :" + JSON.stringify(errObj));
            client.emit("connector_error", errObj);
          });
      } else {
        // No such function
        const emsg = "Function " + func + " not found!";
        logger.error(emsg);
        const retObj = {
          status: 504,
          errorDetail: emsg,
        };
        client.emit("connector_error", retObj);
      }
    });

    // TODO: "request2" -> "request"
    client.on("request2", function (data) {
      const methodType = data.method.type;
      let args: Record<string, any> = {
        contract: data.contract,
        method: data.method,
        args: data.args,
      };

      if (data.reqID !== undefined) {
        logger.info(`##add reqID: ${data.reqID}`);
        args["reqID"] = data.reqID;
      }

      console.log("##[HL-BC] Invoke smart contract to transfer asset(D1)");
      logger.info("*** REQUEST ***");
      logger.info("Client ID :" + client.id);
      logger.info("Data  :" + JSON.stringify(data));

      // Check for the existence of the specified function and call it if it exists.
      if (methodType === "web3Eth") {
        // Can be called with Server plugin function name.
        Splug.web3Eth(args)
          .then((respObj) => {
            logger.info("*** RESPONSE ***");
            logger.info("Client ID :" + client.id);
            logger.info("Response  :" + JSON.stringify(respObj));
            client.emit("response", respObj);
          })
          .catch((errObj) => {
            logger.error("*** ERROR ***");
            logger.error("Client ID :" + client.id);
            logger.error("Detail    :" + JSON.stringify(errObj));
            client.emit("connector_error", errObj);
          });
      } else if (methodType === "contract") {
        // Can be called with Server plugin function name.
        Splug.contract(args)
          .then((respObj) => {
            logger.info("*** RESPONSE ***");
            logger.info("Client ID :" + client.id);
            logger.info("Response  :" + JSON.stringify(respObj));
            client.emit("response", respObj);
          })
          .catch((errObj) => {
            logger.error("*** ERROR ***");
            logger.error("Client ID :" + client.id);
            logger.error("Detail    :" + JSON.stringify(errObj));
            client.emit("connector_error", errObj);
          });
      } else if (methodType === "function") {
        const func = args["method"].command;
        // Check for the existence of the specified function and call it if it exists.
        if (Splug.isExistFunction(func)) {
          // Can be called with Server plugin function name.
          (Splug as any)[func](args)
            .then((respObj: unknown) => {
              logger.info("*** RESPONSE ***");
              logger.info("Client ID :" + client.id);
              logger.info("Response  :" + JSON.stringify(respObj));
              client.emit("response", respObj);
            })
            .catch((errObj: unknown) => {
              logger.error("*** ERROR ***");
              logger.error("Client ID :" + client.id);
              logger.error("Detail    :" + JSON.stringify(errObj));
              client.emit("connector_error", errObj);
            });
        } else {
          // No such function
          const emsg = "Function " + func + " not found!";
          logger.error(emsg);
          const retObj = {
            status: 504,
            errorDetail: emsg,
          };
          client.emit("connector_error", retObj);
        }
      } else {
        // No such function
        const emsg = "method.type " + methodType + " not found!";
        logger.error(emsg);
        const retObj = {
          status: 504,
          errorDetail: emsg,
        };
        client.emit("connector_error", retObj);
      }
    });

    /**
     * startMonitor: starting block generation event monitoring
     **/
    client.on("startMonitor", function () {
      Smonitor.startMonitor(client.id, (event) => {
        let emitType = "";
        if (event.status == 200) {
          emitType = "eventReceived";
          logger.info("event data callbacked.");
        } else {
          emitType = "monitor_error";
        }
        client.emit(emitType, event);
      });
    });

    /**
     * stopMonitor: block generation events monitoring stopping
     **/
    // I think it is more common to stop from the disconnect described later, but I will prepare for it.
    client.on("stopMonitor", function (reason) {
      Smonitor.stopMonitor(client.id).then(() => {
        logger.info("stopMonitor completed.");
      })
    });

    client.on("disconnect", function (reason) {
      // Unexpected disconnect as well as explicit disconnect request can be received here
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
  startGoEthereumSocketIOConnector().then((server) => {
    const addr = server.address();

    if (!addr) {
      logger.error("Could not get running server address - exit.");
      process.exit(1);
    }

    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    logger.debug("Listening on " + bind);
  }).catch((err) => {
    logger.error("Could not start go-ethereum-socketio connector:", err);
  });
}
