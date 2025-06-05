/**
 * The healthcheck script for the Cacti API Server written in pure NodeJS without
 * any external dependencies.
 *
 * USAGE
 * -----
 *
 * ```sh
 * $ node cmd-api-server.Dockerfile.healthcheck.mjs http localhost 4000
 * http://localhost:4000/api/v1/api-server/healthcheck Healthcheck OK:  200 OK
 * ```
 *
 * FAQ
 * ---
 *
 * Q: Why though? Why not just use cURL or wget
 * or any other command line utility to perform HTTP requests?
 * A: This has zero OS level package dependencies and will work without the
 *    container image having to have new software installed. This reduces the footprint
 *    of the image and also the attack surfaces that we have. The slight increase in
 *    complexity is a trade-off we consider worth having because this script is not
 *    part of the API server's own codebase and therefore does not affect the complexity
 *    of that as such.
 *
 * Now we are using cURL to perform the healthcheck... We reached a weird problem when
 * we were forwarding ports, making the node implementation not work.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { exec } from "child_process";

const [, , protocol, host, port, path] = process.argv;

const thePath =
  path ?? "/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck";

const url = `${protocol}://${host}:${port}${thePath}`;

function runCurl(url) {
  return new Promise((resolve, reject) => {
    const command = `curl "${url}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running curl: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        reject(new Error(`Curl command failed with error: ${error.message}`));
        return;
      }

      if (stderr) {
        console.warn(`Curl reported warnings: ${stderr}`);
      }

      console.log("Curl output:");
      console.log(stdout);
      resolve(stdout);
    });
  });
}

runCurl(url)
  .then((output) => {
    if (output.trim() === '{"status":"AVAILABLE"}') {
      console.log("Healthcheck passed.");
      process.exit(0);
    } else {
      console.error("Healthcheck failed: Unexpected output.");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Failed to run curl:", error.message);
    process.exit(1);
  });
