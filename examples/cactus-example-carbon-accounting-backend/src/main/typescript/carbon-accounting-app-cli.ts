#!/usr/bin/env node

import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LoggerProvider } from "@hyperledger/cactus-common";
import {
  ICarbonAccountingAppOptions,
  CarbonAccountingApp,
} from "./carbon-accounting-app";

import axios from "axios";
import { RuntimeError } from "run-time-error";

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
  } catch (ex: unknown) {
    if (axios.isAxiosError(ex)) {
      console.error(`CarbonAccountingApp crashed. Existing...`, ex);
      await carbonAccountingApp?.stop();
      process.exit(-1);
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
