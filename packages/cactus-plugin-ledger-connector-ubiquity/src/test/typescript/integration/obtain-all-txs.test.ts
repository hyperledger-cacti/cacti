import "jest-extended";
import dotenv from "dotenv";
import path from "path";
const envPath = path.join(__dirname, "../../../../.env");
dotenv.config({ path: envPath });
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

const testCase = "obtain all txs";
const logLevel: LogLevelDesc = "TRACE";
expect(process.env.UBIQUITY_AUTH_TOKEN).toBeTruthy();
const authToken = process.env.UBIQUITY_AUTH_TOKEN;
if (!authToken) {
  throw new Error(
    "Auth token not defined. Please generate a token at https://app.blockdaemon.com/",
  );
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

  const options: IPluginLedgerConnectorUbiquity = {
    logLevel: logLevel,
    authToken: authToken,
    instanceId: uuidv4(),
    basePath: "https://svc.blockdaemon.com/universal/v1/",
  };

  const api = new PluginLedgerConnectorUbiquity(options);
  Checks.truthy(api);

  // Rainbow bridge ethereum custodian contract
  const address = "0x6BFaD42cFC4EfC96f529D786D643Ff4A8B89FA52";

  test("GetTxsByAddress", async () => {
    const transactions = await api.getTxsByAddress(
      "ethereum",
      "mainnet",
      address,
    );
    Checks.truthy(transactions);
    Checks.truthy(transactions.total === 25);

    const tx = await api.getTx(
      "ethereum",
      "mainnet",
      "0x78df45ed70b64e08105dea46f762faa5680342a40259eb29006f1ab6ca38f05a",
    );
    Checks.truthy(tx);
    Checks.truthy(tx.data);
  });

  test("GetBalancesByAddresses", async () => {
    const response = await api.getBalancesByAddresses(
      "ethereum",
      "mainnet",
      address,
    );
    Checks.truthy(response);
  });
});
