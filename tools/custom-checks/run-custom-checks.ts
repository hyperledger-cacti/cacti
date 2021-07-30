import { checkOpenApiJsonSpecs } from "./check-open-api-json-specs";

export async function runCustomChecks(
  argv: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const TAG = "[tools/custom-checks/check-source-code.ts]";
  let overallSuccess = true;
  let overallErrors: string[] = [];

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

if (require.main === module) {
  runCustomChecks(process.argv, process.env);
}
