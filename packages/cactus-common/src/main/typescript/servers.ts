import { AddressInfo, ListenOptions } from "net";
import { Server, createServer } from "http";
import { Server as SecureServer } from "https";
import { Checks } from "./checks";

export interface IListenOptions {
  server: Server | SecureServer;
  port: number;
  hostname: string;
}

/**
 * Utility class for handling common tasks for NodeJS HTTP/S server objects.
 */
export class Servers {
  /**
   * Returns with a promise that resolves when the server has been shut down. Rejects if anything goes wrong of if the
   * parameters are invalid.
   *
   * @param server The server object that will be shut down.
   */
  public static async shutdown(server: Server | SecureServer): Promise<void> {
    const fnTag = `Servers#shutdown()`;
    if (!server) {
      throw new TypeError(`${fnTag} server was falsy. Need object.`);
    }
    return new Promise<void>((resolve, reject) => {
      server.close((err: Error | undefined) => {
        if (err) {
          reject(new Error(`${fnTag} Failed to shut down server ${err.stack}`));
        } else {
          resolve();
        }
      });
    });
  }

  public static async listen(options: IListenOptions): Promise<AddressInfo> {
    const fnTag = "Servers#listen()";

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.server, `${fnTag} arg options.server`);
    Checks.truthy(
      options.port || options.port === 0,
      `${fnTag} arg options.port`,
    );
    Checks.truthy(
      typeof options.port === "number",
      `${fnTag} arg options.port is number`,
    );
    Checks.truthy(isFinite(options.port), `${fnTag} arg finite options.port`);
    Checks.truthy(options.port > -1, `${fnTag} arg positive options.port`);
    Checks.truthy(options.hostname, `${fnTag} arg options.hostname`);
    const { server, port, hostname } = options;

    return new Promise((resolve, reject) => {
      server.on("error", (ex) => reject(ex));

      const listenOptions: ListenOptions = {
        host: hostname,
        port,
      };

      // called when the `listening` event is fired
      const onListeningHandler = () => {
        const addressInfo = options.server.address() as AddressInfo;
        resolve(addressInfo);
      };

      server.listen(listenOptions, onListeningHandler);
    });
  }

  /**
   * Start an HTTP server on the preferred port provided in the parameter if
   * possible, bind to a random (0) port otherwise.
   *
   * @param preferredPort The TCP port the caller would **prefer** to use if
   * possible. If the preferred port is taken, it will bind the server to port
   * zero instead which means that the operating system will randomly choose an
   * available port and use that.
   */
  public static async startOnPreferredPort(
    preferredPort?: number,
    host = "127.0.0.1",
  ): Promise<Server> {
    if (preferredPort) {
      try {
        const server = await Servers.startOnPort(preferredPort, host);
        return server;
      } catch (ex) {
        // if something else went wrong we still want to just give up
        if (!ex.message.includes("EADDRINUSE")) {
          throw ex;
        }
      }
      return Servers.startOnPort(0);
    } else {
      return Servers.startOnPort(0);
    }
  }

  public static async startOnPort(
    port: number,
    host = "127.0.0.1",
  ): Promise<Server> {
    const server: Server = await new Promise((resolve, reject) => {
      const aServer: Server = createServer();
      aServer.once("listening", () => resolve(aServer));
      aServer.once("error", (err: Error) => reject(err));
      aServer.listen(port, host);
    });

    return server;
  }
}
