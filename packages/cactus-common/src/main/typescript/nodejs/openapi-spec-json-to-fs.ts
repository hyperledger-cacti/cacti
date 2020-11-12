import { OpenAPIV3 } from "openapi-types";

/**
 * Options to customize how the `openApiSpecJsonToFs()` function exports
 * an OpenAPI spec to JSON format to the local file-system.
 */
export interface IOpenApiSpecJsonToFsOptions {
  /**
   * The actual specification document (object) that holds the information we
   * will export to JSON onto the local filesystem.
   */
  openApiSpec: OpenAPIV3.Document;
  /**
   * Absolute path on the file-system for the calling script file
   * (e.g. `__dirname` in a NodeJS environment).
   */
  callerScriptPath: string;
  /**
   * Defaults to "../json/generated/"
   */
  relativePath?: string;
  /**
   * The target filename to export the JSON created from the OpenAPI spec.
   * Defaults to "openapi-spec.json"
   */
  filename?: string;
}

export const DEFAULT_RELATIVE_PATH: string = "../json/generated/";

export const DEFAULT_FILENAME: string = "openapi-spec.json";

export async function openApiSpecJsonToFs(
  opts: IOpenApiSpecJsonToFsOptions
): Promise<void> {
  const fnTag = "#openApiSpecJsonToFs()";

  const fs = await import("fs");
  const path = await import("path");

  const filename = opts.filename || DEFAULT_FILENAME;
  const relativePath = opts.relativePath || DEFAULT_RELATIVE_PATH;
  const callerScriptPath = opts.callerScriptPath;
  const defaultDest = path.join(callerScriptPath, relativePath, filename);
  const destination = process.argv[2] || defaultDest;

  // tslint:disable-next-line: no-console
  console.log(`${fnTag} destination=${destination}`);

  fs.writeFileSync(destination, JSON.stringify(opts.openApiSpec, null, 4));
}
