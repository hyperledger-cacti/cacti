/**
 * Helper module for setting up client/server test sockets.
 */

import ioServer from "socket.io";
import io from "socket.io-client";
import { createServer } from "http";

export { ioServer };

/**
 * Create a socket.io server listening on random local port for test purposes.
 * Returns [server, port]
 */
export function createListeningMockServer(): Promise<
  [SocketIO.Server, string]
> {
  return new Promise((resolve, reject) => {
    const httpServer = createServer();
    httpServer.unref();

    const testServer = ioServer(httpServer, {
      transports: ["websocket"],
      cookie: false,
    });

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
 * Create client socket.
 */
export function createClientSocket(port: string): SocketIOClient.Socket {
  return io(`http://localhost:${port}`, {
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ["websocket"],
  });
}

/**
 * Connects supplied client to the test server.
 * Returns client Socket
 */
export function connectTestClient(
  socket: SocketIOClient.Socket,
): Promise<SocketIOClient.Socket> {
  return new Promise((resolve, reject) => {
    // Install setup-time error handlers
    let errorHandlerFactory = (event: string) => {
      return (err: object) => {
        if (socket) {
          socket.close();
          reject(err);
        }
      };
    };

    socket.on("error", errorHandlerFactory("connect_error"));
    socket.on("connect_error", errorHandlerFactory("connect_error"));
    socket.on("connect_timeout", errorHandlerFactory("connect_error"));

    socket.on("connect", () => {
      socket.removeAllListeners();
      resolve(socket);
    });
  });
}
