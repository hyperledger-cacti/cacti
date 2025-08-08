import {
  OntologyManager,
  IOntologyManagerOptions,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { LedgerType } from "@hyperledger/cactus-core-api";
import {
  IncompleteOntologyError,
  OntologyNotFoundError,
  UnknownOntologyVariableError,
  UnknownOntologyInteractionError,
  InvalidSignatureError,
  HashNotMatchingError,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-errors";
import * as fs from "fs";
import * as path from "path";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { JsObjectSigner, Secp256k1Keys } from "@hyperledger/cactus-common";
import {
  validateOntologyHash,
  validateOntologySignature,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-validation-functions";

jest.mock("fs");
jest.mock("path");

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

describe("OntologyManager", () => {
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const ontologySigner = new JsObjectSigner({ privateKey: keyPair.privateKey });

  const mockOntology1 = {
    lock: [
      {
        functionSignature: "transfer(address,address,uint256)",
        variables: ["owner", "bridge", "amount"],
        available: true,
      },
    ],
    unlock: [
      {
        functionSignature: "approve(address,uint256)",
        variables: ["bridge", "amount"],
        available: true,
      },
      {
        functionSignature: "transfer(address,address,uint256)",
        variables: ["bridge", "owner", "amount"],
        available: true,
      },
    ],
    mint: [
      {
        functionSignature: "mint(address,uint256)",
        variables: ["bridge", "amount"],
        available: true,
      },
    ],
    burn: [
      {
        functionSignature: "burn(address,uint256)",
        variables: ["bridge", "amount"],
        available: true,
      },
    ],
    assign: [
      {
        functionSignature: "assign(address,address,uint256)",
        variables: ["bridge", "receiver", "amount"],
        available: true,
      },
    ],
    checkPermission: [
      {
        functionSignature: "hasPermission(address)",
        variables: ["bridge"],
        available: true,
      },
    ],
    approve: [
      {
        functionSignature: "approve(address, uint256)",
        variables: ["contractAddress", "amount"],
        available: true,
      },
    ],
  };

  const mockOntology2 = {
    lock: [
      {
        functionSignature: "transferFrom",
        variables: ["owner", "bridge", "amount"],
      },
    ],
    unlock: [
      {
        functionSignature: "transfer",
        variables: ["owner", "amount"],
      },
    ],
    mint: [
      {
        functionSignature: "mint",
        variables: ["amount"],
      },
    ],
    burn: [
      {
        functionSignature: "burn",
        variables: ["amount"],
      },
    ],
    assign: [
      {
        functionSignature: "assign",
        variables: ["bridge", "receiver", "amount"],
      },
    ],
    checkPermission: [
      {
        functionSignature: "hasPermission",
        variables: ["bridgeMSPID"],
      },
    ],
    approve: [
      {
        functionSignature: "approve",
        variables: ["ContractName", "amount"],
      },
    ],
  };

  const mockOntologiesPath = "./ontologies";
  const mockOntologyFile1 = "ontology1.json";
  const mockOntologyFile2 = "ontology2.json";
  const mockOntologyContent1 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "BESU_2X",
    contract: "solidity",
    ontology: mockOntology1,
    bytecode: "",
    signature: ontologySigner
      .sign(ontologySigner.dataHash(mockOntology1))
      .toString(),
    hash: ontologySigner.dataHash(mockOntology1).toString(),
  });

  const mockOntologyContent2 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "FABRIC_2",
    contract: "base64",
    ontology: mockOntology2,
    bytecode: "",
    signature: ontologySigner
      .sign(ontologySigner.dataHash(mockOntology2))
      .toString(),
    hash: ontologySigner.dataHash(mockOntology2),
  });

  const mockOntologyInvalidContent1 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "FABRIC_2",
    contract: "base64",
    ontology: {
      lock: [],
      unlock: [],
      mint: [],
      burn: [],
      assign: [],
      checkPermission: [],
      approve: [],
    },
    bytecode: "",
    signature: "",
    hash: "",
  });

  const mockOntologyInvalidContent2 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "BESU_2X",
    contract: "solidity",
    ontology: mockOntology1,
    bytecode: "",
    signature: "000000000000",
    hash: ontologySigner.dataHash(mockOntology1),
  });

  const mockOntologyInvalidContent3 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "BESU_2X",
    contract: "solidity",
    ontology: {
      lock: [
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["owner", "bridge", "amount"],
          available: true,
        },
      ],
      unlock: [
        {
          functionSignature: "approve(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["owner", "unwantedAddress", "amount"],
          available: true,
        },
      ],
      mint: [
        {
          functionSignature: "mint(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      burn: [
        {
          functionSignature: "burn(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      assign: [
        {
          functionSignature: "assign(address,address,uint256)",
          variables: ["bridge", "receiver", "amount"],
          available: true,
        },
      ],
      checkPermission: [
        {
          functionSignature: "hasPermission(address)",
          variables: ["bridge"],
          available: true,
        },
      ],
      approve: [
        {
          functionSignature: "approve(address, uint256)",
          variables: ["contractAddress", "amount"],
          available: true,
        },
      ],
    },
    bytecode: "",
    signature: "",
    hash: "",
  });

  const mockOntologyInvalidContent4 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "BESU_2X",
    contract: "solidity",
    ontology: {
      lock: [
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["owner", "bridge", "amount"],
          available: true,
        },
      ],
      unlock: [
        {
          functionSignature: "approve(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["bridge", "owner", "amount"],
          available: true,
        },
      ],
      mint: [
        {
          functionSignature: "mint(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      burn: [
        {
          functionSignature: "burn(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      exchange: [
        {
          functionSignature: "assign(address,address,uint256)",
          variables: ["bridge", "receiver", "amount"],
          available: true,
        },
      ],
      checkPermission: [
        {
          functionSignature: "hasPermission(address)",
          variables: ["bridge"],
          available: true,
        },
      ],
      approve: [
        {
          functionSignature: "approve(address, uint256)",
          variables: ["contractAddress", "amount"],
          available: true,
        },
      ],
    },
    bytecode: "",
    signature: "",
    hash: "",
  });

  const mockOntologyInvalidContent5 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "BESU_2X",
    contract: "solidity",
    ontology: mockOntology1,
    bytecode: "",
    signature: ontologySigner
      .sign(ontologySigner.dataHash(mockOntology1))
      .toString(),
    hash: "0000",
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (fs.readdirSync as jest.Mock).mockReturnValue([
      mockOntologyFile1,
      mockOntologyFile2,
    ]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return mockOntologyContent1;
      } else if (filePath.includes(mockOntologyFile2)) {
        return mockOntologyContent2;
      }
      return "";
    });
    (path.extname as jest.Mock).mockReturnValue(".json");
    (path.join as jest.Mock).mockImplementation((...paths: string[]) =>
      paths.join("/"),
    );
  });
  afterAll(() => {
    monitorService.shutdown();
  });

  test("should load ontologies from the specified path", () => {
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    const ontologyManager = new OntologyManager(options, monitorService, [
      keyPair.publicKey,
    ]);

    expect(fs.readdirSync).toHaveBeenCalledWith(mockOntologiesPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(
      `${mockOntologiesPath}/${mockOntologyFile1}`,
      "utf-8",
    );
    expect(fs.readFileSync).toHaveBeenCalledWith(
      `${mockOntologiesPath}/${mockOntologyFile2}`,
      "utf-8",
    );
    expect(ontologyManager.getOntology(LedgerType.Besu2X, "token1")).toEqual(
      mockOntologyContent1,
    );
    expect(ontologyManager.getOntology(LedgerType.Fabric2, "token1")).toEqual(
      mockOntologyContent2,
    );
  });

  test("should throw OntologyNotFoundError if ontology is not found", () => {
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    const ontologyManager = new OntologyManager(options, monitorService, [
      keyPair.publicKey,
    ]);

    expect(() =>
      ontologyManager.getOntology(LedgerType.Besu2X, "nonexistentToken"),
    ).toThrow(OntologyNotFoundError);
  });

  test("should throw LedgerNotSupported if ledger type is not found", () => {
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    const ontologyManager = new OntologyManager(options, monitorService, [
      keyPair.publicKey,
    ]);

    expect(() =>
      ontologyManager.getOntologyInteractions(LedgerType.Sawtooth1X, "token1"),
    ).toThrow(OntologyNotFoundError);
  });

  test("should retrieve ontology interactions for Fabric2 ledger type", () => {
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    const ontologyManager = new OntologyManager(options, monitorService, [
      keyPair.publicKey,
    ]);

    const interactions = ontologyManager.getOntologyInteractions(
      LedgerType.Fabric2,
      "token1",
    );
    expect(interactions).toBeDefined();
  });

  test("should throw IncompleteOntologyError in the presence of an ontology with empty interactions", () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return mockOntologyInvalidContent1;
      } else {
        return "";
      }
    });
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    expect(
      () => new OntologyManager(options, monitorService, [keyPair.publicKey]),
    ).toThrow(IncompleteOntologyError);
  });

  test("should throw UnknownOntologyVariableError when an unsupported variable is present in the ontology", () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return mockOntologyInvalidContent3;
      } else {
        return "";
      }
    });
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    expect(
      () => new OntologyManager(options, monitorService, [keyPair.publicKey]),
    ).toThrow(UnknownOntologyVariableError);
  });

  test("should throw UnknownOntologyInteractionError when an unexpected interaction is present in the ontology", () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return mockOntologyInvalidContent4;
      } else {
        return "";
      }
    });
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    expect(
      () => new OntologyManager(options, monitorService, [keyPair.publicKey]),
    ).toThrow(UnknownOntologyInteractionError);
  });

  test("should throw InvalidSignatureError when an unverifiable signature is present in the ontology", () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return mockOntologyInvalidContent2;
      } else {
        return "";
      }
    });
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    expect(
      () => new OntologyManager(options, monitorService, [keyPair.publicKey]),
    ).toThrow(InvalidSignatureError);
  });

  test("should throw HashNotMatchingError when an incorrect hash is detected in the ontology", () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return mockOntologyInvalidContent5;
      } else {
        return "";
      }
    });
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    expect(
      () => new OntologyManager(options, monitorService, [keyPair.publicKey]),
    ).toThrow(HashNotMatchingError);
  });

  test("should successfully verify a valid signature", () => {
    const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const ontology = {
      lock: [
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["owner", "bridge", "amount"],
          available: true,
        },
      ],
      unlock: [
        {
          functionSignature: "approve(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["bridge", "owner", "amount"],
          available: true,
        },
      ],
      mint: [
        {
          functionSignature: "mint(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      burn: [
        {
          functionSignature: "burn(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      assign: [
        {
          functionSignature: "assign(address,address,uint256)",
          variables: ["bridge", "receiver", "amount"],
          available: true,
        },
      ],
      checkPermission: [
        {
          functionSignature: "hasPermission(address)",
          variables: ["bridge"],
          available: true,
        },
      ],
    };
    const objectSigner = new JsObjectSigner({
      privateKey: keyPair.privateKey,
    });
    const signature = objectSigner
      .sign(objectSigner.dataHash(ontology))
      .toString();
    expect(
      validateOntologySignature(
        ontology,
        keyPair.publicKey,
        signature,
        objectSigner,
      ),
    ).toEqual(true);
  });

  test("should successfully verify a valid hash", () => {
    const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const ontology = {
      lock: [
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["owner", "bridge", "amount"],
          available: true,
        },
      ],
      unlock: [
        {
          functionSignature: "approve(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
        {
          functionSignature: "transfer(address,address,uint256)",
          variables: ["bridge", "owner", "amount"],
          available: true,
        },
      ],
      mint: [
        {
          functionSignature: "mint(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      burn: [
        {
          functionSignature: "burn(address,uint256)",
          variables: ["bridge", "amount"],
          available: true,
        },
      ],
      assign: [
        {
          functionSignature: "assign(address,address,uint256)",
          variables: ["bridge", "receiver", "amount"],
          available: true,
        },
      ],
      checkPermission: [
        {
          functionSignature: "hasPermission(address)",
          variables: ["bridge"],
          available: true,
        },
      ],
    };
    const objectSigner = new JsObjectSigner({
      privateKey: keyPair.privateKey,
    });
    const hash = objectSigner.dataHash(ontology).toString();
    expect(validateOntologyHash(ontology, hash, objectSigner)).toEqual(true);
    (path.extname as jest.Mock).mockReturnValue(".json");
    (path.join as jest.Mock).mockImplementation((...paths: string[]) =>
      paths.join("/"),
    );
  });
});
