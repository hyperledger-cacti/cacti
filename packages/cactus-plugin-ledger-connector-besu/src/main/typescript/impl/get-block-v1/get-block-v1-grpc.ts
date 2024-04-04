import Web3 from "web3";

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

import * as get_block_v1_response_pb from "../../generated/proto/protoc-gen-ts/models/get_block_v1_response_pb";
import * as default_service from "../../generated/proto/protoc-gen-ts/services/default_service";
import { evm_block_pb, EvmBlock } from "../../public-api";
import { getBlockV1Impl, isBlockNumber } from "./get-block-v1-impl";

export async function getBlockV1Grpc(
  ctx: { readonly web3: Web3; readonly logLevel: LogLevelDesc },
  req: default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBlockV1Request,
): Promise<get_block_v1_response_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.GetBlockV1ResponsePB> {
  const log = LoggerProvider.getOrCreate({
    label: "getBlockGrpc()",
    level: ctx.logLevel,
  });
  log.debug(
    "req.getBlockV1RequestPB.blockHashOrBlockNumber=%o",
    req.getBlockV1RequestPB.blockHashOrBlockNumber,
  );
  const blockHashOrBlockNumber = Buffer.from(
    req.getBlockV1RequestPB.blockHashOrBlockNumber.value,
  ).toString("utf-8");

  log.debug("blockHashOrBlockNumber=%s", blockHashOrBlockNumber);

  if (!isBlockNumber(blockHashOrBlockNumber)) {
    throw new Error("Input was not a block number: " + blockHashOrBlockNumber);
  }

  const block = await getBlockV1Impl(ctx, blockHashOrBlockNumber);
  log.debug("getBlockV1Impl() => block=%o", block);

  const getBlockV1ResponsePb =
    new get_block_v1_response_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.GetBlockV1ResponsePB();

  const evmBlockPb =
    evm_block_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.EvmBlockPB.fromObject(
      block as EvmBlock,
    );

  getBlockV1ResponsePb.block = evmBlockPb;

  return getBlockV1ResponsePb;
}
