import { AddressInfo, ListenOptions } from "net";
import { Server } from "http";
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
    if (!server) {
      throw new TypeError(`Servers#shutdown() server was falsy. Need object.`);
    }
    return new Promise<void>((resolve, reject) => {
      server.close((err: any) => {
        if (err) {
          reject(
            new Error(
              `Servers#shutdown() Failed to shut down server: ${err.stack}`
            )
          );
        } else {
          resolve();
        }
      });
    });
  }

  public static async listen(options: IListenOptions): Promise<any> {
    const fnTag = "Servers#listen()";

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.server, `${fnTag} arg options.server`);
    Checks.truthy(options.port, `${fnTag} arg options.port`);
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
}
