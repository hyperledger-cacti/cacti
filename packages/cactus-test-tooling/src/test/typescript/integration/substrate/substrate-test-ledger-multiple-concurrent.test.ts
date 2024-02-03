import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SubstrateTestLedger } from "../../../../main/typescript/substrate-test-ledger/substrate-test-ledger";
import { pruneDockerAllIfGithubAction } from "../../../../main/typescript/github-actions/prune-docker-all-if-github-action";

const testCase = "Runs multiple test ledgers concurrently";
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
      ["WS_PORT", "9945"],
      ["PORT", "9944"],
      ["DOCKER_PORT", "9945"],
    ]),
  };

  const ledger = new SubstrateTestLedger(options);

  const optionsSecondLedger = {
    publishAllPorts: true,
    logLevel: logLevel,
    emitContainerLogs: true,
    envVars: new Map([
      ["WS_PORT", "9947"],
      ["PORT", "9946"],
      ["DOCKER_PORT", "9947"],
    ]),
  };

  const secondLedger = new SubstrateTestLedger(optionsSecondLedger);

  const tearDown = async () => {
    await ledger.stop();
    await secondLedger.stop();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  await ledger.start();
  await secondLedger.start();
  t.ok(ledger);
  t.ok(secondLedger);
  t.end();
});
