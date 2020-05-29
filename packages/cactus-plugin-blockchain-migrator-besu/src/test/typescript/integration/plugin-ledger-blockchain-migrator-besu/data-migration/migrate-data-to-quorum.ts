// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { BesuTestLedger, IAccount, IQuorumGenesisOptions} from "@hyperledger/cactus-test-tooling";
import { QuorumTestLedger} from "@hyperledger/cactus-test-tooling"
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import {
    PluginLedgerConnectorBesu,
    PluginFactoryLedgerConnector as BesuConnectorFactory,
} from "../../../../../../../cactus-plugin-ledger-connector-besu/src/main/typescript";

import {
    IQuorumDeployContractOptions,
    PluginLedgerConnectorQuorum,
    PluginFactoryLedgerConnector as QuorumConnectorFactory
} from "../../../../../../../cactus-plugin-ledger-connector-quorum/src/main/typescript";

import {
    PluginBesuBlockchainMigrator,
    PluginFactoryBlockchainBesuMigrator,
    migrationDepth,
    migrationType
} from "../../../../../main/typescript";

import HelloWorldContractJson from "../../../../../../../cactus-plugin-ledger-connector-besu/src/test/solidity/hello-world-contract/HelloWorld.json";

const log: Logger = LoggerProvider.getOrCreate({
    label: "test-migrate-data-to-quorum",
    level: "trace",
});

// Initialize the source ledger, Besu, and its connector
tap.test("initiates a Besu ledger", async (assert: any) => {


    log.info("Initializing a test Besu ledger")
    const besuTestLedger = new BesuTestLedger();
    await besuTestLedger.start();
    assert.ok(besuTestLedger);

    assert.tearDown(async () => {
        log.info("Tearing down the test Besu ledger")
        await besuTestLedger.stop();
        await besuTestLedger.destroy();
        log.info("Tearing down the test Quorum ledger")
        await quorumTestLedger.stop();
        await quorumTestLedger.destroy();
    });

    let rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const orionKeyPair = await besuTestLedger.getOrionKeyPair();
    const besuKeyPair = await besuTestLedger.getBesuKeyPair();

    log.debug("Creating the Besu connector")
    const BesuFactory = new BesuConnectorFactory();
    const BesuConnector: PluginLedgerConnectorBesu = await BesuFactory.create({
        rpcApiHttpHost,
    });

    const BesuOptions = {
        publicKey: orionKeyPair.publicKey,
        privateKey: besuKeyPair.privateKey,
        contractJsonArtifact: HelloWorldContractJson,
    };

    log.info("Initializing a test Quorum ledger")
    const quorumTestLedger = new QuorumTestLedger({
        containerImageVersion: "1.0.0",
    });
    await quorumTestLedger.start();
    assert.ok(quorumTestLedger);

    log.debug("Creating the Quorum connector")

    // const rpcApiHttpHost: string = 'http://localhost:22000';
    rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();
    const quorumGenesisOptions: IQuorumGenesisOptions = await quorumTestLedger.getGenesisJsObject();
    assert.ok(quorumGenesisOptions);
    assert.ok(quorumGenesisOptions.alloc);

    const highNetWorthAccounts: string[] = Object.keys(
        quorumGenesisOptions.alloc
    ).filter((address: string) => {
        const anAccount: IAccount = quorumGenesisOptions.alloc[address];
        const balance: number = parseInt(anAccount.balance, 10);
        return balance > 10e7;
    });
    const [firstHighNetWorthAccount] = highNetWorthAccounts;

    const QuorumFactory = new QuorumConnectorFactory();
    const QuorumConnector: PluginLedgerConnectorQuorum = await QuorumFactory.create({
        rpcApiHttpHost,
    });

    const QuorumOptions: IQuorumDeployContractOptions = {
        ethAccountUnlockPassword: "",
        fromAddress: firstHighNetWorthAccount,
        contractJsonArtifact: HelloWorldContractJson,
    };

    log.debug("Initializing Blockchain Migrator plugin");

    const BesuMigratorFactory = new PluginFactoryBlockchainBesuMigrator ();
    //  IPluginBesuBlockchainMigratorOptions
    const BesuMigratorOptions = {
        sourceLedger: BesuConnector,
        targetLedger: QuorumConnector,
        crossLedgerCommunicationProtocol: "Cactus",
        migrationDepth: migrationDepth.Data,
        migrationType: migrationType.All,
        migrationOptions: {}

    };
    const BesuMigrator: PluginBesuBlockchainMigrator = await BesuMigratorFactory.create(BesuMigratorOptions);
    assert.ok(BesuMigrator);

    assert.end();
});