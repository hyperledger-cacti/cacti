import {
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredentialType,
} from "../../generated/openapi/typescript-axios";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { transactV1CactusKeychainRef } from "./transact-v1-cactus-keychain-ref";
import Web3 from "web3";
import { transactV1PrivateKey } from "./transact-v1-private-key";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { transactV1Signed } from "./transact-v1-signed";
import { PrometheusExporter } from "../../prometheus-exporter/prometheus-exporter";

export async function transactV1Impl(
  ctx: {
    readonly pluginRegistry: PluginRegistry;
    readonly prometheusExporter: PrometheusExporter;
    readonly web3: Web3;
    readonly logLevel: LogLevelDesc;
  },
  req: RunTransactionRequest,
): Promise<RunTransactionResponse> {
  const fnTag = `transact()`;

  switch (req.web3SigningCredential.type) {
    // Web3SigningCredentialType.GETHKEYCHAINPASSWORD is removed as Hyperledger Besu doesn't support the PERSONAL api
    // for --rpc-http-api as per the discussion mentioned here
    // https://chat.hyperledger.org/channel/besu-contributors?msg=GqQXfW3k79ygRtx5Q
    case Web3SigningCredentialType.CactusKeychainRef: {
      return transactV1CactusKeychainRef(ctx, req);
    }
    case Web3SigningCredentialType.PrivateKeyHex: {
      return transactV1PrivateKey(ctx, req);
    }
    case Web3SigningCredentialType.None: {
      if (req.transactionConfig.rawTransaction) {
        return transactV1Signed(ctx, req);
      } else {
        throw new Error(
          `${fnTag} Expected pre-signed raw transaction ` +
            ` since signing credential is specified as` +
            `Web3SigningCredentialType.NONE`,
        );
      }
    }
    default: {
      throw new Error(
        `${fnTag} Unrecognized Web3SigningCredentialType: ` +
          `${req.web3SigningCredential.type} Supported ones are: ` +
          `${Object.values(Web3SigningCredentialType).join(";")}`,
      );
    }
  }
}
