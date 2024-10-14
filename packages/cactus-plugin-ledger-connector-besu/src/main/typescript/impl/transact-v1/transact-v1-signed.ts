import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ConsistencyStrategy,
  ReceiptType,
  RunTransactionRequest,
  RunTransactionResponse,
} from "../../generated/openapi/typescript-axios";
import Web3 from "web3";
import type { TransactionReceipt } from "web3-eth";
import { PrometheusExporter } from "../../prometheus-exporter/prometheus-exporter";
import { setTimeout } from "timers/promises";

export async function transactV1Signed(
  ctx: {
    readonly web3: Web3;
    readonly prometheusExporter: PrometheusExporter;
    readonly logLevel: LogLevelDesc;
  },
  req: RunTransactionRequest,
): Promise<RunTransactionResponse> {
  const fnTag = `transactSigned()`;
  Checks.truthy(req.consistencyStrategy, `${fnTag}:req.consistencyStrategy`);
  Checks.truthy(
    req.transactionConfig.rawTransaction,
    `${fnTag}:req.transactionConfig.rawTransaction`,
  );
  const log = LoggerProvider.getOrCreate({
    label: "transactV1Signed()",
    level: ctx.logLevel,
  });
  const rawTx = req.transactionConfig.rawTransaction as string;

  log.debug("Starting web3.eth.sendSignedTransaction(rawTransaction) ");

  const txPoolReceipt = await ctx.web3.eth.sendSignedTransaction(rawTx);

  return getTxReceipt(ctx, req, txPoolReceipt);
}

export async function getTxReceipt(
  ctx: {
    readonly web3: Web3;
    readonly prometheusExporter: PrometheusExporter;
    readonly logLevel: LogLevelDesc;
  },
  request: RunTransactionRequest,
  txPoolReceipt: TransactionReceipt,
): Promise<RunTransactionResponse> {
  const fnTag = `getTxReceipt()`;

  const log = LoggerProvider.getOrCreate({
    label: "getTxReceipt",
    level: ctx.logLevel,
  });
  log.debug("Received preliminary receipt from Besu node.");

  if (txPoolReceipt instanceof Error) {
    log.debug(`${fnTag} sendSignedTransaction failed`, txPoolReceipt);
    throw txPoolReceipt;
  }
  ctx.prometheusExporter.addCurrentTransaction();

  if (
    request.consistencyStrategy.receiptType === ReceiptType.NodeTxPoolAck &&
    request.consistencyStrategy.blockConfirmations > 0
  ) {
    throw new Error(
      `${fnTag} Conflicting parameters for consistency` +
        ` strategy: Cannot wait for >0 block confirmations AND only wait ` +
        ` for the tx pool ACK at the same time.`,
    );
  }

  switch (request.consistencyStrategy.receiptType) {
    case ReceiptType.NodeTxPoolAck:
      return { transactionReceipt: txPoolReceipt };
    case ReceiptType.LedgerBlockAck:
      log.debug("Starting poll for ledger TX receipt ...");
      const txHash = txPoolReceipt.transactionHash;
      const { consistencyStrategy } = request;
      const ledgerReceipt = await pollForTxReceipt(
        ctx,
        txHash,
        consistencyStrategy,
      );
      log.debug("Finished poll for ledger TX receipt: %o", ledgerReceipt);
      return { transactionReceipt: ledgerReceipt };
    default:
      throw new Error(
        `${fnTag} Unrecognized ReceiptType: ${request.consistencyStrategy.receiptType}`,
      );
  }
}

export async function pollForTxReceipt(
  ctx: { readonly web3: Web3; readonly logLevel: LogLevelDesc },
  txHash: string,
  consistencyStrategy: ConsistencyStrategy,
): Promise<TransactionReceipt> {
  const fnTag = `pollForTxReceipt()`;
  const log = LoggerProvider.getOrCreate({
    label: "pollForTxReceipt()",
    level: ctx.logLevel,
  });
  let txReceipt;
  let timedOut = false;
  let tries = 0;
  let confirmationCount = 0;
  const timeoutMs = consistencyStrategy.timeoutMs || Number.MAX_SAFE_INTEGER;
  const startedAt = new Date();

  do {
    const now = Date.now();
    const elapsedTime = now - startedAt.getTime();
    timedOut = now >= startedAt.getTime() + timeoutMs;
    log.debug("%s tries=%n elapsedMs=%n", fnTag, tries, elapsedTime);
    if (tries > 0) {
      await setTimeout(1000);
    }
    tries++;
    if (timedOut) {
      break;
    }

    txReceipt = await ctx.web3.eth.getTransactionReceipt(txHash);
    if (!txReceipt) {
      continue;
    }

    const latestBlockNo = await ctx.web3.eth.getBlockNumber();
    confirmationCount = latestBlockNo - txReceipt.blockNumber;
  } while (confirmationCount >= consistencyStrategy.blockConfirmations);

  if (!txReceipt) {
    throw new Error(`${fnTag} Timed out ${timeoutMs}ms, polls=${tries}`);
  }
  return txReceipt;
}
