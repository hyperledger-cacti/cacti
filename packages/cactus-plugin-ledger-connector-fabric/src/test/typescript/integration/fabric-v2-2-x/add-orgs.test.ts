import "jest-extended";
import {
  DEFAULT_FABRIC_2_AIO_FABRIC_VERSION,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  DEFAULT_FABRIC_2_AIO_IMAGE_VERSION,
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
let ledger: FabricTestLedgerV1;
beforeAll(async () => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await expect(pruning).resolves.not.toThrow();
});

afterAll(async () => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await expect(pruning).resolves.not.toThrow();
  await ledger.stop();
  await ledger.destroy();
});
test.skip(testCase, async () => {
  const addOrgXPath = path.join(
    __dirname,
    "../../../resources/fixtures/addOrgX",
  );

  const extraOrg = {
    path: addOrgXPath,
    orgName: "org4",
    orgChannel: "mychannel",
    certificateAuthority: false,
    stateDatabase: STATE_DATABASE.COUCH_DB,
    port: "11071",
  };
  ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    logLevel,
    imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
    imageVersion: DEFAULT_FABRIC_2_AIO_IMAGE_VERSION,
    envVars: new Map([["FABRIC_VERSION", DEFAULT_FABRIC_2_AIO_FABRIC_VERSION]]),
    extraOrgs: [extraOrg],
  });
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
  expect(connectionProfile).toBeTruthy();

  const connectionProfileOrg1 = await ledger.getConnectionProfileOrgX("org1");
  expect(connectionProfile).toEqual(connectionProfileOrg1);

  const connectionProfileOrg2 = await ledger.getConnectionProfileOrgX("org2");
  expect(connectionProfileOrg2).toBeTruthy();

  const connectionProfileOrg4 = await ledger.getConnectionProfileOrgX("org4");
  expect(connectionProfileOrg4).toBeTruthy();

  expect(connectionProfileOrg1).not.toEqual(connectionProfileOrg2);

  // Expect rejection as org101 does not exist
  await expect(ledger.getConnectionProfileOrgX("org101")).rejects.toThrow(
    /no such container - Could not find the file.*/,
  );
});
