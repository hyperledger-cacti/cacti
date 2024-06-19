#!/usr/bin/env node

import {
  AuthorizationProtocol,
  ConfigService,
  IAuthorizationConfig,
} from "@hyperledger/cactus-cmd-api-server";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { ICbdcBridgingApp, CbdcBridgingApp } from "./cbdc-bridging-app";
import CryptoMaterial from "../../crypto-material/crypto-material.json";
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

  const clientGatewayKeyPair = {
    privateKey: Uint8Array.from(
      Buffer.from(CryptoMaterial.gateways["gateway1"].privateKey, "hex"),
    ),
    publicKey: Uint8Array.from(
      Buffer.from(CryptoMaterial.gateways["gateway1"].publicKey, "hex"),
    ),
  };

  const serverGatewayKeyPair = {
    privateKey: Uint8Array.from(
      Buffer.from(CryptoMaterial.gateways["gateway2"].privateKey, "hex"),
    ),
    publicKey: Uint8Array.from(
      Buffer.from(CryptoMaterial.gateways["gateway2"].publicKey, "hex"),
    ),
  };

  if (
    process.env.API_HOST == undefined ||
    process.env.API_SERVER_1_PORT == undefined ||
    process.env.API_SERVER_2_PORT == undefined ||
    process.env.API_CRPC_HOST == undefined ||
    process.env.API_SERVER_1_CRPC_PORT == undefined ||
    process.env.API_SERVER_2_CRPC_PORT == undefined
  ) {
    throw new Error("Env variables not set");
  }

  const appOptions: ICbdcBridgingApp = {
    apiHost: process.env.API_HOST,
    apiServer1Port: parseInt(process.env.API_SERVER_1_PORT),
    apiServer2Port: parseInt(process.env.API_SERVER_2_PORT),
    clientGatewayKeyPair: clientGatewayKeyPair,
    serverGatewayKeyPair: serverGatewayKeyPair,
    logLevel: "DEBUG",
    apiCrpcHost: process.env.API_CRPC_HOST,
    apiServer1CrpcPort: parseInt(process.env.API_SERVER_1_CRPC_PORT),
    apiServer2CrpcPort: parseInt(process.env.API_SERVER_2_CRPC_PORT),
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
