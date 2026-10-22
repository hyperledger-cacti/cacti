/**
 * Writes the openapi-generator-cli version selection file (openapitools.json)
 * consumed by @openapitools/openapi-generator-cli at runtime.
 *
 * The file is gitignored and removed again by the codegen:cleanup script, so
 * it has to be (re-)created before every codegen run. Pinning the version here
 * means the CLI runs the exact jar that codegen:warmup-v7.26.0 fetched from
 * Maven Central into node_modules/@openapitools/openapi-generator-cli/versions.
 */
const fs = require("fs");

const config = {
  $schema: "./node_modules/@openapitools/openapi-generator-cli/config.schema.json",
  spaces: 2,
  "generator-cli": {
    version: "7.26.0",
  },
};

fs.writeFileSync("openapitools.json", JSON.stringify(config, null, 2) + "\n");
console.log("openapitools.json written (generator-cli version 7.26.0)");
