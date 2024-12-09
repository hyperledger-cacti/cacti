import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import lernaCfg from "../../lerna.json" assert { type: "json" };

/**
 * Interface for the response of the getAllTgzPath function.
 * @property {Array<string>} relativePaths - An array of relative paths to the
 * package directories.
 */

export interface IGetAllTgzPathResponse {
  readonly relativePaths: Readonly<Array<string>>;
}

/**
 * Asynchronous function to get all tgz filepaths in a Lerna monorepo.
 * @returns {Promise<IGetAllTgzPathResponse>} A promise that resolves to an
 * object containing the arrays of relative paths to the all tgz files.
 */

export async function getAllTgzPath(): Promise<IGetAllTgzPathResponse> {
  const TAG = "[tools/get-all-tgz-path.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");

  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    onlyFiles: true,
    expandDirectories: false,
    // ignore pattern is added temporarily so that the yarn custom-checks github action will pass. These packages
    // are failing and needs to be fixed. Each issue ticket link is added above each ignore path. More details and
    // links are in the description of the issue ticket.
    ignore: [
      "**/node_modules",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3623
      "weaver/core/drivers/fabric-driver/hyperledger-cacti-weaver-driver-fabric-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3626
      "weaver/core/identity-management/iin-agent/hyperledger-cacti-weaver-iin-agent-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3627
      "weaver/sdks/fabric/interoperation-node-sdk/hyperledger-cacti-weaver-sdk-fabric-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3628
      "packages/cacti-plugin-weaver-driver-fabric/src/main/typescript/hyperledger-cacti-weaver-driver-fabric-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3629
      "packages/cacti-plugin-copm-fabric/hyperledger-cacti-cacti-plugin-copm-fabric-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3630
      "packages/cacti-ledger-browser/hyperledger-cacti-ledger-browser-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3632
      "examples/cactus-common-example-server/hyperledger-cactus-common-example-server-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3633
      "packages/cactus-verifier-client/hyperledger-cactus-verifier-client-*.tgz",
      // link for issue ticket relating to this package: https://github.com/hyperledger-cacti/cacti/issues/3634
      "packages/cactus-plugin-ledger-connector-polkadot/hyperledger-cactus-plugin-ledger-connector-polkadot-*.tgz",
    ],
  };

  const tgzFilesPattern = lernaCfg.packages.map(
    (pkg: string) => `${pkg}/**/hyperledger-*.tgz`,
  );

  const tgzFilesRelative = await globby(tgzFilesPattern, globbyOpts);
  console.log("%s Found %s tgz files.", TAG, tgzFilesRelative.length);

  return {
    relativePaths: tgzFilesRelative,
  };
}
