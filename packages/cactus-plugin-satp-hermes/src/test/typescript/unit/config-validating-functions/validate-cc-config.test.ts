import "jest-extended";
import { validateCCConfig } from "../../../../main/typescript/services/validation/config-validating-functions/validate-cc-config";

describe("Instantiate SATP Gateway Runner", () => {
  test("Instantiate SATP Gateway Runner", async () => {
    expect(() =>
      validateCCConfig({
        configValue: {
          oracleConfig: [
            {
              networkIdentification: {
                id: "EthereumLedgerTestNetwork",
                ledgerType: "ETHEREUM",
              },
              signingCredential: {
                ethAccount: "0x4879B0F1532075A4C28Dab8FA561Aa7e9FE827d7",
                secret:
                  "0x67d8ee51db366f84b3c479e105b7f5ef5f358332d027980880168c92764b6a5a",
                type: "GETH_KEYCHAIN_PASSWORD",
              },
              gasConfig: {
                gas: "6721975",
                gasPrice: "20000000000",
              },
              connectorOptions: {
                rpcApiHttpHost: "http://127.0.0.1:7545",
                rpcApiWsHost: "ws://127.0.0.1:7545",
              },
              claimFormats: [2],
            },
          ],
        },
      }),
    ).not.toThrow();
  });

  test("Instantiate SATP Gateway Runner without bridgesConfig nor oracleConfig", async () => {
    expect(() =>
      validateCCConfig({
        configValue: {
          notConfig: [
            {
              networkIdentification: {
                id: "EthereumLedgerTestNetwork",
                ledgerType: "ETHEREUM",
              },
              signingCredential: {
                ethAccount: "0x4879B0F1532075A4C28Dab8FA561Aa7e9FE827d7",
                secret:
                  "0x67d8ee51db366f84b3c479e105b7f5ef5f358332d027980880168c92764b6a5a",
                type: "GETH_KEYCHAIN_PASSWORD",
              },
              gasConfig: {
                gas: "6721975",
                gasPrice: "20000000000",
              },
              connectorOptions: {
                rpcApiHttpHost: "http://127.0.0.1:7545",
                rpcApiWsHost: "ws://127.0.0.1:7545",
              },
              claimFormats: [2],
            },
          ],
        },
      }),
    ).toThrow();
  });

  test("Instantiate SATP Gateway Runner with a null oracleConfig", async () => {
    expect(() =>
      validateCCConfig({
        configValue: {
          oracleConfig: null,
        },
      }),
    ).toThrow();
  });
});
