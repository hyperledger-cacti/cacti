import Web3 from "web3";
import { BlockNumber } from "web3-core";

import {
  LoggerProvider,
  LogLevelDesc,
  Strings,
} from "@hyperledger/cactus-common";

import { EvmBlock } from "../../public-api";

export async function getBlockV1Impl(
  ctx: { readonly web3: Web3; readonly logLevel: LogLevelDesc },
  blockHashOrBlockNumber: BlockNumber,
): Promise<EvmBlock> {
  const log = LoggerProvider.getOrCreate({
    label: "getBlockV1Impl()",
    level: ctx.logLevel,
  });
  log.debug("blockHashOrBlockNumber=%s", blockHashOrBlockNumber);

  if (!isBlockNumber(blockHashOrBlockNumber)) {
    throw new Error("Input was not a block number: " + blockHashOrBlockNumber);
  }

  const block = await ctx.web3.eth.getBlock(blockHashOrBlockNumber, true);
  log.debug("block=%o", block);

  return block;
}

//string | number | BN | BigNumber | 'latest' | 'pending' | 'earliest' | 'genesis'
export function isBlockNumber(x: unknown): x is BlockNumber {
  return (
    Strings.isString(x) ||
    (typeof x === "number" && isFinite(x)) ||
    typeof x === "bigint"
  );
}
