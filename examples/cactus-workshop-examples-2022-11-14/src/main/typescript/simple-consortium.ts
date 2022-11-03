import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  ConsortiumRepository,
  IConsortiumRepositoryOptions,
} from "@hyperledger/cactus-core";
import { ConsortiumDatabase } from "@hyperledger/cactus-core-api";

const logLevelConsortium: LogLevelDesc = "INFO";
const loggerLevel: LogLevelDesc = "INFO";

async function runHelloWorld() {
  const logger: Logger = LoggerProvider.getOrCreate({
    label: "consortium-example",
    level: loggerLevel,
  });

  logger.info("Initialized logger");
  const consortiumDB: ConsortiumDatabase = {
    consortium: [],
    ledger: [],
    consortiumMember: [],
    cactusNode: [],
    pluginInstance: [],
  };

  const consortiumOptions: IConsortiumRepositoryOptions = {
    logLevel: logLevelConsortium,
    db: consortiumDB,
  };
  const consortiumRepo = new ConsortiumRepository(consortiumOptions);

  logger.info(`Initialized consortium: ${consortiumRepo}`);

  logger.info("Done");
}

runHelloWorld();
