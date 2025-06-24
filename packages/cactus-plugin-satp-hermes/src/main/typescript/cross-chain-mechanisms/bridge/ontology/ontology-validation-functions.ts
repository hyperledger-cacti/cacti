/**
 * @file ontology-validation-functions.ts
 * @description This file contains the implementation of several functions which purpose is to validate several elements from ontologies.
 * It provides methods to validate the format of an ontology Json, validate an ontology signature and an ontology hash
 */
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { InteractionData, InteractionType } from "./assets/interact-types";
import {
  BadFormatJson,
  IncompleteOntologyError,
  UnknownOntologyInteractionError,
  UnknownOntologyVariableError,
} from "./ontology-errors";
import { OntologyJsonFormat, OntologyManager } from "./ontology-manager";
import { isObject, isString } from "class-validator";

/**
 * Confirms if the provided ontology json's string parses into a well formatted ontology json
 * @param {string} ontology - an ontology.json string
 * @returns - the json specified by the provided ontology json's string
 * @throws {BadFormatJson} - If the resulting json is incomplete
 */
export function validateOntologyJsonFormat(ontology: string) {
  const ontologyAsJson = JSON.parse(ontology);
  if (
    !("name" in ontologyAsJson && isString(ontologyAsJson.name)) ||
    !("id" in ontologyAsJson && isString(ontologyAsJson.id)) ||
    !("type" in ontologyAsJson && isString(ontologyAsJson.type)) ||
    !("contract" in ontologyAsJson && isString(ontologyAsJson.contract)) ||
    !("ontology" in ontologyAsJson && isObject(ontologyAsJson.ontology)) ||
    !("bytecode" in ontologyAsJson && isString(ontologyAsJson.bytecode)) ||
    !("hash" in ontologyAsJson && isString(ontologyAsJson.hash)) ||
    !("signature" in ontologyAsJson && isString(ontologyAsJson.signature))
  ) {
    throw new BadFormatJson(
      "Provided Ontology not supported by necessary additional fields",
    );
  }
  return ontologyAsJson as OntologyJsonFormat;
}

/**
 * Given the ontology field from an Ontology, validates if it follows the expected principles
 * @param {any} ontology - the ontology field
 * @param {string[]} supportedVarTypes - the list of supported variable types for the ontology's functions
 * @param {string} ledgerType - the ledger type for the ontology
 * @param {string} tokenId - the Id of the ontology
 * @throws {IncompleteOntologyError} If the ontology does not specify every necessary interaction
 * @throws {UnknownOntologyInteractionError} If the ontology specifies an unknown interaction
 * @throws {UnknownOntologyVariableError} If the ontology includes a function with unexpected variables
 */
export function validateOntologyFormat(
  ontology: any,
  supportedVarTypes: string[],
  ledgerType: string,
  tokenId: string,
) {
  const fnTag = `${OntologyManager.CLASS_NAME}#getOntology()`;
  const ontologyInteractionsList = Object.keys(InteractionType)
    .filter((el) => isNaN(parseInt(el)))
    .map((str) => str.toUpperCase());
  supportedVarTypes = supportedVarTypes
    .filter((item) => typeof item === "string")
    .map((str) => str.toLowerCase());
  if (ontologyInteractionsList.length != Object.keys(ontology).length) {
    throw new IncompleteOntologyError(
      `${fnTag}, Ontology of ledger: ${ledgerType} with id: ${tokenId} lacking interaction fields`,
    );
  }
  for (const interaction in ontology) {
    //Check if the ontology has the necessary interactions, and no unknown ones
    if (!ontologyInteractionsList.includes(interaction.toUpperCase())) {
      throw new UnknownOntologyInteractionError(
        `${fnTag}, Ontology of ledger: ${ledgerType} with id: ${tokenId} with undefined interaction ${interaction}`,
      );
    } else if (ontology[interaction].length == 0) {
      throw new IncompleteOntologyError(
        `${fnTag}, Ontology of ledger: ${ledgerType} with id: ${tokenId} with undefined interaction ${interaction}`,
      );
    }

    for (const interactionFunction of ontology[
      interaction
    ] as InteractionData[]) {
      const variablesLowerCase = interactionFunction.variables.map((str) =>
        str.toLowerCase(),
      );
      const functionSignatureLowerCase = interactionFunction.functionSignature
        .replace(/\(.*\)$/, "")
        .toLowerCase();

      //Check if the variables of an interaction's function are all within the expected superset of variables
      if (
        !variablesLowerCase.every((varName) =>
          supportedVarTypes.includes(varName),
        )
      ) {
        throw new UnknownOntologyVariableError(
          `${fnTag}, Ontology of ledger: ${ledgerType} with id: ${tokenId} with unknown variable on function ${functionSignatureLowerCase} of ${interaction}`,
        );
      }
    }
  }
}

/**
 * Confirms the validity of a signature string from an ontology
 * @param {any} ontology - the signed ontology field.
 * @param {Uint8Array} pubKey - a public key to attest the signature.
 * @param {string} signature - the signature to attest.
 * @param {JsObjectSigner} managerJsObjectSigner - the signature verifier.
 * @returns Whether the signature is valid for the provided key or not.
 */
export function validateOntologySignature(
  ontology: any,
  pubKey: Uint8Array,
  signature: string,
  managerJsObjectSigner: JsObjectSigner,
) {
  try {
    const validBridgeSignature = managerJsObjectSigner.verify(
      managerJsObjectSigner.dataHash(ontology),
      new Uint8Array(signature.split(",").map(Number)),
      pubKey,
    );
    return validBridgeSignature;
  } catch (error) {
    return false;
  }
}

/**
 * Confirms if a hash string is valid for an ontology
 * @param {any} ontology - the ontology field.
 * @param {string} hash - the hash to attest.
 * @param {JsObjectSigner} managerJsObjectSigner - the hash verifier.
 * @returns Whether the hash is valid or not.
 */
export function validateOntologyHash(
  ontology: any,
  hash: string,
  managerJsObjectSigner: JsObjectSigner,
) {
  try {
    const validHash =
      managerJsObjectSigner.dataHash(ontology).toString() === hash;
    return validHash;
  } catch (error) {
    return false;
  }
}
