import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
    IPluginBesuBlockchainMigratorOptions,
    PluginBesuBlockchainMigrator,
} from "./plugin-ledger-blockchain-migrator-besu";

export class PluginFactoryBlockchainBesuMigrator extends PluginFactory<
    PluginBesuBlockchainMigrator,
    IPluginBesuBlockchainMigratorOptions
    > {
    async create(
        options: IPluginBesuBlockchainMigratorOptions
    ): Promise<PluginBesuBlockchainMigrator> {
        return new PluginBesuBlockchainMigrator(options);
    }
}
