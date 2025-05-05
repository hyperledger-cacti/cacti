import { Asset, FungibleAsset } from "./asset";
import { InteractionsRequest as EvmInteractionSignature } from "../../../../generated/SATPWrapperContract";
import { getInteractionType, InteractionData } from "./interact-types";

export interface EvmAsset extends Asset {
  contractAddress: string;
}

export interface EvmFungibleAsset extends EvmAsset, FungibleAsset {}

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

export function evmInteractionList(
  jsonString: string,
): EvmInteractionSignature[] {
  const ontologyJSON = JSON.parse(jsonString);

  const interactions: EvmInteractionSignature[] = [];

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

    const interactionRequest: EvmInteractionSignature = {
      interactionType: getInteractionType(interaction),
      functionsSignature: functions,
      variables: variables,
      available: true,
    };
    interactions.push(interactionRequest);
  }

  return interactions;
}
