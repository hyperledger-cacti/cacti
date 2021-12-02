import { Checks } from "@hyperledger/cactus-common";

/**
 * Converts an ES6 Map of environment variables into an
 * array of strings which is the expected format of the Dockerode library that
 * we heavily use in our testing code to launch containers for infrastructure
 * simulation.
 *
 * @param envMap Environment variables as an ES6 map that will be converted into
 * an array of strings.
 */
export function envMapToDocker(envMap: Map<string, unknown>): string[] {
  Checks.truthy(envMap, "test-tooling#envMapToDocker()");
  const out = [];
  for (const [key, value] of envMap) {
    out.push(`${key}=${value}`);
  }
  return out;
}
