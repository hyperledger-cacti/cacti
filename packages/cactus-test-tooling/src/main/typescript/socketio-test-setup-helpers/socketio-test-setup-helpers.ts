/**
 * Helper module for setting up client/server test sockets.
 */

import {
  Server,
  ServerOptions as SocketServerOptions,
  Socket as ServerSocket,
} from "socket.io";
import { io, Socket as ClientSocket } from "socket.io-client-fixed-types";
import { createServer } from "http";

export { Server, ServerSocket, ClientSocket };

/**
 * Create a socket.io server listening on random local port for test purposes.
 *
 * @returns [socketio Server, port]
 */
export function createListeningMockServer(): Promise<[Server, string]> {
  return new Promise((resolve, reject) => {
    const httpServer = createServer();
    httpServer.unref();

    const socketServerOptions: Partial<SocketServerOptions> = {
      transports: ["websocket"],
      cookie: false,
    };

    const testServer = new Server(httpServer, socketServerOptions);

    httpServer.listen(0, () => {
      const addrInfo = httpServer.address();

      if (addrInfo && typeof addrInfo == "object") {
        const port = addrInfo.port.toString();
        resolve([testServer, port]);
      } else {
        reject(Error("Couldn't create mock server"));
      }
    });
  });
}

/**
 * Create client socket to 127.0.0.1.
 *
 * @port - Localhost port to connect to.
 */
export function createClientSocket(port: string): ClientSocket {
  const clientSocketOpts = {
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ["websocket"],
  };

  return io(`http://127.0.0.1:${port}`, clientSocketOpts);
}

/**
 * Connects supplied client to the test server.
 * @returns connected client socket
 */
export function connectTestClient(socket: ClientSocket): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    // Install setup-time error handlers
    const errorHandlerFactory = (event: string) => {
      // TODO - Better logging / Remove this
      return (err: Record<string, unknown> | Error) => {
        if (socket) {
          console.log("connect error - event", event);
          socket.close();
          reject(err);
        }
      };
    };

    socket.on("error", errorHandlerFactory("error"));
    socket.on("connect_error", errorHandlerFactory("connect_error"));
    socket.on("connect_timeout", errorHandlerFactory("connect_timeout"));

    socket.on("connect", () => {
      //socket.removeAllListeners();
      resolve(socket);
    });
  });
}
