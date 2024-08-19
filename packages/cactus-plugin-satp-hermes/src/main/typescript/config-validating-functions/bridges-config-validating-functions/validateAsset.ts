import {
  Asset,
  TokenType,
} from "../../core/stage-services/satp-bridge/types/asset";

// Type guard for TokenType
function isTokenType(obj: unknown): obj is TokenType {
  return (
    typeof obj === "number" &&
    obj !== null &&
    Object.values(TokenType).includes(obj)
  );
}

// Type guard for Asset
export function isAsset(obj: unknown): obj is Asset {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "tokenId" in obj &&
    typeof objRecord.tokenId === "string" &&
    "tokenType" in obj &&
    isTokenType(objRecord.tokenType) &&
    "owner" in obj &&
    typeof objRecord.owner === "string" &&
    "amount" in obj &&
    typeof objRecord.amount === "number" &&
    "ontology" in obj &&
    typeof objRecord.ontology === "string" &&
    "contractName" in obj &&
    typeof objRecord.contractName === "string"
  );
}
