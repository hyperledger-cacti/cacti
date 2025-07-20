import {
  OntologyManager,
  IOntologyManagerOptions,
} from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { OntologyNotFoundError } from "../../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-errors";
import * as fs from "fs";
import * as path from "path";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

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
    ownerSignature: "",
    bridgeSignature: "",
  });

  const mockOntologyContent2 = JSON.stringify({
    name: "SATP-ERC20",
    id: "token1",
    type: "FABRIC_2",
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
    ownerSignature: "",
    bridgeSignature: "",
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
});
