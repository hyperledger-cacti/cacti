import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  ReceiptType,
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialType,
} from "../../generated/openapi/typescript-axios";
import { Checks, LogLevelDesc } from "@hyperledger/cactus-common";
import Web3 from "web3";
import { transactV1PrivateKey } from "./transact-v1-private-key";
import { PrometheusExporter } from "../../prometheus-exporter/prometheus-exporter";

export async function transactV1CactusKeychainRef(
  ctx: {
    readonly pluginRegistry: PluginRegistry;
    readonly prometheusExporter: PrometheusExporter;
    readonly web3: Web3;
    readonly logLevel: LogLevelDesc;
  },
  req: RunTransactionRequest,
): Promise<RunTransactionResponse> {
  const fnTag = `transactCactusKeychainRef()`;
  const { transactionConfig, web3SigningCredential, privateTransactionConfig } =
    req;
  const { ethAccount, keychainEntryKey, keychainId } =
    web3SigningCredential as Web3SigningCredentialCactusKeychainRef;

  // locate the keychain plugin that has access to the keychain backend
  // denoted by the keychainID from the request.
  const keychainPlugin = ctx.pluginRegistry.findOneByKeychainId(keychainId);

  Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

  // Now use the found keychain plugin to actually perform the lookup of
  // the private key that we need to run the transaction.
  const privateKeyHex = await keychainPlugin?.get(keychainEntryKey);

  return transactV1PrivateKey(ctx, {
    privateTransactionConfig,
    transactionConfig,
    web3SigningCredential: {
      ethAccount,
      type: Web3SigningCredentialType.PrivateKeyHex,
      secret: privateKeyHex,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.NodeTxPoolAck,
      timeoutMs: 60000,
    },
  });
}
