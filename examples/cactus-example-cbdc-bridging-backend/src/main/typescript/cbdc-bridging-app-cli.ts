#!/usr/bin/env node
import { ICbdcBridgingApp, CbdcBridgingApp } from "./cbdc-bridging-app";
import "dotenv/config";

export async function launchApp(): Promise<void> {
  if (
    process.env.API_HOST == undefined ||
    process.env.API_SERVER_1_PORT == undefined ||
    process.env.API_SERVER_2_PORT == undefined
  ) {
    throw new Error("Env variables not set");
  }

  const appOptions: ICbdcBridgingApp = {
    apiHost: process.env.API_HOST,
    logLevel: "INFO",
  };

  const cbdcBridgingApp = new CbdcBridgingApp(appOptions);
  try {
    await cbdcBridgingApp.start();
    console.info("CbdcBridgingApp running...");
  } catch (ex) {
    console.error(`CbdcBridgingApp crashed. Existing...`, ex);
    await cbdcBridgingApp.stop();
    process.exit(-1);
  }
}

if (require.main === module) {
  launchApp();
}
