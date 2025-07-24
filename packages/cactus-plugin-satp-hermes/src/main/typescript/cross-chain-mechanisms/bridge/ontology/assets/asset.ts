import { v4 as uuidv4 } from "uuid";
import { TokenType } from "../../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkId } from "../../../../public-api";

export interface Asset {
  id: string;
  referenceId: string;
  type: TokenType;
  owner: string;
  contractName: string;
  network: NetworkId;
}

export interface FungibleAsset extends Asset {
  amount: string;
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
