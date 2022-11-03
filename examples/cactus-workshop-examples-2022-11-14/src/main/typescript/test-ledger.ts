import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  SubstrateTestLedger,
  ISubstrateTestLedgerOptions,
} from "@hyperledger/cactus-test-tooling";

const logLevelLedger: LogLevelDesc = "DEBUG";
const loggerLevel: LogLevelDesc = "INFO";

async function testLedger() {
  const logger: Logger = LoggerProvider.getOrCreate({
    label: "test-ledger-example",
    level: loggerLevel,
  });

  logger.info("Initialized logger");

  logger.info("Creating ledger");
  const ledgerOps: ISubstrateTestLedgerOptions = {
    publishAllPorts: false,
    logLevel: logLevelLedger,
    emitContainerLogs: true,
    imageTag: "2022-03-29--1496",
    envVars: new Map([
      ["WORKING_DIR", "/var/www/node-template"],
      ["CONTAINER_NAME", "cacti-ledger"],
      ["WS_PORT", "9944"],
      ["PORT", "9944"],
      ["DOCKER_PORT", "9944"],
      ["CARGO_HOME", "/var/www/node-template/.cargo"],
    ]),
  };

  const ledger = new SubstrateTestLedger(ledgerOps);
  await ledger.start();

  logger.info("Ledger up and running");

  logger.info("Destroying ledger");
  await ledger.stop();

  logger.info("Done");
}

testLedger();
