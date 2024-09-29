import "jest-extended";
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

describe("Obtain configuration profiles test", () => {
  let ledger: FabricTestLedgerV1;
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
    });
    await ledger.start({ omitPull: false });
  });
  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });
  test(`${testCase}`, async () => {
    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy();
    const connectionProfileOrg1 = await ledger.getConnectionProfileOrgX("org1");
    expect(connectionProfile).toEqual(connectionProfileOrg1);

    const connectionProfileOrg2 = await ledger.getConnectionProfileOrgX("org2");
    expect(connectionProfileOrg2).toBeTruthy();

    expect(connectionProfileOrg1).not.toEqual(connectionProfileOrg2);

    //Should return error, as there is no Org3 in the default deployment of Fabric AIO image
    const error = "getConnectionProfileOrgX() crashed.";
    const promise = ledger.getConnectionProfileOrgX("org3");
    await expect(promise).rejects.toThrow(error);
  });
});
