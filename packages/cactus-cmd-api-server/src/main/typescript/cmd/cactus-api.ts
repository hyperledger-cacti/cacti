#!/usr/bin/env node

import { ApiServer } from "../api-server";
import { ConfigService } from "../config/config-service";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

const log: Logger = LoggerProvider.getOrCreate({
  label: "cactus-api",
  level: "INFO",
});

const main = async () => {
  const configService = new ConfigService();
  const config = configService.getOrCreate();
  const serverOptions = config.getProperties();

  LoggerProvider.setLogLevel(serverOptions.logLevel);

  if (process.argv[2].includes("help")) {
    const helpText = ConfigService.getHelpText();
    // tslint:disable-next-line: no-console
    console.log(helpText);
    log.info(`Effective Configuration:`);
    log.info(JSON.stringify(serverOptions, null, 4));
  } else {
    const apiServer = new ApiServer({ config: serverOptions });
    await apiServer.start();
  }
};

main()
  .then(() => {
    log.info(`Cactus API server launched OK `);
  })
  .catch((ex) => {
    log.error(`Cactus API server crashed: `, ex);
    process.exit(1);
  });
