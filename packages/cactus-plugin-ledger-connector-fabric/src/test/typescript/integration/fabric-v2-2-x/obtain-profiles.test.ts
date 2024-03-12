// The TAP runner has a bug and prevents the test from passing in the CI when yarn "tap --ts ..."" is used
// if test is run with ts-node, it successfully executes
import test, { Test } from "tape-promise/tape";

import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { LogLevelDesc } from "@hyperledger/cactus-common";

const testCase = "obtains configuration profiles from Fabric 2.x ledger";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
    imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
    envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
  });
  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  await ledger.start({ omitPull: false });

  const connectionProfile = await ledger.getConnectionProfileOrg1();

  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const connectionProfileOrg1 = await ledger.getConnectionProfileOrgX("org1");
  t.isEquivalent(connectionProfile, connectionProfileOrg1);

  const connectionProfileOrg2 = await ledger.getConnectionProfileOrgX("org2");
  t.ok(connectionProfileOrg2, "getConnectionProfileOrg2() out truthy OK");

  t.notDeepEqual(
    connectionProfileOrg1,
    connectionProfileOrg2,
    "connection profiles are different",
  );

  //Should return error, as there is no Org3 in the default deployment of Fabric AIO image
  const error = "/no such container - Could not find the file.*/";
  await t.rejects(ledger.getConnectionProfileOrgX("org3"), error);

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
