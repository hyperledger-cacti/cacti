import { Checks } from "@hyperledger/cactus-common";

/**
 * Utility/helper function that examines if the current code is running on Github Actions
 * or not.
 *
 * Important note: Do not use this in production code it is meant to be used for tests
 * only. Do not depend on this function in your code outside of the test cases.
 *
 * Uses the environment variable `GITHUB_ACTIONS` to determine its output which is always
 * set to `"true"` when GitHub Actions is running the workflow.
 * You can use this variable to differentiate when tests are being run locally or by GitHub Actions.
 *
 * @see https://docs.github.com/en/actions/reference/environment-variables
 *
 * @param env The process environment variables object to look into when attempting to
 * determine if the current execution environment appears to be a GitHub Action VM or
 * not.
 * @returns
 */
export function isRunningInGithubAction(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  Checks.truthy(env, "isRunningInGithubAction():env");

  // Force a negative result in order to re-enable image caching for tests.
  // This is a potentially temporary change that we can only test across multiple
  // pull requests because it has to do with the stability of the CI/build/tests
  // and therefore the hacky workaround here instead of just deleteing the whole
  // mechanism completely.
  return false;
}
