import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredentialPrivateKeyHex,
  Web3TransactionReceipt,
} from "../../generated/openapi/typescript-axios";
import Web3 from "web3";
import { transactV1Signed } from "./transact-v1-signed";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import Web3JsQuorum from "web3js-quorum";
import { RuntimeError } from "run-time-error-cjs";
import { PrometheusExporter } from "../../prometheus-exporter/prometheus-exporter";

export async function transactV1PrivateKey(
  ctx: {
    readonly pluginRegistry: PluginRegistry;
    readonly prometheusExporter: PrometheusExporter;
    readonly web3: Web3;
    readonly logLevel: LogLevelDesc;
  },
  req: RunTransactionRequest,
): Promise<RunTransactionResponse> {
  const fnTag = `transactPrivateKey()`;
  const { transactionConfig, web3SigningCredential } = req;
  const { secret } =
    web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

  // Run transaction to EEA client here if private transaction

  if (req.privateTransactionConfig) {
    const options = {
      nonce: transactionConfig.nonce,
      gasPrice: transactionConfig.gasPrice,
      gasLimit: transactionConfig.gas,
      to: transactionConfig.to,
      value: transactionConfig.value,
      data: transactionConfig.data,
      privateKey: secret,
      privateFrom: req.privateTransactionConfig.privateFrom,
      privateFor: req.privateTransactionConfig.privateFor,
      restriction: "restricted",
    };

    return transactPrivate(ctx, options);
  }

  const signedTx = await ctx.web3.eth.accounts.signTransaction(
    transactionConfig,
    secret,
  );

  if (signedTx.rawTransaction) {
    req.transactionConfig.rawTransaction = signedTx.rawTransaction;
    return transactV1Signed(ctx, req);
  } else {
    throw new Error(
      `${fnTag} Failed to sign eth transaction. ` +
        `signedTransaction.rawTransaction is blank after .signTransaction().`,
    );
  }
}

export async function transactPrivate(
  ctx: { readonly web3: Web3 },
  options: any,
): Promise<RunTransactionResponse> {
  const fnTag = `transactPrivate()`;

  const web3Quorum = Web3JsQuorum(ctx.web3);
  if (!web3Quorum) {
    throw new Error(`${fnTag} Web3 EEA client not initialized.`);
  }

  const txHash = await web3Quorum.priv.generateAndSendRawTransaction(options);

  if (!txHash) {
    throw new Error(`${fnTag} eea.sendRawTransaction provided no tx hash.`);
  }
  return getPrivateTxReceipt(ctx, options.privateFrom, txHash);
}

export async function getPrivateTxReceipt(
  ctx: { readonly web3: Web3 },
  privateFrom: string,
  txHash: string,
): Promise<RunTransactionResponse> {
  const fnTag = `getPrivateTxReceipt()`;

  const web3Quorum = Web3JsQuorum(ctx.web3);
  if (!web3Quorum) {
    throw new Error(`${fnTag} Web3 Quorum client not initialized.`);
  }

  const txPoolReceipt = await web3Quorum.priv.waitForTransactionReceipt(txHash);
  if (!txPoolReceipt) {
    throw new RuntimeError(`priv.getTransactionReceipt provided no receipt.`);
  }

  return {
    transactionReceipt: txPoolReceipt as unknown as Web3TransactionReceipt,
  };
}
