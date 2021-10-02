import esMain from "es-main";
import { checkOpenApiJsonSpecs } from "./check-open-api-json-specs";

export async function runCustomChecks(
  argv: string[],
  env: NodeJS.ProcessEnv,
  version: string,
): Promise<void> {
  const TAG = "[tools/custom-checks/check-source-code.ts]";
  let overallSuccess = true;
  let overallErrors: string[] = [];

  const [majorVersion] = version.split(".");
  const nodeV12OrOlder = parseInt(majorVersion) <= 12;
  if (nodeV12OrOlder) {
    console.log(`${TAG} Checks skipped due to old NodeJS (v${version}) OK.`);
    return;
  }

  {
    const [success, errors] = await checkOpenApiJsonSpecs({ argv, env });
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  if (!overallSuccess) {
    overallErrors.forEach((it) => console.error(it));
  } else {
    console.log(`${TAG} All Checks Passed OK.`);
  }
  const exitCode = overallSuccess ? 0 : 100;
  process.exit(exitCode);
}

if (esMain(import.meta)) {
  runCustomChecks(process.argv, process.env, process.versions.node);
}
