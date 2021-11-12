// The TAP runner has a bug and prevents the test from passing in the CI when yarn "tap --ts ..."" is used
// if test is run with ts-node, it successfully executes
import test, { Test } from "tape-promise/tape";

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import path from "path";
import {
  STATE_DATABASE,
  LedgerStartOptions,
} from "@hyperledger/cactus-test-tooling";

const testCase = "adds org4 to the network";
const logLevel: LogLevelDesc = "TRACE";

test.skip("BEFORE " + testCase, async (t: Test) => {
  t.skip();
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
const addOrgXPath = path.join(__dirname, "../../../resources/fixtures/addOrgX");

const extraOrg = {
  path: addOrgXPath,
  orgName: "org4",
  orgChannel: "mychannel",
  certificateAuthority: false,
  stateDatabase: STATE_DATABASE.COUCH_DB,
  port: "11071",
};

test.skip(testCase, async (t: Test) => {
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    logLevel: "debug",
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
    extraOrgs: [extraOrg],
  });

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  const startOps: LedgerStartOptions = {
    omitPull: false,
    setContainer: false,
  };

  // Recover running ledger
  /*const startOpsContainerRunning: LedgerStartOptions = {
    omitPull: true,
    setContainer: true,
    containerID:
      "723c265262d7f5ff71b67862d4b8b3b4c09b31da528ea7ba01cda03c13fdcd5d",
  };

  const results = await ledger.start(startOpsContainerRunning);
  */

  await ledger.start(startOps);
  const connectionProfile = await ledger.getConnectionProfileOrg1();

  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const connectionProfileOrg1 = await ledger.getConnectionProfileOrgX("org1");
  t.isEquivalent(connectionProfile, connectionProfileOrg1);

  const connectionProfileOrg2 = await ledger.getConnectionProfileOrgX("org2");
  t.ok(connectionProfileOrg2, "getConnectionProfileOrg2() out truthy OK");

  // Do not use org3, as its files are used as templates
  const connectionProfileOrg4 = await ledger.getConnectionProfileOrgX("org4");
  t.ok(connectionProfileOrg4, "getConnectionProfileOrg4() out truthy OK");

  t.ok(
    connectionProfileOrg1 !== connectionProfileOrg2,
    "connection profile from org1 is different from the one from org2 OK",
  );

  //Should return error, as there is no org101 in the default deployment of Fabric AIO image nor it was added
  const error = "/Error.*/";

  await t.rejects(ledger.getConnectionProfileOrgX("org101"), error);

  //Let us add org 3 and retrieve the connection profile

  t.end();
});

test.skip("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
