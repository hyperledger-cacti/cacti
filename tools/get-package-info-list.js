// Turning this off for this file is needed so that ESLint doesn't bother
// us with unfixable warnings in a Javascript file (not Typescript).
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { execSync } from "child_process";
import fs from "fs-extra";

/**
 * Example:
 * {
 *   name: '@hyperledger/cactus-core-api',
 *   version: '0.2.0',
 *   private: false,
 *   location: '/home/peter/a/blockchain/blockchain-integration-framework/packages/cactus-core-api'
 *   packageObject: {
 *    ...
 *   }
 * };
 *
 * @typedef {Object} PackageInfo
 * @property {string} name Name of the package as listed on npm/other registry.
 * @property {string} version Package version as listed on npm/other registry.
 * @property {boolean} private Indicates if the package is meant to be published or not.
 * @property {string} location Absolute file-system path to the package root directory.
 * @property {string[]} localDependencies The packages in this mono-repo that the current package is dependent on.
 * @property {object} packageObject The contents of the package.json file as a JS object
 * @property {string} packageObject.main The main field is a module ID that is the primary entry point to your program.
 * @property {string} packageObject.mainMinified Same as main but minified for production.
 * @property {string} packageObject.browser Primary entry point for the browser compatible build of the code.
 * @property {string} packageObject.browserMinified Same as browser but the production ready, minified version.
 * @property {string} packageObject.module An ECMAScript module ID that is the primary entry point to your program.
 * @property {string} packageObject.types Set the types property to point to your bundled declaration file.
 * @property {string[]} packageObject.files The 'files' field is an array of files to include in your project.
 * If you name a folder in the array, then it will also include the files inside that folder.
 */

/** @typedef {Object<string, string[]} PackageDependencyGraph */

/**
 * @returns {PackageDependencyGraph}
 */
const getDependencyGraph = () => {
  const cliCommand = `./node_modules/.bin/lerna list --all --graph --toposort`;
  const processOutputBuffer = execSync(cliCommand);
  const processOutput = processOutputBuffer.toString("utf-8");

  /** @type {PackageDependencyGraph} */
  const dependencyGraph = JSON.parse(processOutput);

  return dependencyGraph;
};

/**
 * Returns an array of objects that represent the packages of the project.
 * Useful when developing build related scripts that need a surefire way of
 * obtaining the project folders/package names, etc without having to do
 * cross-platform shell magic.
 *
 * @param {RegExp[]} ignorePatterns Patterns that will be checked for exclusion
 *
 * @returns {PackageInfo[]}
 */
export function getPackageInfoList(ignorePatterns = []) {
  const cliCommand = `./node_modules/.bin/lerna list --all --json --toposort`;
  const processOutputBuffer = execSync(cliCommand);
  const processOutput = processOutputBuffer.toString("utf-8");

  /** @type {PackageInfo[]} */
  const pkgInfoList = JSON.parse(processOutput).filter(
    (pkgInfo) => !ignorePatterns.some((ip) => ip.test(pkgInfo.name))
  );

  pkgInfoList.forEach((pkgInfo) => {
    pkgInfo.packageObject = fs.readJsonSync(`${pkgInfo.location}/package.json`);
  });

  /** @type {PackageDependencyGraph} */
  const dependencyGraph = getDependencyGraph();

  pkgInfoList.forEach((pkgInfo) => {
    pkgInfo.localDependencies = dependencyGraph[pkgInfo.name]
      .filter((pkgName) => !ignorePatterns.some((ip) => ip.test(pkgName)))
      .filter((pkgName) => pkgName.startsWith("@hyperledger/cactus"));
  });

  return pkgInfoList;
}
