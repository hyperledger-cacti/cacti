#!/usr/bin/env node

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
import { SupportedChain, DraftVersions, CurrentDrafts } from "./core/types";
import dotenv from "dotenv";

export async function launchGateway(env?: NodeJS.ProcessEnv): Promise<void> {
  dotenv.config();

  const logLevel: LogLevelDesc =
    (env?.SATP_LOG_LEVEL as LogLevelDesc) || "INFO";
  const logger = LoggerProvider.getOrCreate({
    level: logLevel,
    label: "SATP-Gateway",
  });

  // Parse the version string into DraftVersions object
  const parseVersion = (versionString: string): DraftVersions => {
    const [Core, Architecture, Crash] = versionString.split(",");
    return {
      [CurrentDrafts.Core]: Core,
      [CurrentDrafts.Architecture]: Architecture,
      [CurrentDrafts.Crash]: Crash,
    };
  };

  const gatewayConfig: SATPGatewayConfig = {
    gid: {
      id: env?.SATP_GATEWAY_ID || "",
      name: env?.SATP_GATEWAY_NAME,
      version: env?.SATP_GATEWAY_VERSION
        ? [parseVersion(env.SATP_GATEWAY_VERSION)]
        : [],
      supportedDLTs:
        env?.SATP_SUPPORTED_DLTS?.split(",").map(
          (dlt) => dlt as SupportedChain,
        ) || [],
      proofID: env?.SATP_PROOF_ID,
      gatewayServerPort: parseInt(env?.SATP_GATEWAY_SERVER_PORT || "0", 10),
      gatewayClientPort: parseInt(env?.SATP_GATEWAY_CLIENT_PORT || "0", 10),
      gatewayGrpcPort: parseInt(env?.SATP_GATEWAY_GRPC_PORT || "0", 10),
      address: env?.SATP_GATEWAY_ADDRESS as
        | `http://${string}`
        | `https://${string}`
        | undefined,
    },
    counterPartyGateways: JSON.parse(env?.SATP_COUNTER_PARTY_GATEWAYS || "[]"),
    logLevel,
    keyPair: {
      privateKey: Buffer.from(env?.SATP_PRIVATE_KEY || "", "hex"),
      publicKey: Buffer.from(env?.SATP_PUBLIC_KEY || "", "hex"),
    },
    environment:
      (env?.SATP_NODE_ENV as "development" | "production") || "development",
    enableOpenAPI: env?.SATP_ENABLE_OPEN_API === "true",
    validationOptions: JSON.parse(env?.SATP_VALIDATION_OPTIONS || "{}"),
    privacyPolicies: JSON.parse(env?.SATP_PRIVACY_POLICIES || "[]"),
    mergePolicies: JSON.parse(env?.SATP_MERGE_POLICIES || "[]"),
  };

  const gateway = new SATPGateway(gatewayConfig);
  try {
    logger.info("Starting SATP Gateway...");
    await gateway.startup();
    logger.info("SATP Gateway started successfully");
  } catch (ex) {
    logger.error(`SATP Gateway crashed. Exiting...`, ex);
    await gateway.shutdown();
    process.exit(-1);
  }
}

if (require.main === module) {
  launchGateway(process.env);
}
