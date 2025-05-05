import { Asset, FungibleAsset } from "./asset";
import {
  getInteractionType,
  InteractionData,
  InteractionType,
} from "./interact-types";

export interface FabricAsset extends Asset {
  mspId: string;
  channelName: string;
}

export interface FabricFungibleAsset extends FabricAsset, FungibleAsset {}

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

export interface FabricInteractionSignature {
  type: InteractionType;
  functionsSignature: string[];
  variables: VarType[][];
}

export function fabricInteractionList(
  jsonString: string,
): FabricInteractionSignature[] {
  const ontologyJSON = JSON.parse(jsonString);

  const interactions: FabricInteractionSignature[] = [];

  for (const interaction in ontologyJSON["ontology"]) {
    const functions: string[] = [];
    const variables: string | number[][] = [];

    for (const signature of ontologyJSON["ontology"][
      interaction
    ] as InteractionData[]) {
      functions.push(signature.functionSignature);
      const vars: string | number[] = [];

      for (const variable of signature.variables) {
        vars.push(getVarTypes(variable));
      }
      variables.push(vars);
    }

    const interactionRequest: FabricInteractionSignature = {
      type: getInteractionType(interaction),
      functionsSignature: functions,
      variables: variables,
    };
    interactions.push(interactionRequest);
  }
  return interactions;
}
