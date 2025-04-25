import * as fss from "fs";
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { keccak256 } from "js-sha3";
import type { SmartContractOntologyJsonConfig } from "../../../types/blockchain-interaction";
import {
  HashNotMatchingError,
  OntologyFormatError,
  InvalidSignatureError,
  BytecodeMissingSelectorError,
} from "./validationErrors";
/*
Provided with a list of file paths, returns the content of the first file it finds
*/
function loadDataFromFile(dirPaths: any[]) {
  for (const filePath of dirPaths) {
    try {
      console.log(filePath);
      const jsonData = fss.readFileSync(filePath, "utf-8");
      return jsonData;
    } catch (fileReadErr) {
      if (fileReadErr.code !== "ENOENT") {
        throw fileReadErr;
      }
    }
  }
}

function isSmartContractConfigJSON(
  obj: unknown,
): obj is SmartContractOntologyJsonConfig {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  if (!("name" in obj) || !("contract" in obj) || !("ontology" in obj)) {
    return false;
  }
  return true;
}

export function validateSmartContractJson(
  contractJsonFilePaths: string[],
  publicKeySet: any[],
  ontologyElementsFilePath: string,
  gatewayJsObjectSigner: JsObjectSigner,
): boolean | undefined {
  try {
    let data = "";
    const contractJsonString = loadDataFromFile(contractJsonFilePaths);
    if (contractJsonString !== undefined) data = contractJsonString;

    try {
      const jsonData = JSON.parse(data);
      if (isSmartContractConfigJSON(jsonData)) {
        const functionSignatures: any[] = [];
        let contractHash = "";
        let contractLanguage: any = "";
        Object.entries(jsonData).forEach(([key, value]) => {
          switch (true) {
            case key.toLowerCase().includes("name"):
              console.debug("Contract Name:", value);
              break;
            case key.toLowerCase().includes("ontology"):
              console.log("Checking Ontology");
              checkOntology(
                JSON.stringify(value),
                functionSignatures,
                ontologyElementsFilePath,
              );
              break;
            case key.toLowerCase().includes("bytecode"):
              console.log("Checking Bytecode");
              checkBytecodeValidity(
                functionSignatures,
                value,
                contractLanguage,
              );
              break;
            case key.toLowerCase().includes("hash"):
              console.log("Checking Hash");
              checkContractHash(
                JSON.stringify(jsonData),
                value,
                gatewayJsObjectSigner,
              );
              contractHash = value;
              break;
            case key.toLowerCase().includes("signature"):
              if (contractHash === "") {
                contractHash = gatewayJsObjectSigner.dataHash(
                  getBasicSmartContractConfigJson(data),
                );
              }
              console.log("Checking signature");
              checkSignature(
                contractHash,
                value,
                publicKeySet,
                gatewayJsObjectSigner,
              );
              break;
            case key.toLowerCase().includes("contract"):
              contractLanguage = value;
              break;
            case key.toLowerCase().includes("id"):
              console.log("ContractID", value);
              break;
            default:
              console.log("Unknown field", key);
              console.log("Content", value);
          }
        });
        return true;
      }
      return false;
    } catch (checkExecutionError) {
      throw checkExecutionError;
    }
  } catch (error) {
    throw error;
  }
}

function checkOntology(
  ontologyField: string,
  functionSignatures: string[],
  ontologyElementsFilePath: string,
) {
  const ontologyJson = JSON.parse(ontologyField);
  const ontologyCheckParameters = getOntologyCheckingParameters(
    ontologyElementsFilePath,
  );
  if (!(typeof ontologyJson === "object")) {
    throw new OntologyFormatError(
      "Ontology is not a collection of objects",
      __filename,
    );
  }
  const ontologyElements = ontologyCheckParameters.get("elements");
  Object.entries(ontologyJson).forEach(([key, value]) => {
    console.log("Checking Ontology Field", key);
    const keySimplified = key.replace(/[\s+\-_]/g, "").toLowerCase();
    if (ontologyElements.includes(keySimplified)) {
      const index = ontologyElements.indexOf(keySimplified);
      if (index !== -1) {
        ontologyElements.splice(index, 1);
      }
    }
    if (Array.isArray(value)) {
      value.forEach((functionElement: any) => {
        const functionSignature = functionElement.functionSignature;
        const functionNameSimplified = functionSignature
          .replace(/\([^)]*\)/g, "")
          .replace(/[-_]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        const signatureVars = extractElementsFromBrackets(functionSignature);
        const variables = functionElement.variables;
        if (
          signatureVars.length !== 0 &&
          signatureVars.length !== variables.length
        ) {
          throw new Error(
            "Variables on function signature not coinciding with variables field",
          );
        } else {
          checkOntologyElement(
            keySimplified,
            functionNameSimplified,
            variables,
            ontologyCheckParameters.get("functionVars").get(key),
          );
          functionSignatures.push(functionSignature);
        }
      });
    } else {
      throw new OntologyFormatError(
        "Function formats not in an array",
        __filename,
      );
    }
  });
  if (ontologyElements.length !== 0) {
    console.log("Elements missing for:");
    ontologyElements.forEach((element: any) => {
      console.log("->", element);
    });
    throw new OntologyFormatError(
      "Not every basic SATP operation is included",
      __filename,
    );
  }
  console.log("\nOntology is VALID!\n");
}

