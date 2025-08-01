/**
 * @file ontology-manager.ts
 * @description This file contains the implementation of the OntologyManager class, which is responsible for managing ontologies for different ledger types.
 * It provides methods to load, retrieve, and interact with ontologies.
 */

import { LedgerType } from "@hyperledger/cactus-core-api";
import { InteractionsRequest as EvmInteractionSignature } from "../../../generated/SATPWrapperContract";
import {
  fabricInteractionList,
  FabricInteractionSignature,
} from "./assets/fabric-asset";
import { evmInteractionList } from "./assets/evm-asset";
import { LedgerNotSupported, OntologyNotFoundError } from "./ontology-errors";
import * as fs from "fs";
import * as path from "path";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

/**
 * Options for configuring the OntologyManager.
 * @interface IOntologyManagerOptions
 * @property {LogLevelDesc} [logLevel] - The log level for the logger.
 * @property {string} [ontologiesPath] - The path to the directory containing ontology files.
 */
export interface IOntologyManagerOptions {
  logLevel?: LogLevelDesc;
  ontologiesPath?: string;
}

/**
 * Manages ontologies for different ledger types.
 * @class OntologyManager
 */
export class OntologyManager {
  public static readonly CLASS_NAME = "OntologyManager";
  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;

  private ontologies: Map<LedgerType, Map<string, string>> = new Map<
    LedgerType,
    Map<string, string>
  >();

  /**
   * Creates an instance of OntologyManager.
   * @constructor
   * @param {IOntologyManagerOptions} options - The options for configuring the OntologyManager.
   */
  constructor(options: IOntologyManagerOptions) {
    const label = OntologyManager.CLASS_NAME;
    this.logLevel = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level: this.logLevel });
    const ontologiesPath = options.ontologiesPath;

    if (ontologiesPath) {
      const files = fs.readdirSync(ontologiesPath);
      files.forEach((file) => {
        if (path.extname(file) === ".json") {
          try {
            const filePath = path.join(ontologiesPath, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const ontology = JSON.parse(content);
            this.checkOntology(ontology);
            const tokenId = ontology.id as string;
            const ledgerType = ontology.type as LedgerType;
            if (!this.ontologies.has(ledgerType))
              this.ontologies.set(ledgerType, new Map<string, string>());
            if (this.ontologies.get(ledgerType)?.has(tokenId)) {
              this.log.warn(
                `Ontology with id: ${tokenId} already exists for ledger: ${ledgerType}`,
              );
            }
            this.ontologies.get(ledgerType)?.set(tokenId, content);
          } catch (error) {
            this.log.error(`Error reading ontology file ${file}: ${error}`);
          }
        }
      });
      this.log.info(`Ontologies loaded: ${this.ontologies.size}`);
    } else {
      this.log.warn(
        "Ontologies path not provided. Ontologies must be added manually.",
      );
    }
  }

  /**
   * Retrieves an ontology by token ID and ledger type.
   * @param {string} tokenId - The ID of the token.
   * @param {LedgerType} ledgerType - The type of the ledger.
   * @returns {string} The ontology as a JSON string.
   * @throws {OntologyNotFoundError} If the ontology is not found.
   */
  public getOntology(ledgerType: LedgerType, tokenId: string): string {
    //TODO: Add support for ontologies of standard tokens e.g. ERC20, ERC721... They should use the same ontology and have an different id.
    const fnTag = `${OntologyManager.CLASS_NAME}#getOntology()`;
    this.log.info("Retrieving ontology...");
    const ledgerOntologies = this.ontologies.get(ledgerType);
    if (!ledgerOntologies) {
      throw new OntologyNotFoundError(
        `${fnTag}, No ontologies found for ledger type: ${ledgerType}`,
      );
    }
    const ontology = ledgerOntologies.get(tokenId);
    if (!ontology) {
      throw new OntologyNotFoundError(
        `${fnTag}, Ontology of ledger: ${ledgerType} with id: ${tokenId} not found`,
      );
    }
    this.log.debug(
      `${fnTag}, Retrieved ontology for ledger: ${ledgerType}, id: ${tokenId}`,
    );
    return ontology;
  }

  /**
   * Adds a new ontology.
   * @throws {Error} Method not implemented.
   */
  public addOntology(): void {
    throw new Error("Method not implemented.");
  }

  /**
   * Removes an existing ontology.
   * @throws {Error} Method not implemented.
   */
  public removeOntology(): void {
    throw new Error("Method not implemented.");
  }

  /**
   * Checks the validity of an ontology.
   * @private
   * @param {string} ontology - The ontology to check.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkOntology(ontology: string): void {
    //TODO: implement
  }

  /**
   * Retrieves the interactions for a given ontology and ledger type.
   * @param {string} id - The ID of the ontology.
   * @param {LedgerType} ledgerType - The type of the ledger.
   * @returns {FabricInteractionSignature[] | EvmInteractionSignature[]} The list of interactions.
   * @throws {LedgerNotSupported} If the ledger type is not supported.
   */
  public getOntologyInteractions(
    ledgerType: LedgerType,
    id: string,
  ): FabricInteractionSignature[] | EvmInteractionSignature[] {
    const fnTag = `${OntologyManager.CLASS_NAME}#getOntologyInteractions()`;
    this.log.info(`${fnTag}, Getting ontology interactions...`);
    const ontology = this.getOntology(ledgerType, id);

    //TODO This might need a refactor to support non-fungible tokens
    switch (ledgerType) {
      case LedgerType.Fabric2:
        return fabricInteractionList(ontology);
      case LedgerType.Besu1X:
      case LedgerType.Besu2X:
      case LedgerType.Ethereum:
        return evmInteractionList(ontology);
      default:
        throw new LedgerNotSupported(
          `${fnTag}, Ledger ${ledgerType} not supported`,
        );
    }
  }
}
