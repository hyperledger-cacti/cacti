import { Asset } from "./asset";

export interface BesuAsset extends Asset {
  contractAddress: string;
}

export enum VarType {
  CONTRACTADDRESS = 0,
  TOKENTYPE = 1,
  TOKENID = 2,
  OWNER = 3,
  AMOUNT = 4,
  BRIDGE = 5,
  RECEIVER = 6,
}

export function getVarTypes(stringType: string) {
  return VarType[stringType.toUpperCase() as keyof typeof VarType];
}
