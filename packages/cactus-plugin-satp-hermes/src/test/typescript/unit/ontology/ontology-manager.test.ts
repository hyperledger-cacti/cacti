import {
  OntologyManager,
  IOntologyManagerOptions,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import {
  InteractionWithoutFunctionError,
  InvalidOntologyHash,
  InvalidOntologySignature,
  OntologyFunctionVariableNotSupported,
  OntologyNotFoundError,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-errors";
import * as fs from "fs";
import * as path from "path";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { OntologyCheckLevel } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/check-utils";

jest.mock("fs");
jest.mock("path");

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

describe("OntologyManager", () => {
  const mockOntologiesPath = "./ontologies";
  const mockOntologyFile1 = "ontology1.json";
  const mockOntologyFile2 = "ontology2.json";
  const mockOntologyContent1 = JSON.stringify({
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
    },
    bytecode: "",
    signature:
      "108,84,11,146,64,104,110,52,85,203,252,165,89,168,22,94,150,103,204,235,80,57,198,34,255,153,59,201,220,100,34,126,44,164,224,9,243,251,21,251,250,185,17,153,152,206,15,125,198,198,96,91,56,62,3,234,247,227,24,229,19,55,174,108",
    hash: "9078a25dd454124df091ad1b707c32de37e000fbf91553bfba7285c5ab747bed",
  });

  const mockOntologyContent2 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "FABRIC_2",
    contract: "base64",
    ontology: {
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
    },
    bytecode: "",
    signature:
      "127,112,73,26,87,234,105,35,39,200,210,14,154,182,85,61,21,24,205,39,69,95,107,220,179,58,116,195,117,250,178,136,117,243,124,182,26,222,6,5,127,202,10,127,209,178,129,20,89,161,233,70,99,53,142,208,86,200,42,238,224,88,98,122",
    hash: "e857dd2373f7c6aa9825f3a0563aa21aeb39d3edfe6a1719b3eddd9adec3b10a",
  });

  const incompleteInteractionOntology = {
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
    mint: [],
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

  const unknownFunctionVariableOntology = {
    lock: [
      {
        functionSignature: "transferFrom",
        variables: ["owner", "bridge", "quantity"],
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
  };

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
    const ontologyManager = new OntologyManager(options, monitorService);

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
    const ontologyManager = new OntologyManager(options, monitorService);

    expect(() =>
      ontologyManager.getOntology(LedgerType.Besu2X, "nonexistentToken"),
    ).toThrow(OntologyNotFoundError);
  });

  test("should throw LedgerNotSupported if ledger type is not found", () => {
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    const ontologyManager = new OntologyManager(options, monitorService);

    expect(() =>
      ontologyManager.getOntologyInteractions(LedgerType.Sawtooth1X, "token1"),
    ).toThrow(OntologyNotFoundError);
  });

  test("should retrieve ontology interactions for Fabric2 ledger type", () => {
    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };
    const ontologyManager = new OntologyManager(options, monitorService);

    const interactions = ontologyManager.getOntologyInteractions(
      LedgerType.Fabric2,
      "token1",
    );
    expect(interactions).toBeDefined();
  });

  test("should throw InvalidOntologyHash if ontology hash is invalid", () => {
    const modifiedOntology = JSON.parse(mockOntologyContent1);
    modifiedOntology.hash = "0000";
    const invalidHashOntologyContent = JSON.stringify(modifiedOntology);

    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return invalidHashOntologyContent;
      } else {
        return mockOntologyContent2;
      }
    });

    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };

    expect(
      () =>
        new OntologyManager(
          options,
          monitorService,
          undefined,
          undefined,
          OntologyCheckLevel.HASHED,
        ),
    ).toThrow(InvalidOntologyHash);
  });

  test("should throw InvalidOntologySignature if ontology signature is invalid", () => {
    const modifiedOntology = JSON.parse(mockOntologyContent1);
    modifiedOntology.signature = "0000";
    const invalidSignatureOntologyContent = JSON.stringify(modifiedOntology);

    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return invalidSignatureOntologyContent;
      } else {
        return mockOntologyContent2;
      }
    });

    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };

    expect(
      () =>
        new OntologyManager(
          options,
          monitorService,
          undefined,
          undefined,
          OntologyCheckLevel.HASHED_SIGNED,
        ),
    ).toThrow(InvalidOntologySignature);
  });

  test("should throw InteractionWithoutFunctionError for an incomplete interaction in the ontology", () => {
    const modifiedOntology = JSON.parse(mockOntologyContent1);
    modifiedOntology.ontology = incompleteInteractionOntology;
    const incompleteInteractionContent = JSON.stringify(modifiedOntology);

    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile1)) {
        return incompleteInteractionContent;
      } else {
        return mockOntologyContent2;
      }
    });

    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };

    expect(
      () =>
        new OntologyManager(
          options,
          monitorService,
          undefined,
          undefined,
          OntologyCheckLevel.DEFAULT,
        ),
    ).toThrow(InteractionWithoutFunctionError);
  });

  test("should throw OntologyFunctionVariableNotSupported for an unknown function variable in the ontology", () => {
    const modifiedOntology = JSON.parse(mockOntologyContent2);
    modifiedOntology.ontology = unknownFunctionVariableOntology;
    const unknownFunctionVariableContent = JSON.stringify(modifiedOntology);

    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(mockOntologyFile2)) {
        return unknownFunctionVariableContent;
      } else {
        return mockOntologyContent1;
      }
    });

    const options: IOntologyManagerOptions = {
      ontologiesPath: mockOntologiesPath,
    };

    expect(
      () =>
        new OntologyManager(
          options,
          monitorService,
          undefined,
          undefined,
          OntologyCheckLevel.DEFAULT,
        ),
    ).toThrow(OntologyFunctionVariableNotSupported);
  });
});
