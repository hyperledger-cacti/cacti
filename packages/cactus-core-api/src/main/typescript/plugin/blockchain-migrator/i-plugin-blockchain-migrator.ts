import { ICactusPlugin } from "../i-cactus-plugin";

/**
 * Common interface to be implemented by blockchaim migration plugins which are using
 * a connection to several ledgers, and then performing a migration.
 */
export interface IPluginBlockchainMigrator<T, K> extends ICactusPlugin {

    deployContract(options?: T): Promise<K>;

    addPublicKey(publicKeyHex: string): Promise<void>;

    /**
     * Collects endorsements from the consortium to perform a blockchain migration
     */
    approveMigration(options?: T): Promise<K>;
}
