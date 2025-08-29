import "jest-extended";
import { validateCCConfig } from "../../../main/typescript/services/validation/config-validating-functions/validate-cc-config";
import { Logger } from "@hyperledger/cactus-common";

describe("Instantiate SATP Gateway Runner", () => {
  const logger = new Logger({ level: "INFO", label: "SATP - Hermes" });
  test("Instantiate SATP Gateway Runner", async () => {
    const response = await validateCCConfig(
      {
        configValue: {
          oracleConfig: [
            {
              networkIdentification: {
                id: "EthereumLedgerTestNetwork",
                ledgerType: "ETHEREUM",
              },
              signingCredential: {
                ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
                secret: "test",
                type: "GETH_KEYCHAIN_PASSWORD",
              },
              gasConfig: {
                gas: "6721975",
                gasPrice: "20000000000",
              },
              connectorOptions: {
                rpcApiHttpHost: "http://172.23.0.4:8545",
                rpcApiWsHost: "ws://172.23.0.4:8546",
              },
              claimFormats: [2],
            },
          ],
        },
      },
      logger,
    );

    expect(response).toBeDefined();
    // TO BE CONTINUED
  });
});
