import * as fs from "fs/promises";
import * as fss from "fs";
import * as path from "path";
import { SHA256 } from "crypto-js";
import {
  createVerify,
  KeyLike,
  VerifyKeyObjectInput,
  VerifyPublicKeyInput,
} from "crypto";
import { keccak256 } from "js-sha3";
import { generateKeyPairSync, createSign } from "crypto";
import type {
  SmartContractConfig,
} from "../../../types/blockchain-interaction";
import { HashNotMatchingError, OntologyFormatError } from "./validationErrors";

const THIS_FILE_NAME = "validateContractFields.ts";

async function loadDataFromFile(dirPaths: string[], fileName: string) {
  for (const dirPath of dirPaths) {
    const filePath = path.join(dirPath, fileName);
    try {
      const jsonData = await fs.readFile(filePath, "utf-8");
      return jsonData;
    }
    catch (fileReadErr) {
      if (fileReadErr.code !== "ENOENT") {
        console.error("Error reading file: ", fileReadErr);
      }
    }
  }
}

async function writeDataToFile(dirPaths: string[], fileName: string, dataToWrite: any) {
  for (const dirPath of dirPaths) {
    const filePath = path.join(dirPath, fileName);
    if (fss.existsSync(filePath)) {
      try {
        await fs.writeFile(filePath, JSON.stringify(dataToWrite, null, 4), "utf-8");
      } catch (error) {
        console.log("Writing Error");
        throw error;
      }
    }
  }
}

function isSmartContractConfigJSON(obj: unknown): obj is SmartContractConfig {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  //const objRecord = obj as Record<string, unknown>;
  if (!("name" in obj) || !("contract" in obj) || !("ontology" in obj)) {
    return false;
  }
  return true;
}

export async function validateSmartContractJson(
  fileName: string,
  checkOptionsFilename: string,
  useOptionsFile: boolean,
  controlKeyPairFlag: boolean,
  filePaths: string[] = [
    "/home/tomas/cacti_old/cacti/packages/cactus-plugin-satp-hermes/src/test/solidity/",
  ],
): Promise<boolean| undefined> {
  if (useOptionsFile) {
    try {
      const checkOptionsDir =
        "/home/tomas/cacti_old/cacti/packages/cactus-plugin-satp-hermes/src/test/";
      const checkOptionsFile = path.join(checkOptionsDir, checkOptionsFilename);
      const data = await fs.readFile(checkOptionsFile, "utf-8");
      const checkOptionsJson = JSON.parse(data);
      console.log(checkOptionsJson);
    } catch (filePathErr) {
      console.error("Error opening check options file: ", filePathErr);
    }
  } else {
    try {
      let data = "";
      loadDataFromFile(filePaths, fileName).then((contractJsonString) => {
        if (contractJsonString !== undefined)
          data = contractJsonString;
      });
      // This if is for testing purposes of signature checks with locally generated keys
      if (controlKeyPairFlag) {
        generateNewKeyPair();
        data = await updateHashAndSignature(
          data,
          false,
          controlKeyPairFlag,
          "signature",
          filePaths,
          fileName,
        );
      }
      
      try {
        const jsonData = JSON.parse(data);
        if(isSmartContractConfigJSON(jsonData)) {
          const functionSignatures: any[] = [];
          let contractHash = "";
          let contractLanguage: any = "";
          Object.entries(jsonData).forEach(([key, value]) => {
            switch (true) {
              case key.toLowerCase().includes("name"):
                console.log("Contract Name:", value);
                break;
              case key.toLowerCase().includes("ontology"):
                if (typeof value === "object") {
                  console.log("Checking the ONTOLOGY");
                  checkOntologyV1(JSON.stringify(value), functionSignatures);
                }
                break;
              case key.toLowerCase().includes("bytecode"):
                console.log("Checking the BYTECODE");
                checkBytecodeValidityV1(
                  functionSignatures,
                  value,
                  contractLanguage,
                );
                break;
              case key.toLowerCase().includes("hash"):
                console.log("Checking the HASH");
                contractHash = parseAndCheckContractHashV2(
                  JSON.stringify(jsonData),
                  value,
                );
                break;
              case key.toLowerCase().includes("signature"):
                if (contractHash === "") {
                  contractHash = parseAndCheckContractHashV2(
                    JSON.stringify(jsonData),
                    "",
                    false,
                  );
                }
                console.log("Checking the SIGNATURE -", key);
                checkSignatureV2(contractHash, value, [
                  loadKeyFromFile("public_key.pem"),
                ]);
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
      } catch (checkExecErr) {
        throw checkExecErr;
      }
    } catch (error) {
      console.error(error);
    }
  }
}


function checkOntologyV1(ontologyField: string, functionSignatures: string[]) {
  const ontologyJson = JSON.parse(ontologyField);
  const ontologyElements = [
    "lock",
    "unlock",
    "mint",
    "burn",
    "assign",
    "approve",
    "checkpermission",
  ];
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
        const functionSignature = functionElement.function_signature;
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
          checkOntologyElementV1(keySimplified, variables);
          functionSignatures.push(functionSignature);
        }
      });
    } else {
      throw new OntologyFormatError("Function formats not in an array", THIS_FILE_NAME);
    }
  });
  if (ontologyElements.length !== 0) {
    console.log("Elements missing for:");
    ontologyElements.forEach((element) => {
      console.log("->", element);
    });
    throw new OntologyFormatError("Not every basic SATP operation is included", THIS_FILE_NAME);
  }
}

