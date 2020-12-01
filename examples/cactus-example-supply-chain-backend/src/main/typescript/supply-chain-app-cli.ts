#!/usr/bin/env node

import { ISupplyChainAppOptions, SupplyChainApp } from "./supply-chain-app";

export async function launchApp(cliOpts?: any): Promise<void> {
  const appOptions: ISupplyChainAppOptions = { logLevel: "TRACE", ...cliOpts };
  const supplyChainApp = new SupplyChainApp(appOptions);
  try {
    await supplyChainApp.start();
  } catch (ex) {
    // tslint:disable-next-line: no-console
    console.error(`SupplyChainApp crashed. Existing...`, ex);
    await supplyChainApp.stop();
    process.exit(-1);
  }
}

if (require.main === module) {
  launchApp();
}
