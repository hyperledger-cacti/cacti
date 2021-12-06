#!/usr/bin/env node

import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { ISupplyChainAppOptions, SupplyChainApp } from "./supply-chain-app";

export async function launchApp(
  env?: NodeJS.ProcessEnv,
  args?: string[],
): Promise<void> {
  const configService = new ConfigService();
  const config = await configService.getOrCreate({ args, env });
  const serverOptions = config.getProperties();
  LoggerProvider.setLogLevel(serverOptions.logLevel);

  const appOptions: ISupplyChainAppOptions = {
    logLevel: serverOptions.logLevel,
  };
  const supplyChainApp = new SupplyChainApp(appOptions);
  try {
    await supplyChainApp.start();
  } catch (ex) {
    console.error(`SupplyChainApp crashed. Existing...`, ex);
    await supplyChainApp?.stop();
    process.exit(-1);
  }
}

if (require.main === module) {
  launchApp(process.env, process.argv);
}