function checkOntologyElementV1(fieldName: string, variables: string[]) {
  const ontologyKeywords = new Map<string, string[]>();
  console.log(variables);
  switch (true) {
    case fieldName.includes("lock"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("origin", ["owner", "address"]);
      ontologyKeywords.set("destiny", ["bridge", "address"]);
      break;
    case fieldName.includes("unlock"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("origin", ["owner", "bridge", "address"]);
      break;
    case fieldName.includes("mint"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("destiny", ["owner", "bridge", "address"]);
      break;
    case fieldName.includes("burn"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("origin", ["owner", "bridge", "address"]);
      break;
    case fieldName.includes("assign"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("destiny", ["owner", "bridge", "address"]);
      break;
    case fieldName.includes("permission"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("entity", ["owner", "bridge", "address"]);
      break;
    case fieldName.includes("approve"):
      ontologyKeywords.set("amount", ["amount", "uint256"]);
      ontologyKeywords.set("destiny", ["owner", "bridge", "address"]);
      break;
    default:
      console.log("Ontology field " + fieldName + "is unknown for check");
  }
  for (const entry of ontologyKeywords.entries()) {
    if (
      !entry[1].some((keyWord) =>
        variables.some((variable) => variable.includes(keyWord)),
      )
    ) {
      throw new Error(
        "Field " + fieldName + " missing a variable for " + entry[0],
      );
    }
  }
}

function parseAndCheckContractHashV2(
  jsonObject: string,
  contractHash: any = null,
  check: boolean = true,
) {
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
  const hash = SHA256(JSON.stringify(contractJson) ?? "").toString();
  if (check && contractHash !== null) {
    if (contractHash === hash) {
      console.log("Hashes match: ", hash);
    } else {
      throw new HashNotMatchingError(THIS_FILE_NAME);
    }
    return hash;
  } else {
    return hash;
  }
}

async function updateHashAndSignature(
  data: string,
  redoHash: boolean,
  redoSignature: boolean,
  signatureId: string = "signature",
  filePaths: string[],
  fileName: string,
) {
  const contractJson = JSON.parse(data);
  const contractCryptFields = ["signature", "hash", "bytecode"];
  const bytecode = contractJson.bytecode;
  let hash = null;
  const hashField = Object.keys(contractJson).find((key) =>
    key.toLowerCase().includes("hash"),
  );
  if (hashField !== undefined) hash = contractJson[hashField];
  if (redoHash || redoSignature) {
    Object.keys(contractJson).forEach((jsonFieldName) => {
      if (
        contractCryptFields.some((keyword) =>
          jsonFieldName.toLowerCase().includes(keyword),
        )
      ) {
        delete contractJson[jsonFieldName];
      }
    });
  }
  if (redoHash) {
    hash = SHA256(JSON.stringify(contractJson) ?? "").toString();
    redoSignature = true;
  }
  if (redoSignature && hash !== undefined && hash !== null) {
    const privateKey = loadKeyFromFile("private_key.pem");
    const sign = createSign("SHA256");
    sign.update(hash);
    sign.end();
    const signature = sign.sign(privateKey, "hex");
    contractJson[signatureId] = signature;
  }
  contractJson.bytecode = bytecode;
  contractJson.hash = hash;
  if (redoHash || redoSignature) {
    writeDataToFile(filePaths, fileName, contractJson);
  }
  return JSON.stringify(contractJson);
}

function checkSignatureV2(signedData: any, signature: any, keyArray: any) {
  const verify = createVerify("SHA256");
  verify.update(signedData);
  verify.end();
  const validSignature = keyArray.some(
    (key: KeyLike | VerifyKeyObjectInput | VerifyPublicKeyInput) =>
      verify.verify(key, signature, "hex"),
  );
  if (validSignature) {
    console.log("Signature is valid");
  } else {
    throw new Error("No key to validate the signature");
  }
}

function checkBytecodeValidityV1(
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
        throw new Error("Function selector is missing for " + signature);
      }
    });
  }
}

function generateNewKeyPair(
  keyName: string = "key",
  keyFileExtension: string = ".pem",
) {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
  fss.writeFileSync(
    "private_" + keyName + keyFileExtension,
    privateKey.toString(),
  );
  fss.writeFileSync(
    "public_" + keyName + keyFileExtension,
    publicKey.toString(),
  );
}

function loadKeyFromFile(keyFilePath: string) {
  const loadedKey = fss.readFileSync(keyFilePath, "utf8");
  return loadedKey;
}

function extractElementsFromBrackets(input: string): string[] {
  const match = input.match(/\((.*?)\)/);
  return match ? match[1].split(",").map((element) => element.trim()) : [];
}
