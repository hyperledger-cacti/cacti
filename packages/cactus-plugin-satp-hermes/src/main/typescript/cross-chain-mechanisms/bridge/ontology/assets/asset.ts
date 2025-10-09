import { v4 as uuidv4 } from "uuid";
import {
  ERCTokenStandard,
  TokenType,
} from "../../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkId } from "../../../../public-api";

export interface Asset {
  id: string;
  referenceId: string;
  type: TokenType;
  owner: string;
  contractName: string;
  network: NetworkId;
  ercTokenStandard: ERCTokenStandard;
}

export type Brand<K, T> = K & { __brand: T };
export type Amount = Brand<number, "Amount">;
export type UniqueTokenID = Brand<null, "UniqueTokenID">;

export interface FungibleAsset extends Asset {
  amount: Amount;
}

export interface NonFungibleAsset extends Asset {
  uniqueDescriptor: UniqueTokenID;
}

export function getTokenType(stringType: string) {
  return TokenType[stringType.toUpperCase() as keyof typeof TokenType];
}

export function createAssetId(
  contextId: string,
  tokenType: TokenType,
  networkId: string,
): string {
  return `${uuidv4()}-${contextId}-${tokenType}-${networkId}`;
}

export function instanceOfFungibleAsset(asset: Asset) {
  return "amount" in asset;
}

export function instanceOfNonFungibleAsset(asset: Asset) {
  return "uniqueDescriptor" in asset;
}
