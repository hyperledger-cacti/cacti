import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  CactusNode,
  ConsortiumDatabase,
  ICactusPluginOptions,
  Ledger,
  PluginInstance,
} from "@hyperledger/cactus-core-api";
import { PolicyGroup } from "../policy-model/policy-group";
import MerkleTree from "merkletreejs";
import { JWK } from "jose";
import { verifyOrganization } from "../utils";

export interface IStaticConsortiumRepositoryOptions {
  logLevel?: LogLevelDesc;
  db: ConsortiumDatabase;
  entitiesJWK: { [key: string]: JWK };
  rootPolicyGroup?: PolicyGroup;
  packageConfigs?: { [key: string]: unknown };

  //data about self
  node: CactusNode;
  ledgers: Ledger[];
  pluginInstances: PluginInstance[];
  memberId: string;
}

/**
 * Class responsible for making it convenient for developers to query the
 * `ConsortiumDatabase` model type which is a flat data structure storing
 * all the different types of entities for Consortium representation such as
 * `CactusNode`, `ConsortiumMember`, `Ledger` etc..
 */
export class StaticConsortiumRepository {
  public static readonly CLASS_NAME = "StaticConsortiumRepository";

  private readonly log: Logger;
  private readonly db: ConsortiumDatabase;

  //data about self
  private readonly node: CactusNode;
  private readonly ledgers: Ledger[];
  private readonly pluginInstances: PluginInstance[];
  private readonly memberId: string;

  private readonly rootPolicyGroup: PolicyGroup | undefined;

  // map of package names to configs
  // The idea is that we can assert configurations (security, etc) of some essential packages
  // Possibly in the future we may want to share them (?)
  private readonly packageConfigs: Map<string, unknown>;

  private readonly entitiesJWK: Map<string, JWK>;

  public get className(): string {
    return StaticConsortiumRepository.CLASS_NAME;
  }

  constructor(public readonly options: IStaticConsortiumRepositoryOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.db, `${fnTag} arg options.db`);
    Checks.truthy(options.db.cactusNode, `${fnTag} arg options.db.cactusNode`);
    this.db = options.db;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.node = options.node;
    this.ledgers = options.ledgers;
    this.pluginInstances = options.pluginInstances;
    this.memberId = options.memberId;

    this.rootPolicyGroup = options.rootPolicyGroup;

    this.packageConfigs = new Map<string, ICactusPluginOptions>();
    if (options.packageConfigs) {
      for (const config in options.packageConfigs) {
        if (!this.packageConfigs.get(config)) {
          //unique configs for each package name
          this.packageConfigs.set(config, options.packageConfigs[config]);
        }
      }
    }

    //this map stores the JWK of each entity that belongs to the consortium
    //the map cannot be updated (we do not add organizations)
    this.entitiesJWK = new Map<string, JWK>();
    for (const entity in options.entitiesJWK) {
      if (!this.entitiesJWK.get(entity)) {
        //unique jwk for each entity
        this.entitiesJWK.set(entity, options.entitiesJWK[entity]);
      }
    }
  }

  public get consortiumDatabase(): ConsortiumDatabase {
    return this.options.db;
  }

  public get allNodes(): CactusNode[] {
    return this.options.db.cactusNode;
  }

  public getPolicyTreeProof(): string {
    if (!this.rootPolicyGroup) {
      return "";
    }
    return this.rootPolicyGroup.buildTreeProof();
  }
  public getConfigsProof(): string {
    if (this.packageConfigs.size === 0) {
      return "";
    }
    return new MerkleTree(
      Array.from(this.packageConfigs.entries()),
      undefined,
      {
        sort: true,
        hashLeaves: true,
      },
    )
      .getRoot()
      .toString("hex");
  }

  /**
   * Queries the complete list of nodes within the consortium to obtain a sub-
   * set of `CactusNode`s which are connected to a `Ledger` with the given
   * `ledgerId`.
   * @param ledgerId The ID of the ledger to filter nodes based on.
   * @throws {Error} If `ledgerId` is falsy or blank.
   */
  public nodesWithLedger(ledgerId: string): CactusNode[] {
    const fnTag = `${this.className}#nodesWithLedger()`;
    Checks.nonBlankString(ledgerId, `${fnTag}:ledgerId`);

    return this.allNodes.filter((cn) => cn.ledgerIds.includes(ledgerId));
  }
  public addNode(
    node: CactusNode,
    pluginInstance: PluginInstance[],
    ledger: Ledger[],
  ) {
    const member = this.db.consortiumMember.find((m) => m.id === node.memberId);
    if (!member) {
      throw new Error(
        "New node does not belong to an organization of this consortium",
      );
    }
    this.db.cactusNode.push(node);
    this.db.pluginInstance.push(...pluginInstance);
    this.db.ledger.push(...ledger);
    member.nodeIds.push(node.id);
  }

  public populateDb(newDb: ConsortiumDatabase) {
    this.db.cactusNode = newDb.cactusNode;
    this.db.consortium = newDb.consortium;
    this.db.consortiumMember = newDb.consortiumMember;
    this.db.ledger = newDb.ledger;
    this.db.pluginInstance = newDb.pluginInstance;
  }

  public getSelfData() {
    return {
      node: this.node,
      ledgers: this.ledgers,
      pluginInstances: this.pluginInstances,
      memberId: this.memberId,
    };
  }

  public async verifyJWT(jwt: string, memberId: string): Promise<boolean> {
    const fn = this.className + "#verifyJWT";
    const jwk = this.entitiesJWK.get(memberId);
    const member = this.db.consortiumMember.find((member) => {
      return member.id === memberId;
    });
    if (!jwk || !member) {
      this.log.debug(
        fn + ": memberID:" + memberId + "is not part of this consortium.",
      );
      return false;
    }
    const result = await verifyOrganization(jwt, jwk, member.name);
    if (typeof result === "string") {
      throw new Error(fn + result);
    }
    return result;
  }
}
