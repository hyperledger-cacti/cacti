#!/usr/bin/env node

import { ApiServer } from "../api-server";
import { ConfigService } from "../config/config-service";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import axios from "axios";
import { RuntimeError } from "run-time-error";

const log: Logger = LoggerProvider.getOrCreate({
  label: "cactus-api",
  level: "INFO",
});

const main = async () => {
  const configService = new ConfigService();
  const config = await configService.getOrCreate();
  const serverOptions = config.getProperties();

  LoggerProvider.setLogLevel(serverOptions.logLevel);

  if (process.argv[2]?.includes("help")) {
    const helpText = ConfigService.getHelpText();
    console.log(helpText);
    log.info(`Effective Configuration:`);
    log.info(JSON.stringify(serverOptions, null, 4));
  } else {
    const apiServer = new ApiServer({ config: serverOptions });
    await apiServer.start();
  }
};

export async function launchApp(): Promise<void> {
  try {
    await main();
    log.info(`Cactus API server launched OK `);
  } catch (ex: unknown) {
    if (axios.isAxiosError(ex)) {
      log.error(`Cactus API server crashed: `, ex);
      process.exit(1);
    } else if (ex instanceof Error) {
      throw new RuntimeError("unexpected exception", ex);
    } else {
      throw new RuntimeError(
        "unexpected exception with incorrect type",
        JSON.stringify(ex),
      );
    }
  }
}

if (require.main === module) {
  launchApp();
}
