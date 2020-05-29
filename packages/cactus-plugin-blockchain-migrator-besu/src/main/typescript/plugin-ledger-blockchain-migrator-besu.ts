import { IPluginBlockchainMigrator } from "@hyperledger/cactus-core-api";
import { PluginLedgerConnector } from "@hyperledger/cactus-core-api";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-core-api";
import EEAClient from "web3-eea";

enum migrationDepth  {
    Data,
    SmartContracts,
    Both
}

//Decides which subset of the state of the blockchain will be migrated, based on different criteria
enum migrationType  {
    //Migrates all the blockchain's state
    All,
    //Migrates state created/updated after a certain timestamp
    Time,
    //Migrates a specific subset of the blockchain (e.g., transactions or states)
    Transactions,
    //Migrates the state of the blockchain associated with a certain participant
    Participant
}

//Source ledger is Besu
//Source ledger options are additional options belonging to the context of the migration, concerning a specific ledger
export interface IPluginBesuBlockchainMigratorOptions {
    sourceLedger: PluginLedgerConnector,
    sourceLedgerOptions: IPluginLedgerBlockchainSourceBlockchainOptions,
    targetLedger: PluginLedgerConnector,
    targetLedgerOptions: IPluginLedgerBlockchainTargetBlockchainOptions,
    crossLedgerCommunicationProtocol: "Cactus",
    migrationDepth: migrationDepth,
    migrationType: migrationType,
    migrationOptions: IPluginLedgerBlockchainMigrationOptions
}
export interface IPluginLedgerBlockchainSourceBlockchainOptions {
    options: any[];
}

export interface IPluginLedgerBlockchainTargetBlockchainOptions {
    options: any[];
}

export interface IPluginLedgerBlockchainMigrationOptions {
    options: any[];
}

export interface ITransactionOptions {
    privateKey?: string;
}

export class PluginBesuBlockchainMigrator
    implements IPluginBlockchainMigrator <any, any> {
    private readonly sourceLedger: PluginLedgerConnector;
    private readonly targetLedger: PluginLedgerConnector;
    private readonly migrationType : migrationType;
    private readonly migrationDepth: migrationDepth;
    private readonly migrationOptions: IPluginLedgerBlockchainMigrationOptions;

    constructor (public readonly options: IPluginBesuBlockchainMigratorOptions) {
        if (!options) {
            throw new Error(`PluginBesuBlockchainMigratorOptions options falsy.`);
        }

        if (!(options.sourceLedger instanceof PluginLedgerConnectorBesu))   {
            throw new Error(`PluginBesuBlockchainMigratorOptions source ledger has to be Besu.`);
        }

        this.sourceLedger = this.options.sourceLedger;
        this.targetLedger = this.options.targetLedger;
        this.migrationType = this.options.migrationType;
        this.migrationDepth = this.options.migrationDepth;
        this.migrationOptions = this.options.migrationOptions;
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
}