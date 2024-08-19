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
 */

import http from "http";
import https from "https";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [nodeBinary, script, protocol, host, port, path] = process.argv;

const thePath =
  path ?? "/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck";
const isSecureHttp = protocol === "https";
const httpModule = isSecureHttp ? https : http;

const url = `${protocol}://${host}:${port}${thePath}`;

httpModule
  .get(url, (res) => {
    const { statusCode, statusMessage } = res;
    const exitCode = statusCode >= 200 && statusCode <= 300 ? 0 : 1;
    if (exitCode === 0) {
      console.log("%s Healthcheck OK: ", url, statusCode, statusMessage);
    } else {
      console.error("%s Healthcheck FAIL_1: ", url, statusCode, statusMessage);
    }
    process.exit(exitCode);
  })
  .on("error", (ex) => {
    console.error("%s Healthcheck FAIL_2: ", url, ex);
    process.exit(1);
  });
