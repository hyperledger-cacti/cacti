import { Checks } from "@hyperledger/cactus-common";

/**
 * Converts the NodeJS formatted (POJO) environment variable object into an ES6
 * Map object containing the same information.
 *
 * @param envNodeJs Environment variables in the format NodeJS provides it to
 * the script file that it is running. It's just a plain on Javascript object
 * that maps the environment variable names to values like this:
 * ```json
 * {
 *   "MY_ENV_VAR": "SomeInterestingValueOfMyEnvVar"
 * }
 * ```
 */
export function envNodeToMap(
  envNodeJs: NodeJS.ProcessEnv,
): Map<string, string> {
  Checks.truthy(envNodeJs, "test-tooling#envNodeToDocker()");
  const map = new Map();
  Object.entries(envNodeJs).forEach(([key, value]) => map.set(key, value));
  return map;
}
