import * as fs from "fs";
import { keccak256 } from "js-sha3";
import {
  Secp256k1Keys,
  ISignerKeyPair,
  JsObjectSigner,
} from "@hyperledger/cactus-common";
import { validateSmartContractJson } from "../../../../main/typescript/services/validation/config-validating-functions/validateContractFields";
import "jest-extended";
import path from "path";
import {
  HashNotMatchingError,
  OntologyFormatError,
  InvalidSignatureError,
  BytecodeMissingSelectorError,
} from "../../../../main/typescript/services/validation/config-validating-functions/validationErrors";
import { SmartContractOntologyJsonConfig } from "../../../../main/typescript/types/blockchain-interaction";
const testDirectoryPath = "./satp-smart-contract-test-temp-dir/";
const ontologyCheckElementsFilePath =
  "./satp-smart-contract-test-temp-dir/ontologyCheckParameters.json";
let dummyContract1,
  dummyContract2,
  dummyContract3,
  dummyContract4,
  dummyContract5,
  dummyContract6,
  dummyContract7,
  dummyContract8: SmartContractOntologyJsonConfig;
let keyPair0, keyPair1, keyPair2, keyPair3, keyPair4: ISignerKeyPair;
let pubKeyArray: (string | Uint8Array | Buffer)[];
const dummyContractFilePaths: string[][] = [];
let gatewayJsObjectSigner: JsObjectSigner;

beforeAll(async () => {
  if (!fs.existsSync(testDirectoryPath)) {
    const r1 = fs.mkdirSync(testDirectoryPath);
    expect(r1).not.toBeUndefined;
    expect(r1).not.toBeNull;
  }
  keyPair0 = Secp256k1Keys.generateKeyPairsBuffer();
  keyPair1 = Secp256k1Keys.generateKeyPairsBuffer();
  keyPair2 = Secp256k1Keys.generateKeyPairsBuffer();
  keyPair3 = Secp256k1Keys.generateKeyPairsBuffer();
  keyPair4 = Secp256k1Keys.generateKeyPairsBuffer();
  pubKeyArray = [keyPair1.publicKey, keyPair2.publicKey, keyPair3.publicKey];

  gatewayJsObjectSigner = new JsObjectSigner({
    privateKey: keyPair0.privateKey,
  });

  const ontologyCheckParam = {
    verification_parameters: {
      smart_contracts_ontology: {
        lock: {
          function: ["var1", "var2"],
          transfer: ["owner", "bridge", "amount", "address", "uint256"],
        },
        unlock: {
          approve: ["bridge", "amount", "address", "uint256"],
          transfer: ["address", "uint256", "bridge", "owner", "amount"],
        },
        mint: {
          mint: ["address", "uint256", "bridge", "amount"],
        },
        burn: {
          burn: ["address", "uint256", "bridge", "amount"],
        },
        assign: {
          assign: ["address", "uint256", "bridge", "amount", "receiver"],
        },
        checkPermission: {
          haspermission: ["address", "bridge"],
        },
      },
    },
  };

  const ontologyLockFunctionComplete1 = {
    functionSignature: "transfer",
    variables: ["owner", "bridge", "amount"],
  };
  const ontologyUnlockFunctionComplete1 = {
    functionSignature: "approve",
    variables: ["bridge", "amount"],
  };
  const ontologyUnlockFunctionComplete2 = {
    functionSignature: "transfer",
    variables: ["bridge", "owner", "amount"],
  };
  const ontologyMintFunctionComplete1 = {
    functionSignature: "mint",
    variables: ["bridge", "amount"],
  };
  const ontologyBurnFunctionComplete1 = {
    functionSignature: "burn",
    variables: ["bridge", "amount"],
  };
  const ontologyAssignFunctionComplete1 = {
    functionSignature: "assign",
    variables: ["bridge", "receiver", "amount"],
  };
  const ontologyCheckPermissionFunctionComplete1 = {
    functionSignature: "hasPermission",
    variables: ["address"],
  };
  const ontologyPieces = [
    ontologyLockFunctionComplete1,
    ontologyUnlockFunctionComplete1,
    ontologyUnlockFunctionComplete2,
    ontologyMintFunctionComplete1,
    ontologyBurnFunctionComplete1,
    ontologyAssignFunctionComplete1,
    ontologyCheckPermissionFunctionComplete1,
  ];
  let completeBytecode = "";
  ontologyPieces.forEach((piece) => {
    completeBytecode += keccak256(piece.functionSignature).slice(0, 8);
  });
  const completeOntology = {
    lock: [ontologyLockFunctionComplete1],
    unlock: [ontologyUnlockFunctionComplete1, ontologyUnlockFunctionComplete2],
    mint: [ontologyMintFunctionComplete1],
    burn: [ontologyBurnFunctionComplete1],
    assign: [ontologyAssignFunctionComplete1],
    checkPermission: [ontologyCheckPermissionFunctionComplete1],
  };

  const incompleteOntology = {
    lock: [ontologyLockFunctionComplete1],
    unlock: [ontologyUnlockFunctionComplete1, ontologyUnlockFunctionComplete2],
  };

  dummyContract1 = {
    name: "DUMMY-CONTRACT-1",
    contract: "fabric",
    ontology: completeOntology,
  };

  dummyContract2 = {
    name: "DUMMY-CONTRACT-2",
    contract: "solidity",
    ontology: completeOntology,
  };

  dummyContract3 = {
    name: "DUMMY-CONTRACT-3",
    contract: "solidity",
    ontology: completeOntology,
  };

  const dummyContract3Hash = gatewayJsObjectSigner.dataHash(dummyContract3);
  Object.assign(dummyContract3, { hash: dummyContract3Hash });
  Object.assign(dummyContract3, { bytecode: completeBytecode });

  const dummyContract3Signing = new JsObjectSigner({
    privateKey: keyPair1.privateKey,
  });
  const dummyContract3Signature = dummyContract3Signing
    .sign(dummyContract3Hash.toString())
    .toString();
  Object.assign(dummyContract3, {
    signature: dummyContract3Signature,
  });

  dummyContract4 = {
    //bytecode fail
    name: "DUMMY-CONTRACT-4",
    contract: "solidity",
    ontology: completeOntology,
    bytecode: completeBytecode.slice(
      5,
      completeBytecode.length - completeBytecode.length / 2,
    ),
  };

  dummyContract5 = {
    //signature fail
    name: "DUMMY-CONTRACT-5",
    contract: "solidity",
    ontology: completeOntology,
  };

  const dummyContract5Hash = gatewayJsObjectSigner.dataHash(dummyContract5);
  const dummyContract5Sign = new JsObjectSigner({
    privateKey: keyPair4.privateKey,
  });
  const dummyContract5Signature = dummyContract5Sign
    .sign(dummyContract5Hash.toString())
    .toString();
  Object.assign(dummyContract5, { signature: dummyContract5Signature });

  dummyContract6 = {
    //Hash fail
    name: "DUMMY-CONTRACT-6",
    contract: "solidity",
    ontology: completeOntology,
    hash: dummyContract5Hash,
  };

  dummyContract7 = {
    //ontology incorrect
    name: "DUMMY-CONTRACT-7",
    contract: "solidity",
    ontology: "NOTHING",
  };

  dummyContract8 = {
    //ontology incomplete
    name: "DUMMY-CONTRACT-8",
    contract: "solidity",
    ontology: incompleteOntology,
  };

  const contractArray = [
    dummyContract1,
    dummyContract2,
    dummyContract3,
    dummyContract4,
    dummyContract5,
    dummyContract6,
    dummyContract7,
    dummyContract8,
  ];

  contractArray.forEach(async (contract, index) => {
    const newFileName = "dummyContract" + (index + 1) + ".json";
    const newFilePath = path.join(testDirectoryPath, newFileName);
    if (!fs.existsSync(newFilePath)) {
      try {
        await fs.writeFileSync(newFilePath, JSON.stringify(contract), "utf-8");
        const np = [newFilePath.toString()];
        dummyContractFilePaths.push(np);
      } catch (error) {
        throw error;
      }
    }
  });
  await fs.writeFileSync(
    ontologyCheckElementsFilePath,
    JSON.stringify(ontologyCheckParam),
    "utf-8",
  );
});

