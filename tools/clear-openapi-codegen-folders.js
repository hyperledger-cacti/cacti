import { globby } from "globby";
import { rm } from "fs";
import { readFile } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LERNA_JSON = "lerna.json";
const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
const OPENAPI_CODEGEN_PATHS = [
  "src/main/kotlin/generated/openapi/**",
  "src/main/typescript/generated/openapi/typescript-axios/**",
  "src/main-server/kotlin/gen/kotlin-spring/src/main/kotlin/**/server/(api|model|!impl)/**",
  "src/main-server/kotlin/gen/kotlin-spring/src/test/kotlin/**/server/(api|model|!impl)/**",
];
const lernaJsonStr = await readFile(PROJECT_DIR + LERNA_JSON, "utf-8");
const lernaJson = JSON.parse(lernaJsonStr);

let openapiGeneratorFilePatterns = [];
OPENAPI_CODEGEN_PATHS.forEach((OPENAPI_CODEGEN_PATH) => {
  openapiGeneratorFilePatterns.push(
    ...lernaJson.packages.map((it) =>
      "./".concat(it).concat(`/${OPENAPI_CODEGEN_PATH}`),
    ),
  );
});

const globbyOptions = {
  cwd: PROJECT_DIR,
  absolute: true,
  onlyFiles: false,
};
const openapiGeneratorFilePaths = await globby(
  openapiGeneratorFilePatterns,
  globbyOptions,
);
console.log(
  `Deleting openapi generator file paths (${openapiGeneratorFilePaths.length}): `,
  openapiGeneratorFilePaths,
);
openapiGeneratorFilePaths.forEach((openapiGeneratorFilePath) => {
  rm(openapiGeneratorFilePath, { recursive: true, force: true }, () => {});
});