function checkOntologyElement(
  fieldName: string,
  elementFunctionName: string,
  variables: string[],
  ontologyElementParameters: any,
) {
  for (const [functionName, functionVars] of Object.entries(
    ontologyElementParameters,
  ) as [string, string[]][]) {
    if (
      functionName.toLowerCase().includes(elementFunctionName) &&
      variables.every((variable) => functionVars.includes(variable))
    ) {
      return;
    }
  }
  throw new OntologyFormatError(
    "Field " + fieldName + " on ontology with an invalid function ",
    __filename,
  );
}

function getBasicSmartContractConfigJson(jsonObject: string) {
  const contractJson = JSON.parse(jsonObject);
  const contractCryptFields = ["signature", "hash", "bytecode"];
  Object.keys(contractJson).forEach((jsonFieldName) => {
    if (
      contractCryptFields.some((keyword) =>
        jsonFieldName.toLowerCase().includes(keyword),
      )
    ) {
      delete contractJson[jsonFieldName];
    }
  });
  return contractJson;
}

function checkContractHash(
  jsonObject: string,
  contractHash: any,
  hashGenerator: JsObjectSigner,
) {
  const contractJson = getBasicSmartContractConfigJson(jsonObject);
  const computedHash = hashGenerator.dataHash(contractJson);

  if (contractHash !== null && contractHash !== computedHash) {
    throw new HashNotMatchingError(__filename);
  } else if (contractHash !== null && contractHash === computedHash) {
    console.log("\nHash is VALID!\n");
    return;
  } else {
    throw new HashNotMatchingError(__filename);
  }
}

function checkSignature(
  signedData: any,
  signature: any,
  keyArray: any,
  signatureCheckerObj: JsObjectSigner,
) {
  const signatureAsArray = new Uint8Array(signature.split(",").map(Number));
  for (const pubKey of keyArray) {
    const validSignature = signatureCheckerObj.verify(
      signedData,
      signatureAsArray,
      pubKey,
    );
    if (validSignature) {
      console.log("\nSignature is VALID\n");
      return;
    }
  }
  throw new InvalidSignatureError(__filename);
}

function checkBytecodeValidity(
  functionSignatures: string[],
  contractBytecode: any,
  contractLanguage: any,
) {
  if (contractLanguage.toLowerCase() === "solidity") {
    functionSignatures.forEach((signature) => {
      const signatureSelector = keccak256(signature).slice(0, 8);
      if (contractBytecode.includes(signatureSelector)) {
        console.log(
          `Function "${signature}" is in the bytecode (Selector: 0x${signatureSelector})`,
        );
      } else {
        throw new BytecodeMissingSelectorError(signature, __filename);
      }
    });
  }
}

function extractElementsFromBrackets(input: string): string[] {
  const match = input.match(/\((.*?)\)/);
  return match ? match[1].split(",").map((element) => element.trim()) : [];
}

function getOntologyCheckingParameters(filePath: string) {
  const configsObject = loadDataFromFile([filePath]);
  if (configsObject !== undefined) {
    const configsJson = JSON.parse(configsObject);
    const checkingParameters =
      configsJson.verification_parameters.smart_contracts_ontology;
    if (checkingParameters) {
      const parameters = Object.keys(checkingParameters).map((key) =>
        key
          .toLowerCase()
          .replace(/\([^)]*\)/g, "")
          .replace(/[-_]/g, "")
          .replace(/\s+/g, " "),
      );
      const elementsFunctionsAndVars = new Map<string, any>(
        Object.entries(checkingParameters),
      );
      return new Map<string, any>()
        .set("elements", parameters)
        .set("functionVars", elementsFunctionsAndVars);
    }
  }
  return new Map<string, any>();
}
