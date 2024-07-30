import { BinaryLike, X509Certificate } from "node:crypto";
import fabricProtos from "fabric-protos";

import {
  LoggerProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import {
  CactiBlockFullResponseV1,
  CactiBlockTransactionEventV1,
  CactiBlockTransactionsResponseV1,
  FabricX509CertificateV1,
  FullBlockTransactionActionV1,
  FullBlockTransactionEndorsementV1,
  FullBlockTransactionEventV1,
} from "../generated/openapi/typescript-axios";
import { fabricLongToNumber } from "../common/utils";

const level = "INFO";
const label = "cacti-block-formatters";
const log = LoggerProvider.getOrCreate({ level, label });

/**
 * Convert certificate binary received from fabric ledger to object representation.
 *
 * @param certBuffer fabric X.509 certificate buffer
 *
 * @returns `FabricX509CertificateV1`
 */
function parseX509CertToObject(
  certBuffer: BinaryLike,
): FabricX509CertificateV1 {
  const cert = new X509Certificate(certBuffer);

  return {
    serialNumber: cert.serialNumber,
    subject: cert.subject,
    issuer: cert.issuer,
    subjectAltName: cert.subjectAltName ?? "",
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    pem: cert.toString(),
  };
}

/**
 * Extract full block summary from a fabric. More data can be added here in the future
 * if there's a need for it.
 *
 * @param blockEvent full block event
 *
 * @returns parsed block data including transactions, actions, endorsements, signatures.
 */
export function formatCactiFullBlockResponse(
  blockEvent: fabricProtos.common.IBlock,
): CactiBlockFullResponseV1 {
  const transactionData = (blockEvent.data?.data ?? []) as any[];

  const header = blockEvent.header;
  if (!header) {
    log.warn(
      "Received block event without a header:",
      JSON.stringify(blockEvent),
    );
  }
  const blockNumber = header ? fabricLongToNumber(header.number) : -1;
  const blockHash =
    "0x" + Buffer.from(blockEvent.header?.data_hash ?? "").toString("hex");
  const previousBlockHash =
    "0x" + Buffer.from(blockEvent.header?.previous_hash ?? "").toString("hex");
  const transactionCount = transactionData.length;

  const transactions: FullBlockTransactionEventV1[] = [];
  for (const data of transactionData) {
    try {
      const payload = data.payload;
      const channelHeader = payload.header.channel_header;
      const transaction = payload.data;

      const transactionActions: FullBlockTransactionActionV1[] = [];
      for (const action of transaction.actions ?? []) {
        const actionPayload = action.payload;
        const proposalPayload = actionPayload.chaincode_proposal_payload;
        const invocationSpec = proposalPayload.input;
        const actionCreatorCert = parseX509CertToObject(
          action.header.creator.id_bytes,
        );
        const actionCreatorMspId = action.header.creator.mspid;

        // Decode args and function name
        const rawArgs = invocationSpec.chaincode_spec.input.args as Buffer[];
        const decodedArgs = rawArgs.map((arg: Buffer) => arg.toString("utf8"));
        const functionName = decodedArgs.shift() ?? "<unknown>";
        const chaincodeId = invocationSpec.chaincode_spec.chaincode_id.name;

        const endorsements = actionPayload.action.endorsements.map((e: any) => {
          return {
            signer: {
              mspid: e.endorser.mspid,
              cert: parseX509CertToObject(e.endorser.id_bytes),
            },
            signature: "0x" + Buffer.from(e.signature).toString("hex"),
          } as FullBlockTransactionEndorsementV1;
        });

        transactionActions.push({
          functionName,
          functionArgs: decodedArgs,
          chaincodeId,
          creator: {
            mspid: actionCreatorMspId,
            cert: actionCreatorCert,
          },
          endorsements,
        });
      }

      transactions.push({
        hash: channelHeader.tx_id,
        channelId: channelHeader.channel_id,
        timestamp: channelHeader.timestamp,
        protocolVersion: channelHeader.version,
        transactionType: channelHeader.typeString,
        epoch: fabricLongToNumber(channelHeader.epoch),
        actions: transactionActions,
      });
    } catch (error) {
      log.warn(
        "Could not retrieve transaction from received block. Error:",
        safeStringifyException(error),
      );
    }
  }

  return {
    cactiFullEvents: {
      blockNumber,
      blockHash,
      previousBlockHash,
      transactionCount,
      cactiTransactionsEvents: transactions,
    },
  };
}

/**
 * Extract transaction summary from a fabric block.
 *
 * @param blockEvent full block event
 *
 * @returns actions summary, including function name, args, and chaincode.
 */
export function formatCactiTransactionsBlockResponse(
  blockEvent: fabricProtos.common.IBlock,
): CactiBlockTransactionsResponseV1 {
  const transactionData = blockEvent.data?.data as any[];
  if (!transactionData) {
    log.debug("Block transaction data empty - ignore...");
    return {
      cactiTransactionsEvents: [],
    };
  }

  const transactions: CactiBlockTransactionEventV1[] = [];
  for (const data of transactionData) {
    try {
      const payload = data.payload;
      const transaction = payload.data;
      for (const action of transaction.actions) {
        const actionPayload = action.payload;
        const proposalPayload = actionPayload.chaincode_proposal_payload;
        const invocationSpec = proposalPayload.input;

        // Decode args and function name
        const rawArgs = invocationSpec.chaincode_spec.input.args as Buffer[];
        const decodedArgs = rawArgs.map((arg: Buffer) => arg.toString("utf8"));
        const functionName = decodedArgs.shift() ?? "<unknown>";

        const chaincodeId = invocationSpec.chaincode_spec.chaincode_id.name;
        const channelHeader = payload.header.channel_header;
        const transactionId = channelHeader.tx_id;

        transactions.push({
          chaincodeId,
          transactionId,
          functionName,
          functionArgs: decodedArgs,
        });
      }
    } catch (error) {
      log.warn(
        "Could not retrieve transaction from received block. Error:",
        safeStringifyException(error),
      );
    }
  }

  return {
    cactiTransactionsEvents: transactions,
  };
}
