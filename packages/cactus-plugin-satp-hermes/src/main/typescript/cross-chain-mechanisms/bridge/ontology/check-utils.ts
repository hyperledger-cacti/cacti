import { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { getInteractionType, InteractionType } from "./assets/interact-types";
import { isObject, isString } from "class-validator";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import {
  AssetParameterIdentifier as EvmVarType,
  getAssetParameterIdentifier as getEvmVarType,
} from "./assets/evm-asset";
import {
  AssetParameterIdentifier as FabricVarType,
  getVarTypes as getFabricVarType,
} from "./assets/fabric-asset";
import {
  InteractionWithoutFunctionError,
  InvalidBytecodeError,
  InvalidOntologyHash,
  InvalidOntologySignature,
  LedgerNotSupported,
  OntologyFunctionNotAvailable,
  OntologyFunctionVariableNotSupported,
  UnknownInteractionError,
} from "./ontology-errors";
import { BridgeLeaf } from "../bridge-leaf";
import { EthereumLeaf } from "../leafs/ethereum-leaf";

export enum OntologyCheckLevel {
  DEFAULT = "DEFAULT",
  HASHED = "HASHED",
  HASHED_SIGNED = "HASHED_SIGNED",
  BYTECODE = "BYTECODE",
}

export interface OntologyJson {
  name: string;
  id: string;
  type: string;
  contract: string;
  ontology: Record<string, OntologyFunction[]>;
  bytecode: string;
  hash: string;
  signature: string;
}

export interface OntologyFunction {
  functionSignature: string;
  variables: string[];
  available?: string;
}

export function isValidOntologyJsonFormat(ontologyJSON: any) {
  if (typeof ontologyJSON !== "object" || ontologyJSON === null) {
    throw new Error("Provided ontology is null or not an object");
  }
  const requiredFields = [
    { key: "name", check: isString },
    { key: "id", check: isString },
    { key: "type", check: isString },
    { key: "contract", check: isString },
    { key: "ontology", check: isObject },
    { key: "bytecode", check: isString },
    { key: "hash", check: isString },
    { key: "signature", check: isString },
  ];

  for (const field of requiredFields) {
    if (!(field.key in ontologyJSON) || !field.check(ontologyJSON[field.key])) {
      throw new Error(
        `Provided Ontology missing or invalid field: ${field.key}`,
      );
    }
  }
  return ontologyJSON as OntologyJson;
}

export function checkOntologyContent(
  ontology: OntologyJson,
  pubKeyArray: Uint8Array[],
  JsObjectSigner: JsObjectSigner,
  level: OntologyCheckLevel = OntologyCheckLevel.DEFAULT,
) {
  // levels should be listed from most to least strict - most strict levels need to perform all checks of the less strict levels
  switch (level) {
    case OntologyCheckLevel.HASHED_SIGNED:
      validateOntologySignature(ontology, pubKeyArray!, JsObjectSigner!);
    case OntologyCheckLevel.HASHED:
      validateOntologyHash(ontology, JsObjectSigner!);
    case OntologyCheckLevel.DEFAULT:
      validateOntologyFunctions(ontology);
      break;
  }
}

/**
 * Confirms if a hash string is valid for an ontology
 * @param {any} ontology - the ontology field.
 * @param {string} hash - the hash to attest.
 * @param {JsObjectSigner} JsObjectSigner - the hash verifier.
 * @returns Whether the hash is valid or not.
 */
export function validateOntologyHash(
  ontologyJSON: OntologyJson,
  JsObjectSigner: JsObjectSigner,
) {
  const objToHash = JSON.parse(JSON.stringify(ontologyJSON));
  delete objToHash.hash;
  delete objToHash.signature;
  const validHash =
    JsObjectSigner.dataHash(objToHash).toString() === ontologyJSON.hash;
  if (!validHash) {
    throw new InvalidOntologyHash();
  }
}

/**
 * Confirms the validity of a signature string from an ontology
 * @param {any} ontology - the signed ontology field.
 * @param {Uint8Array} pubKey - a public key to attest the signature.
 * @param {string} signature - the signature to attest.
 * @param {JsObjectSigner} JsObjectSigner - the signature verifier.
 * @returns Whether the signature is valid for the provided key or not.
 */
export function validateOntologySignature(
  ontologyJSON: OntologyJson,
  pubKeys: Uint8Array[],
  JsObjectSigner: JsObjectSigner,
) {
  const objToHash = JSON.parse(JSON.stringify(ontologyJSON));
  delete objToHash.hash;
  delete objToHash.signature;
  for (const key of pubKeys) {
    const validBridgeSignature = JsObjectSigner.verify(
      JsObjectSigner.dataHash(objToHash),
      new Uint8Array(ontologyJSON.signature.split(",").map(Number)),
      key,
    );
    if (validBridgeSignature) {
      return true;
    }
  }
  throw new InvalidOntologySignature();
}

export function validateOntologyFunctions(ontology: OntologyJson) {
  const ontologyInteractions = ontology.ontology;
  for (const [interaction, interactionFunctions] of Object.entries(
    ontologyInteractions,
  )) {
    if (!(getInteractionType(interaction) in InteractionType)) {
      throw new UnknownInteractionError(interaction);
    }
    if (interactionFunctions.length === 0) {
      throw new InteractionWithoutFunctionError(interaction);
    }
    for (const functionData of interactionFunctions) {
      switch (ontology.type as LedgerType) {
        case LedgerType.Ethereum:
        case LedgerType.Besu1X:
        case LedgerType.Besu2X:
          if (!functionData.available) {
            throw new OntologyFunctionNotAvailable(
              functionData.functionSignature,
            );
          }
          for (const variable of functionData.variables) {
            if (!(getEvmVarType(variable) in EvmVarType)) {
              throw new OntologyFunctionVariableNotSupported(
                variable,
                ontology.type,
              );
            }
          }
          break;
        case LedgerType.Fabric2:
          for (const variable of functionData.variables) {
            if (!(getFabricVarType(variable) in FabricVarType)) {
              throw new OntologyFunctionVariableNotSupported(
                variable,
                ontology.type,
              );
            }
          }
          break;
        default:
          throw new LedgerNotSupported();
      }
    }
  }
  return true;
}

export async function validateOntologyBytecode(
  ontology: OntologyJson,
  ledgerType: LedgerType,
  chainLeaf: BridgeLeaf,
  contractAddress: string,
) {
  switch (ledgerType) {
    case LedgerType.Ethereum:
      const bytecode = (
        await (chainLeaf as EthereumLeaf).getContractBytecode(contractAddress)
      ).response;
      if (ontology.bytecode !== bytecode) {
        throw new InvalidBytecodeError();
      }
      return true;
    default:
      throw new LedgerNotSupported();
  }
}