describe("Correct Smart Contract Validation", () => {
  it("Should validate a fabric json with ontology only", async () => {
    const path1 = dummyContractFilePaths[0];
    console.log(path1);
    const response = validateSmartContractJson(
      path1,
      pubKeyArray,
      ontologyCheckElementsFilePath,
      gatewayJsObjectSigner,
    );
    expect(response).not.toBeUndefined();
    expect(response).toBeTrue();
  });

  it("Should validate a solidity json with ontology only ", async () => {
    const path2 = dummyContractFilePaths[1];
    const response2 = validateSmartContractJson(
      path2,
      pubKeyArray,
      ontologyCheckElementsFilePath,
      gatewayJsObjectSigner,
    );
    expect(response2).not.toBeUndefined();
    expect(response2).toBeTrue();
  });

  it("Should validate a complete solidity json", async () => {
    const path3 = dummyContractFilePaths[2];
    const response3 = validateSmartContractJson(
      path3,
      pubKeyArray,
      ontologyCheckElementsFilePath,
      gatewayJsObjectSigner,
    );
    expect(response3).not.toBeUndefined();
    expect(response3).toBeTrue();
  });

  it("Should detect an invalid bytecode for a solidity json", () => {
    const path4 = dummyContractFilePaths[3];
    console.log(path4);
    expect(() => {
      validateSmartContractJson(
        path4,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      );
    }).toThrowError(BytecodeMissingSelectorError);
  });

  it("Should detect an unverifiable signature", () => {
    const path5 = dummyContractFilePaths[4];
    expect(() => {
      validateSmartContractJson(
        path5,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      );
    }).toThrowError(InvalidSignatureError);
  });

  it("Should detect an invalid hash", async () => {
    const path6 = dummyContractFilePaths[5];
    expect(() =>
      validateSmartContractJson(
        path6,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      ),
    ).toThrowError(HashNotMatchingError);
  });

  it("Should detect an incorrect ontology format", async () => {
    const path7 = dummyContractFilePaths[6];
    expect(() =>
      validateSmartContractJson(
        path7,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      ),
    ).toThrowError(OntologyFormatError);
    expect(() =>
      validateSmartContractJson(
        path7,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      ),
    ).toThrow("not a collection of objects");
  });

  it("Should detect an incomplete ontology format", async () => {
    const path8 = dummyContractFilePaths[7];
    expect(() =>
      validateSmartContractJson(
        path8,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      ),
    ).toThrowError(OntologyFormatError);
    expect(() =>
      validateSmartContractJson(
        path8,
        pubKeyArray,
        ontologyCheckElementsFilePath,
        gatewayJsObjectSigner,
      ),
    ).toThrow("Not every basic SATP operation is included");
  });
});

afterAll(async () => {
  fs.rmSync(testDirectoryPath, { recursive: true });
});
