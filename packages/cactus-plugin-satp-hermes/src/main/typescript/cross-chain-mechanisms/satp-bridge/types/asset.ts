import { v4 as uuidv4 } from "uuid";
import { TokenType } from "../../../generated/proto/cacti/satp/v02/common/message_pb";

export interface Asset {
  tokenId: string;
  tokenType: TokenType;
  owner: string;
  amount: number;
  ontology: string;
  contractName: string;
}

export enum InteractionType {
  MINT = 0,
  BURN = 1,
  ASSIGN = 2,
  CHECKPERMISSION = 3,
  LOCK = 4,
  UNLOCK = 5,
}

export function getTokenType(stringType: string) {
  return TokenType[stringType.toUpperCase() as keyof typeof TokenType];
}

export function getInteractionType(stringType: string) {
  return InteractionType[
    stringType.toUpperCase() as keyof typeof InteractionType
  ];
}

export function createAssetId(
  contextId: string,
  tokenType: TokenType,
  networkId: string,
): string {
  return `${uuidv4()}-${contextId}-${tokenType}-${networkId}`;
}
