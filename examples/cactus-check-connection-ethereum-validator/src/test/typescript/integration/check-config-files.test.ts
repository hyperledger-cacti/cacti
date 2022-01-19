import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "TRACE";
const logger: Logger = LoggerProvider.getOrCreate({
  label: "preflight-check",
  level: logLevel,
});

const fs = require("fs");
const yaml = require("js-yaml");

const configLocation = "/etc/cactus";
const encoding = "utf8";

function getYamlFileContent(fileName: string): any {
  logger.debug(`Reading ${fileName} file`);
  const fileContent = yaml.safeLoad(
    fs.readFileSync(`${configLocation}/${fileName}.yaml`, encoding),
  );
  return fileContent;
}

function checkExistenceOfFile(fileName: string): boolean {
  const path = `${configLocation}/${fileName}.yaml`;

  if (fs.existsSync(path)) {
    return true;
  } else {
    return false;
  }
}
describe("Config files check tests", () => {
  test("Check if all config files exists", () => {
    expect(checkExistenceOfFile("default")).toBe(true);
    expect(checkExistenceOfFile("usersetting")).toBe(true);
  });

  test("Check default.yaml integrity", () => {
    const defaultYaml = getYamlFileContent("default");
    logger.debug(`default.yaml file content:\n${defaultYaml}`);

    logger.debug(`Check keys in tested config file`);
    expect(Object.keys(defaultYaml)).toContain("checkEthereumValidator");
    expect(Object.keys(defaultYaml)).toContain("logLevel");
    expect(Object.keys(defaultYaml.checkEthereumValidator)).toContain(
      "connector",
    );
    expect(Object.keys(defaultYaml.checkEthereumValidator.connector)).toContain(
      "validatorID",
    );
    expect(Object.keys(defaultYaml.checkEthereumValidator.connector)).toContain(
      "chainName",
    );

    logger.debug(`Check values in tested config file`);
    expect(defaultYaml.checkEthereumValidator.connector.validatorID).toBe(
      "84jUisrs",
    );
    expect(
      typeof defaultYaml.checkEthereumValidator.connector.validatorID,
    ).toBe("string");

    expect(defaultYaml.checkEthereumValidator.connector.chainName).toBe(
      "geth1",
    );
    expect(typeof defaultYaml.checkEthereumValidator.connector.chainName).toBe(
      "string",
    );

    expect(typeof defaultYaml.logLevel).toBe("string");
  });

  test("Check usersetting.yaml integrity", () => {
    const usersettingYaml = getYamlFileContent("usersetting");
    logger.debug(`default.yaml file content:\n${usersettingYaml}`);

    logger.debug(`Check keys in tested config file`);
    expect(Object.keys(usersettingYaml)).toContain("blpRegistry");
    expect(Object.keys(usersettingYaml.blpRegistry[0])).toContain(
      "businessLogicID",
    );
    expect(Object.keys(usersettingYaml.blpRegistry[0])).toContain(
      "validatorID",
    );

    expect(Object.keys(usersettingYaml)).toContain("logLevel");

    expect(Object.keys(usersettingYaml)).toContain("applicationHostInfo");
    expect(Object.keys(usersettingYaml.applicationHostInfo)).toContain(
      "hostName",
    );
    expect(Object.keys(usersettingYaml.applicationHostInfo)).toContain(
      "hostPort",
    );

    expect(Object.keys(usersettingYaml)).toContain("appRouters");
    expect(Object.keys(usersettingYaml.appRouters[0])).toContain("path");
    expect(Object.keys(usersettingYaml.appRouters[0])).toContain("routerJs");

    expect(Object.keys(usersettingYaml)).toContain("verifier");
    expect(Object.keys(usersettingYaml.verifier)).toContain(
      "maxCounterRequestID",
    );
    expect(Object.keys(usersettingYaml.verifier)).toContain(
      "syncFunctionTimeoutMillisecond",
    );

    expect(Object.keys(usersettingYaml)).toContain("socketOptions");
    expect(Object.keys(usersettingYaml.socketOptions)).toContain(
      "rejectUnauthorized",
    );
    expect(Object.keys(usersettingYaml.socketOptions)).toContain(
      "reconnection",
    );
    expect(Object.keys(usersettingYaml.socketOptions)).toContain("timeout");

    logger.debug(`Check values in tested config file`);
    expect(usersettingYaml.blpRegistry[0].businessLogicID).toBe("jLn76rgB");
    expect(usersettingYaml.blpRegistry[0].validatorID[0]).toBe("84jUisrs");

    expect(
      usersettingYaml.logLevel === "error" ||
        usersettingYaml.logLevel === "warn" ||
        usersettingYaml.logLevel === "info" ||
        usersettingYaml.logLevel === "debug" ||
        usersettingYaml.logLevel === "trace",
    ).toBe(true);

    const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    expect(
      usersettingYaml.applicationHostInfo.hostName.replace("http://", ""),
    ).toMatch(ipRegex);

    expect(typeof usersettingYaml.applicationHostInfo.hostPort).toBe("number");
    expect(usersettingYaml.applicationHostInfo.hostPort).toBe(5034);

    expect(typeof usersettingYaml.verifier.maxCounterRequestID).toBe("number");
    expect(usersettingYaml.verifier.maxCounterRequestID).toBe(100);
    expect(typeof usersettingYaml.verifier.syncFunctionTimeoutMillisecond).toBe(
      "number",
    );

    expect(typeof usersettingYaml.socketOptions.rejectUnauthorized).toBe(
      "boolean",
    );
    expect(typeof usersettingYaml.socketOptions.reconnection).toBe("boolean");
    expect(typeof usersettingYaml.socketOptions.timeout).toBe("number");
  });
});
