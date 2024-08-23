import { v4 as uuidv4 } from "uuid";
export interface Asset {
  tokenId: string;
  tokenType: TokenType;
  owner: string;
  amount: number;
  ontology: string;
  contractName: string;
}

//When there is new token type, add it here or it will break the code
export enum TokenType {
  ERC20 = 0,
  ERC721 = 1,
  ERC1155 = 2,
  NONSTANDARD = 3,
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
