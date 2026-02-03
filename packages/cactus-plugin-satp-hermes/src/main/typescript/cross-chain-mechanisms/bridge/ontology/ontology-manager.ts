/**
 * @fileoverview SATP Asset Ontology Manager
 *
 * This module provides the asset ontology management system for SATP cross-chain
 * operations. The OntologyManager maintains asset definitions, interaction signatures,
 * and validation rules across different blockchain networks to enable seamless
 * cross-chain asset representation and transfer operations.
 *
 * The ontology manager handles:
 * - Asset type definitions and mappings
 * - Cross-chain interaction signature management
 * - Ledger-specific asset validation rules
 * - Asset metadata and property standardization
 * - Cross-network asset compatibility verification
 * - Dynamic ontology loading and caching
 *
 * @example
 * ```typescript
 * import { OntologyManager } from './ontology-manager';
 *
 * const ontologyManager = new OntologyManager({
 *   logLevel: 'info',
 *   ontologiesPath: './ontologies',
 *   monitorService: monitoringService
 * });
 *
 * const evmInteractions = ontologyManager.getInteractionSignature(LedgerType.Ethereum);
 * const assetOntology = ontologyManager.getOntologyForAsset('ERC20', LedgerType.Ethereum);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
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
  JsObjectSigner,
  Secp256k1Keys,
  LogLevelDesc,
  ISignerKeyPair,
} from "@hyperledger-cacti/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../../core/satp-logger";
import { MonitorService } from "../../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import {
  isValidOntologyJsonFormat,
  checkOntologyContent,
  OntologyCheckLevel,
  validateOntologyBytecode,
} from "./check-utils";
import { BridgeLeaf } from "../bridge-leaf";

/**
 * Configuration options for the SATP Ontology Manager.
 *
 * Defines the settings required to initialize the ontology management
 * system including logging configuration, ontology file paths, and
 * monitoring service integration.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const options: IOntologyManagerOptions = {
 *   logLevel: 'debug',
 *   ontologiesPath: './custom-ontologies',
 *   monitorService: monitoringService
 * };
 * ```
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
  private readonly monitorService: MonitorService;
  private readonly managerJsObjectSigner: JsObjectSigner;
  private readonly managerKeyPair?: ISignerKeyPair;
  private readonly publicKeys: Uint8Array[];

  private ontologies: Map<LedgerType, Map<string, string>> = new Map<
    LedgerType,
    Map<string, string>
  >();

  /**
   * Creates an instance of OntologyManager.
   * @constructor
   * @param {IOntologyManagerOptions} options - The options for configuring the OntologyManager.
   */
  constructor(
    options: IOntologyManagerOptions,
    monitorService: MonitorService,
    publicKeys?: Uint8Array[],
    managerKeyPair?: ISignerKeyPair,
    ontologyCheckLevel: OntologyCheckLevel = OntologyCheckLevel.DEFAULT,
  ) {
    const fnTag = `${OntologyManager.CLASS_NAME}#constructor()`;
    const label = OntologyManager.CLASS_NAME;
    this.logLevel = options.logLevel || "INFO";
    this.monitorService = monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      monitorService,
    );
    if (managerKeyPair === undefined) {
      this.managerKeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    } else {
      this.managerKeyPair = managerKeyPair;
    }
    this.managerJsObjectSigner = new JsObjectSigner({
      privateKey: this.managerKeyPair.privateKey,
    });
    this.publicKeys = publicKeys || [];

    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    context.with(ctx, () => {
      try {
        const ontologiesPath = options.ontologiesPath;
        if (ontologiesPath) {
          const files = fs.readdirSync(ontologiesPath);
          files.forEach((file) => {
            if (path.extname(file) === ".json") {
              try {
                const filePath = path.join(ontologiesPath, file);
                const content = fs.readFileSync(filePath, "utf-8");
                const ontology = JSON.parse(content);
                this.checkOntology(ontology, ontologyCheckLevel);
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
                throw error;
              }
            }
          });
          monitorService.createGauge(
            "number_of_supported_assets",
            () => this.ontologies.size,
            "Number of supported assets currently loaded in the ontology manager",
          );

          this.log.info(`Ontologies loaded: ${this.ontologies.size}`);
        } else {
          this.log.warn(
            "Ontologies path not provided. Ontologies must be added manually.",
          );
        }
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(error),
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
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
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Adds a new ontology.
   * @throws {Error} Method not implemented.
   */
  public addOntology(): void {
    const fnTag = `${OntologyManager.CLASS_NAME}#addOntology()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        throw new Error("Method not implemented.");
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Removes an existing ontology.
   * @throws {Error} Method not implemented.
   */
  public removeOntology(): void {
    const fnTag = `${OntologyManager.CLASS_NAME}#removeOntology()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        throw new Error("Method not implemented.");
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Checks the validity of an ontology.
   * @private
   * @param {string} ontology - The ontology to check.
   */
  private checkOntology(
    ontologyAsJson: any,
    ontologyCheckLevel: OntologyCheckLevel,
  ): void {
    const fnTag = `${OntologyManager.CLASS_NAME}#checkOntology()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const formatedOntology = isValidOntologyJsonFormat(ontologyAsJson);
        checkOntologyContent(
          formatedOntology,
          this.publicKeys,
          this.managerJsObjectSigner,
          ontologyCheckLevel,
        );
        // Call multiple functions to perform different checks
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
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
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Directly checks the bytecode of an ontology is the same that is deployed in a chain.
   * @param {LedgerType} ledgerType - The type of the ledger.
   * @param {string} tokenId - The ID of the token.
   * @param {BridgeLeaf} chainLeaf - The respective chain leaf.
   * @returns {Promise<boolean>} Whether the bytecode is equal to the one on chain.
   */
  public async checkOntologyBytecode(
    ledgerType: LedgerType,
    tokenId: string,
    contractAddress: string,
    chainLeaf: BridgeLeaf,
  ): Promise<boolean> {
    const ontology = this.getOntology(ledgerType, tokenId);
    return await validateOntologyBytecode(
      JSON.parse(ontology),
      ledgerType,
      chainLeaf,
      contractAddress,
    );
  }
}
