"use strict";

/**
 * Loads an ES module with a native dynamic import().
 *
 * The Canton SDK packages must be loaded through their ES module entry
 * points, so the import() must not be rewritten to require():
 * - The package build compiles with "module": "node16", which keeps import()
 *   native in CommonJS output.
 * - Jest compiles TypeScript with the repository's CommonJS settings, which
 *   would rewrite import() in a .ts file, but it does not transform
 *   JavaScript files. Keeping this helper in JavaScript leaves the import()
 *   native under Jest too, without eval or the Function constructor.
 *
 * @param {string} specifier A package name or file: URL to import.
 * @returns {Promise<unknown>} The module namespace object.
 */
function importEsmModule(specifier) {
  return import(specifier);
}

module.exports = { importEsmModule };
