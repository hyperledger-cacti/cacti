#!/usr/bin/env node

import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  ICarbonAccountingAppOptions,
  CarbonAccountingApp,
} from "./carbon-accounting-app";

export async function launchApp(): Promise<void> {
  const configService = new ConfigService();
  const config = await configService.getOrCreate();
  const serverOptions = config.getProperties();
  LoggerProvider.setLogLevel(serverOptions.logLevel);

  const appOptions: ICarbonAccountingAppOptions = {
    logLevel: serverOptions.logLevel,
  };
  const carbonAccountingApp = new CarbonAccountingApp(appOptions);
  try {
    await carbonAccountingApp.start();
  } catch (ex) {
    console.error(`CarbonAccountingApp crashed. Existing...`, ex);
    await carbonAccountingApp?.stop();
    process.exit(-1);
  }
}

if (require.main === module) {
  launchApp();
}
