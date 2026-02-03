import { Asset, FungibleAsset, NonFungibleAsset } from "./asset";
import { InteractionsRequest as EvmInteractionSignature } from "../../../../generated/SATPWrapperContract";
import { getInteractionType, InteractionData } from "./interact-types";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";

export interface EvmAsset extends Asset {
  contractAddress: string;
}

export interface EvmFungibleAsset extends EvmAsset, FungibleAsset {}
export interface EvmNonFungibleAsset extends EvmAsset, NonFungibleAsset {}

export enum AssetParameterIdentifier {
  CONTRACTADDRESS = 0,
  TOKENTYPE = 1,
  TOKENID = 2,
  OWNER = 3,
  AMOUNT = 4,
  BRIDGE = 5,
  RECEIVER = 6,
  UNIQUE_DESCRIPTOR = 7,
}

export function getAssetParameterIdentifier(stringType: string) {
  return AssetParameterIdentifier[
    stringType.toUpperCase() as keyof typeof AssetParameterIdentifier
  ];
}

export function evmInteractionList(
  jsonString: string,
): EvmInteractionSignature[] {
  const label: string = "EvmInteractionList";
  const logLevel: LogLevelDesc = "INFO";
  const log: Logger = LoggerProvider.getOrCreate({ label, level: logLevel });

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
        vars.push(getAssetParameterIdentifier(variable));
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
    log.info(interactionRequest);
  }

  return interactions;
}
