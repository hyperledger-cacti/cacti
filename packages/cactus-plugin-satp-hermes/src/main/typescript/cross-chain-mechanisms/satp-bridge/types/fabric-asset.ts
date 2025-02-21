import { Asset, InteractionType } from "./asset";

export interface FabricAsset extends Asset {
  mspId: string;
  channelName: string;
}

export enum VarType {
  CONTRACTNAME = 0,
  CHANNELNAME = 1,
  TOKENID = 2,
  OWNER = 3,
  OWNERMSPID = 4,
  AMOUNT = 5,
  BRIDGE = 6,
  BRIDGEMSPID = 7,
  RECEIVER = 8,
  MSPID = 9,
}

export function getVarTypes(stringType: string) {
  return VarType[stringType.toUpperCase() as keyof typeof VarType];
}

export interface InteractionSignature {
  type: InteractionType;
  functionsSignature: string[];
  variables: VarType[][];
}
