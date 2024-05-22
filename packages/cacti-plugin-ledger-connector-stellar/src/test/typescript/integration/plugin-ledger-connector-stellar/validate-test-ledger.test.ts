import "jest-extended";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { Network } from "stellar-plus/lib/stellar-plus";
import { DefaultAccountHandler } from "stellar-plus/lib/stellar-plus/account";
import { ClassicAssetHandler } from "stellar-plus/lib/stellar-plus/asset";
import { TransactionInvocation } from "stellar-plus/lib/stellar-plus/types";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { StellarTestLedger } from "@hyperledger/cactus-test-tooling";

describe("PluginLedgerConnectorStellar", () => {
  const logLevel: LogLevelDesc = "TRACE";
  const stellarTestLedger = new StellarTestLedger({ logLevel });
  let networkConfig: NetworkConfig;

  beforeAll(async () => {
    await stellarTestLedger.start();
    networkConfig = Network.CustomNet(
      await stellarTestLedger.getNetworkConfiguration(),
    );
  });

  afterAll(async () => {
    await stellarTestLedger.stop();
    await stellarTestLedger.destroy();
  });

  test("can initialize an account with 10k XLM", async () => {
    const XLM = new ClassicAssetHandler({
      code: "XLM",
      networkConfig,
    });
    const stellarAccount = new DefaultAccountHandler({ networkConfig });

    await stellarAccount.initializeWithFriendbot();

    expect(await XLM.balance(stellarAccount.getPublicKey())).toBe(10000);
  });

  test("can perform classic transactions", async () => {
    const XLM = new ClassicAssetHandler({
      code: "XLM",
      networkConfig,
    });
    const accountA = new DefaultAccountHandler({ networkConfig });
    const accountB = new DefaultAccountHandler({ networkConfig });
    const txInvocation: TransactionInvocation = {
      header: {
        source: accountA.getPublicKey(),
        fee: "100",
        timeout: 30,
      },
      signers: [accountA],
    };
    await accountA.initializeWithFriendbot();
    await accountB.initializeWithFriendbot();

    await XLM.transfer({
      from: accountA.getPublicKey(),
      to: accountB.getPublicKey(),
      amount: 1000,
      ...txInvocation,
    });

    expect(await XLM.balance(accountA.getPublicKey())).toBe(8999.99999); //original balance minus 1k minus fee
    expect(await XLM.balance(accountB.getPublicKey())).toBe(11000);
  });
});
