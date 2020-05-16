import { Server } from "http";
import { Server as SecureServer } from "https";

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
}
