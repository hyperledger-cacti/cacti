import dotenv from "dotenv";
import path from "path";
const envPath = path.join(__dirname, "../../../../.env");
dotenv.config({ path: envPath });

import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import {
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc, Checks } from "@hyperledger/cactus-common";

import {
  PluginLedgerConnectorUbiquity,
  IPluginLedgerConnectorUbiquity,
} from "../../../main/typescript/public-api";

const testCase = "initialize ubiquity plugin";
const logLevel: LogLevelDesc = "TRACE";
expect(process.env.UBIQUITY_AUTH_TOKEN).toBeTruthy();
const authToken = process.env.UBIQUITY_AUTH_TOKEN;
if (!authToken) {
  throw new Error("Auth token not defined");
}

describe(testCase, () => {
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  test(testCase, async () => {
    const options: IPluginLedgerConnectorUbiquity = {
      logLevel: logLevel,
      authToken: authToken,
      instanceId: uuidv4(),
    };
    const api = new PluginLedgerConnectorUbiquity(options);
    Checks.truthy(api);
  });
});
