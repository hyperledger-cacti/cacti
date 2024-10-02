#!/usr/bin/env node

import {
  AuthorizationProtocol,
  ConfigService,
  IAuthorizationConfig,
} from "@hyperledger/cactus-cmd-api-server";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { ICbdcBridgingApp, CbdcBridgingApp } from "./cbdc-bridging-app";
import "dotenv/config";

export async function launchApp(
  env?: NodeJS.ProcessEnv,
  args?: string[],
): Promise<void> {
  const configService = new ConfigService();
  const exampleConfig = await configService.newExampleConfig();
  exampleConfig.configFile = "";
  exampleConfig.authorizationConfigJson = JSON.stringify(
    exampleConfig.authorizationConfigJson,
  ) as unknown as IAuthorizationConfig;
  exampleConfig.authorizationProtocol = AuthorizationProtocol.NONE;

  const convictConfig =
    await configService.newExampleConfigConvict(exampleConfig);

  env = await configService.newExampleConfigEnv(convictConfig.getProperties());

  const config = await configService.getOrCreate({ args, env });
  const serverOptions = config.getProperties();

  LoggerProvider.setLogLevel(serverOptions.logLevel);

  if (
    process.env.API_HOST == undefined ||
    process.env.API_SERVER_1_PORT == undefined ||
    process.env.API_SERVER_2_PORT == undefined ||
    process.env.API_GATEWAY_1_BLO_PORT == undefined ||
    process.env.API_GATEWAY_2_BLO_PORT == undefined ||
    process.env.API_GATEWAY_1_CLIENT_PORT == undefined ||
    process.env.API_GATEWAY_2_CLIENT_PORT == undefined ||
    process.env.API_GATEWAY_1_SERVER_PORT == undefined ||
    process.env.API_GATEWAY_2_SERVER_PORT == undefined
  ) {
    throw new Error("Env variables not set");
  }

  const appOptions: ICbdcBridgingApp = {
    apiServer1Port: parseInt(process.env.API_SERVER_1_PORT),
    apiServer2Port: parseInt(process.env.API_SERVER_2_PORT),
    apiHost: process.env.API_HOST,
    apiGateway1ServerPort: parseInt(process.env.API_GATEWAY_1_SERVER_PORT),
    apiGateway1ClientPort: parseInt(process.env.API_GATEWAY_1_CLIENT_PORT),
    apiGateway1BloPort: parseInt(process.env.API_GATEWAY_1_BLO_PORT),
    apiGateway2ServerPort: parseInt(process.env.API_GATEWAY_2_SERVER_PORT),
    apiGateway2ClientPort: parseInt(process.env.API_GATEWAY_2_CLIENT_PORT),
    apiGateway2BloPort: parseInt(process.env.API_GATEWAY_2_BLO_PORT),
    logLevel: "DEBUG",
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
