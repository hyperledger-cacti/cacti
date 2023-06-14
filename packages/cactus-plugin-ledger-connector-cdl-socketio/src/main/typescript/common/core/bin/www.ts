#!/usr/bin/env node

import app from "../app";
import { read as configRead } from "../config";

import axios from "axios";
import https from "https";
import fs from "fs";
import { Server } from "socket.io";
import safeStringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";

// Log settings
import { getLogger } from "log4js";
const logger = getLogger("connector_main[" + process.pid + "]");
logger.level = configRead("logLevel", "info");

// implementation class of a part dependent of end-chains (server plugin)
import { ServerPlugin } from "../../../connector/ServerPlugin";
import { ValidatorAuthentication } from "../../../connector/ValidatorAuthentication";

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

/**
 * Return secure string representation of error from the input.
 * Handles circular structures and removes HTML.
 *
 * @param error Any object to return as an error, preferable `Error`
 * @returns Safe string representation of an error.
 */
export function safeStringifyException(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return safeStringify(error.toJSON());
  }

  if (error instanceof Error) {
    return sanitizeHtml(error.stack || error.message);
  }

  return sanitizeHtml(safeStringify(error));
}

export async function startCDLSocketIOConnector() {
  const Splug = new ServerPlugin();

  // Get port from environment and store in Express.
  const sslport = normalizePort(
    process.env.PORT || configRead("sslParam.port"),
  );
  app.set("port", sslport);

  // Specify private key and certificate
  let keyString: string;
  let certString: string;
  try {
    keyString = configRead<string>("sslParam.keyValue");
    certString = configRead<string>("sslParam.certValue");
  } catch {
    keyString = fs.readFileSync(configRead("sslParam.key"), "ascii");
    certString = fs.readFileSync(configRead("sslParam.cert"), "ascii");
  }

  // Create HTTPS server.
  const server = https.createServer(
    {
      key: keyString,
      cert: certString,
    },
    app,
  ); // Start as an https server.
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

  io.on("connection", (client) => {
    logger.info("Client " + client.id + " connected.");

    client.on("request2", async (data) => {
      try {
        const result = await Splug.executeFunction({
          method: data.method,
          args: data.args,
          reqID: data.reqID,
        });
        const response = {
          resObj: {
            status: 200,
            data: ValidatorAuthentication.sign({ result }),
          },
          id: data.reqID,
        };
        logger.info("Client ID :" + client.id);
        logger.info("Response:", JSON.stringify(response));
        client.emit("response", response);
      } catch (error: unknown) {
        const errorObj = {
          resObj: {
            status: 504,
            errorDetail: safeStringifyException(error),
          },
          id: data.reqID,
        };
        logger.error("request2 connector_error:", JSON.stringify(errorObj));
        client.emit("connector_error", errorObj);
      }
    });

    client.on("disconnect", function (reason) {
      // Unexpected disconnect as well as explicit disconnect request can be received here
      logger.info("Client", client.id, "disconnected.");
      logger.info("Reason    :", reason);
    });
  });

  // Listen on provided port, on all network interfaces.
  return new Promise<https.Server>((resolve) =>
    server.listen(sslport, () => resolve(server)),
  );
}

if (require.main === module) {
  // When this file executed as a script, not loaded as module - run the connector
  startCDLSocketIOConnector()
    .then((server) => {
      const addr = server.address();

      if (!addr) {
        logger.error("Could not get running server address - exit.");
        process.exit(1);
      }

      const bind =
        typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
      logger.debug("Listening on " + bind);
    })
    .catch((err) => {
      logger.error("Could not start cdl-socketio connector:", err);
    });
}
