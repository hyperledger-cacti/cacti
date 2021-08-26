import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SubstrateTestLedger } from "../../../../main/typescript/substrate-test-ledger/substrate-test-ledger";
import { pruneDockerAllIfGithubAction } from "../../../../main/typescript/github-actions/prune-docker-all-if-github-action";

const testCase = "Instantiate plugin";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const options = {
    publishAllPorts: true,
    logLevel: logLevel,
    emitContainerLogs: true,
    envVars: new Map([
      ["WORKING_DIR", "/var/www/node-template"],
      ["CONTAINER_NAME", "contracts-node-template-cactus"],
      ["PORT", "9944"],
      ["DOCKER_PORT", "9944"],
      ["CARGO_HOME", "/var/www/node-template/.cargo"],
    ]),
  };

  const ledger = new SubstrateTestLedger(options);
  const tearDown = async () => {
    await ledger.stop();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  await ledger.start();
  t.ok(ledger);

  t.end();
});
