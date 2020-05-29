import {IPluginBlockchainMigrator, PluginAspect} from "@hyperledger/cactus-core-api";
// import { PluginLedgerConnectorBesu } from "../../../../cactus-plugin-ledger-connector-besu/src/main/typescript";
import { PluginLedgerConnectorBesu } from "../../../../cactus-plugin-ledger-connector-besu/src/main/typescript";
import { PluginLedgerConnectorQuorum } from "../../../../cactus-plugin-ledger-connector-quorum/src/main/typescript";

export enum migrationDepth  {
    Data,
    SmartContracts,
    Both
}

// Decides which subset of the state of the blockchain will be migrated, based on different criteria
export enum migrationType  {
    // Migrates all the blockchain's state
    All,
    // Migrates state created/updated after a certain timestamp
    Time,
    // Migrates a specific subset of the blockchain (e.g., transactions or states)
    Transactions,
    // Migrates the state of the blockchain associated with a certain participant
    Participant
}

// Source ledger is Besu
// Source ledger options are additional options belonging to the context of the migration, concerning a specific ledger
export interface IPluginBesuBlockchainMigratorOptions {
    sourceLedger: PluginLedgerConnectorBesu,
    sourceLedgerOptions?: IPluginLedgerBlockchainSourceBlockchainOptions,
    targetLedger: PluginLedgerConnectorQuorum,
    targetLedgerOptions?: IPluginLedgerBlockchainTargetBlockchainOptions,
    crossLedgerCommunicationProtocol: string,
    migrationDepth: migrationDepth,
    migrationType: migrationType,
    migrationOptions: IPluginLedgerBlockchainMigrationOptions
}
export interface IPluginLedgerBlockchainSourceBlockchainOptions {
    options?: any[];
}

export interface IPluginLedgerBlockchainTargetBlockchainOptions {
    options?: any[];
}

export interface IPluginLedgerBlockchainMigrationOptions {
    options?: any[];
}

export interface ITransactionOptions {
    privateKey?: string;
}

export class PluginBesuBlockchainMigrator
    implements IPluginBlockchainMigrator <any, any> {
    private readonly sourceLedger: PluginLedgerConnectorBesu;
    // Add other possibilities as to target Ledgers
    private readonly targetLedger: PluginLedgerConnectorQuorum;
    private readonly targetLedgerType: string;
    private readonly migrationType : migrationType;
    private readonly migrationDepth: migrationDepth;
    private readonly migrationOptions: IPluginLedgerBlockchainMigrationOptions;

    constructor (public readonly options: IPluginBesuBlockchainMigratorOptions) {
        if (!options) {
            throw new Error(`PluginBesuBlockchainMigratorOptions options falsy.`);
        }

        this.sourceLedger = this.options.sourceLedger;
        this.targetLedger = this.options.targetLedger;
        this.migrationType = this.options.migrationType;
        this.migrationDepth = this.options.migrationDepth;
        this.migrationOptions = this.options.migrationOptions;
        this.targetLedgerType = this.options.targetLedger.getId();

    }

    public getId(): string {
        return `@hyperledger/cactus-plugin-blockchain-migrator-besu`;
    }

    public async deployContract(options: any): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async addPublicKey(publicKeyHex: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async approveMigration(options: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async deployToTargetLedger(migrationDepth: migrationDepth,
                                      migrationType: migrationType,
                                      migrationOptions: IPluginLedgerBlockchainMigrationOptions): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // Migration plugin aspect?
    public getAspect(): PluginAspect {
        return PluginAspect.LEDGER_CONNECTOR;
    }
}