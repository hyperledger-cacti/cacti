import { Checks } from "@hyperledger/cactus-common";

/**
 * Converts the NodeJS formatted (POJO) environment variable object into an
 * array of strings which is the expected format of the Dockerode library that
 * we heavily use in our testing code to launch containers for infrastructure
 * simulation.
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
export function envNodeToDocker(envNodeJs: NodeJS.ProcessEnv): string[] {
  Checks.truthy(envNodeJs, "test-tooling#envNodeToDocker()");
  return Object.entries(envNodeJs).map((parts: [string, unknown]) => {
    return `${parts[0]}=${parts[1]}`;
  });
}
