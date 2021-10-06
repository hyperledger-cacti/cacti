import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { Gateway } from "fabric-network";
import {
  GetTransactionReceiptResponse,
  TransactReceiptTransactionEndorsement,
  TransactReceiptTransactionCreator,
  TransactReceiptBlockMetaData,
} from "../generated/openapi/typescript-axios";
import { common } from "fabric-protos";
const { BlockDecoder } = require("fabric-common");
export interface IGetTransactionReceiptByTxIDOptions {
  readonly logLevel?: LogLevelDesc;
  readonly gateway: Gateway;
  readonly channelName: string;
  readonly params: string[];
}
export async function getTransactionReceiptByTxID(
  req: IGetTransactionReceiptByTxIDOptions,
): Promise<GetTransactionReceiptResponse> {
  const fnTag = `getTransactionReceiptForLockContractByTxID`;
  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: req.logLevel || "INFO",
  });
  log.info(`${fnTag}, start getting fabric transact receipt`);
  const { gateway } = req;

  const contractName = "qscc";
  const methodName = "GetBlockByTxID";
  if (req.params.length != 2) {
    throw new Error(`${fnTag}, should have 2 params`);
  }
  const network = await gateway.getNetwork(req.channelName);

  const contract = network.getContract(contractName);
  const out: Buffer = await contract.evaluateTransaction(
    methodName,
    ...req.params,
  );
  const reqTxID = req.params[1];
  const block: common.Block = BlockDecoder.decode(out);
  const blockJson = JSON.parse(JSON.stringify(block));

  const transactReceipt: GetTransactionReceiptResponse = {};
  transactReceipt.blockNumber = blockJson.header.number;
  const txIDs = [];
  if (!block.data) {
    throw new Error(`${fnTag} block.data is null`);
  }
  const blockData = block.data;
  if (!blockData.data) {
    throw new Error(`${fnTag} block.data.data is null`);
  }
  const blockDataArr = blockData.data;
  for (let i = 0; i < blockDataArr.length; i++) {
    const blockData = JSON.parse(JSON.stringify(blockDataArr[i]));
    if (!blockData.payload) {
      throw new Error(`${fnTag}, blockData.payload undefine`);
    }
    if (!blockData.payload.header) continue;
    if (!blockData.payload.header.channel_header) continue;

    const payloadChannelHeader = blockData.payload.header.channel_header;
    if (payloadChannelHeader.tx_id) {
      txIDs.push(payloadChannelHeader.tx_id);
      if (payloadChannelHeader.tx_id != reqTxID) continue;
      transactReceipt.channelID = payloadChannelHeader.channel_id;
      if (!blockData.payload.data) continue;
      if (!blockData.payload.data.actions) continue;
      const payloadDataActions = blockData.payload.data.actions;

      if (!payloadDataActions[0].header || !payloadDataActions[0].payload)
        continue;
      const actionsHeader = payloadDataActions[0].header;
      const actionsPayload = payloadDataActions[0].payload;
      const creator = actionsHeader.creator;
      const creatorMspId = creator.mspid;
      const creatorId = String.fromCharCode.apply(null, creator.id_bytes.data);
      const transactReceiptCreator: TransactReceiptTransactionCreator = {
        mspid: creatorMspId,
        creatorID: creatorId,
      };
      transactReceipt.transactionCreator = transactReceiptCreator;
      if (actionsPayload.chaincode_proposal_payload == undefined) continue;
      const chainCodeProposal = actionsPayload.chaincode_proposal_payload;
      if (
        !chainCodeProposal.input ||
        !chainCodeProposal.input.chaincode_spec ||
        !chainCodeProposal.input.chaincode_spec.chaincode_id
      )
        continue;
      if (
        !actionsPayload.action ||
        !actionsPayload.action.proposal_response_payload ||
        !actionsPayload.action.endorsements
      )
        continue;
      const proposalResponsePayload =
        actionsPayload.action.proposal_response_payload;
      const actionEndorsements = actionsPayload.action.endorsements;
      const endorsements = [];
      for (let i = 0; i < actionEndorsements.length; i++) {
        const endorser = actionEndorsements[i].endorser;
        const mspId = endorser.mspid;
        const idBytes = endorser.id_bytes;
        const idBytesData = idBytes.data;
        const endorserId = String.fromCharCode.apply(null, idBytesData);
        const signatureData = actionEndorsements[i].signature.data;
        const signature = String.fromCharCode.apply(null, signatureData);
        const endorsement: TransactReceiptTransactionEndorsement = {
          mspid: mspId,
          endorserID: endorserId,
          signature: signature,
        };
        endorsements.push(endorsement);
      }
      transactReceipt.transactionEndorsement = endorsements;
      if (!proposalResponsePayload.extension) continue;

      const responseExtension = proposalResponsePayload.extension;
      if (!responseExtension.chaincode_id) continue;
      const extensionChainCodeID = responseExtension.chaincode_id;
      transactReceipt.chainCodeName = extensionChainCodeID;
      transactReceipt.chainCodeName = extensionChainCodeID.name;
      transactReceipt.chainCodeVersion = extensionChainCodeID.version;
      if (
        !responseExtension.response ||
        !responseExtension.response.payload ||
        !responseExtension.response.status
      )
        continue;
      const responseStatus = responseExtension.response.status;
      transactReceipt.responseStatus = responseStatus;
      if (
        !responseExtension.results ||
        !responseExtension.results.ns_rwset ||
        responseExtension.results.ns_rwset.length < 2
      ) {
        continue;
      }
      const extensionNsRwset = responseExtension.results.ns_rwset[1];
      if (!extensionNsRwset.rwset) continue;

      const rwset = extensionNsRwset.rwset;
      if (!rwset.writes) continue;
      const rwsetWrite = rwset.writes;
      if (!rwsetWrite[0].key) continue;
      const rwsetKey = rwsetWrite[0].key;
      transactReceipt.rwsetKey = rwsetKey;
      if (!rwsetWrite[0].value || !rwsetWrite[0].value.data) continue;
      const rwSetWriteData = rwsetWrite[0].value.data;
      // eslint-disable-next-line prefer-spread
      const rwSetWriteDataStr = String.fromCharCode.apply(
        String,
        rwSetWriteData,
      );
      transactReceipt.rwsetWriteData = rwSetWriteDataStr;
      break;
    }
  }
  if (!block.metadata) {
    throw new Error(`${fnTag}, block.metadata undefined`);
  }
  if (!block.metadata.metadata) {
    throw new Error(`${fnTag}, block.metadata.metadata undefined`);
  }

  const metadata = JSON.parse(JSON.stringify(block.metadata.metadata[0]));
  if (!metadata.signatures) {
    throw new Error(`${fnTag}, metadata signature undefined`);
  }
  if (!metadata.signatures[0].signature_header) {
    throw new Error(
      `${fnTag}, metadata.signatures.signature_header is undefined`,
    );
  }
  const metadataSignatureCreator =
    metadata.signatures[0].signature_header.creator;
  const metadataMspId = metadataSignatureCreator.mspid;
  if (!metadataSignatureCreator.id_bytes) {
    throw new Error(`${fnTag}, metadataSignatureCreator.id_bytes`);
  }
  const metadataCreatorId = String.fromCharCode.apply(
    null,
    metadataSignatureCreator.id_bytes.data,
  );
  if (!metadata.signatures[0].signature) {
    throw new Error(`${fnTag}, metadata.signatures[0].signature undefined`);
  }
  const metedataSignature = String.fromCharCode.apply(
    null,
    metadata.signatures[0].signature.data,
  );
  const transactionReceiptBlockMetadata: TransactReceiptBlockMetaData = {
    mspid: metadataMspId,
    blockCreatorID: metadataCreatorId,
    signature: metedataSignature,
  };
  transactReceipt.blockMetaData = transactionReceiptBlockMetadata;

  return transactReceipt;
}
