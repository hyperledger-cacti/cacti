import { SATPGatewayConfig } from "@hyperledger/cactus-plugin-satp-hermes";
import path from "path";
import fs from "fs-extra";

export function getUserFromPseudonim(user: string): string {
  switch (user) {
    case "Alice":
      return "userA";
    case "Charlie":
      return "userB";
    case "Bridge":
      return "bridge";
    default:
      throw new Error(`User pseudonym not found for user: ${user}`);
  }
}

export function getTestConfigFilesDirectory(basePath: string): string {
  const testFilesDirectoryConfig = `${__dirname}/../../../../cache/${basePath}/config`;
  if (!fs.existsSync(testFilesDirectoryConfig)) {
    fs.mkdirSync(testFilesDirectoryConfig, { recursive: true });
  }
  return testFilesDirectoryConfig;
}

export function setupGatewayDockerFiles(config: Partial<SATPGatewayConfig>): {
  configPath: string;
  logsPath: string;
  ontologiesPath: string;
} {
  const directory = `${__dirname}/../../../../cache/`;
  const configDir = path.join(
    directory,
    `gateway-info-${config.gid?.id}/config`,
  );

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  const configFilePath = path.join(configDir, "config.json");
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Config file was not created at path: ${configFilePath}`);
  }

  const logDir = path.join(directory, `gateway-info-${config.gid?.id}/logs`);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const ontologiesDir = path.join(
    directory,
    `gateway-info-${config.gid?.id}/ontologies`,
  );
  if (!fs.existsSync(ontologiesDir)) {
    fs.mkdirSync(ontologiesDir, { recursive: true });
  }

  const sourceOntologiesDir = path.join(__dirname, "/../../json/ontologies");
  if (fs.existsSync(sourceOntologiesDir)) {
    fs.copySync(sourceOntologiesDir, ontologiesDir);
  } else {
    throw new Error(
      `Source ontologies directory does not exist: ${sourceOntologiesDir}`,
    );
  }

  return {
    configPath: configDir,
    logsPath: logDir,
    ontologiesPath: ontologiesDir,
  };
}
