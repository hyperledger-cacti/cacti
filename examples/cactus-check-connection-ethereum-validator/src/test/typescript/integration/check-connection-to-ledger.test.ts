import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "TRACE";
const logger: Logger = LoggerProvider.getOrCreate({
  label: "test-check-connection-to-ethereum-ledger",
  level: logLevel,
});

const http = require("http");
const net = require("net");
const fs = require("fs");
const yaml = require("js-yaml");

function getConfigData(): any {
  const config: any = yaml.safeLoad(
    fs.readFileSync("/etc/cactus/usersetting.yaml", "utf8"),
  );
  const hostName: string = config.applicationHostInfo.hostName.replace(
    "http://",
    "",
  );
  const hostPort: string = config.applicationHostInfo.hostPort;

  logger.info(`BLP hostname from usersetting file in /etc/cactus: ${hostName}`);
  logger.info(`BLP port from usersetting file in /etc/cactus: ${hostPort}`);
  return { hostname: hostName, port: hostPort };
}

function createOptionObj(
  path: string,
  method: string,
  postData: string,
): Record<string, unknown> {
  const configData = getConfigData();
  const options = {
    hostname: configData.hostname,
    port: configData.port,
    path: path,
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };
  return options;
}

function pingService(hostName: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(120);
    sock.on("connect", function () {
      logger.debug(`${hostName}:${port} is up.`);
      sock.destroy();
      resolve(true);
    });
    sock.on("error", function (error: any) {
      logger.error(`${hostName}:${port} is down: ${error.message}`);
      resolve(false);
    });
    sock.connect(port, hostName);
  });
}

function sendRequest(
  options: Record<string, unknown>,
  postData: string,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = http
      .request(options, (response: any) => {
        response.setEncoding("utf8");
        let body = "";
        const statusCode = response.statusCode;
        response.on("data", (chunk: any) => (body += chunk));
        response.on("end", () => resolve([body, statusCode]));
      })
      .on("error", reject);

    request.write(postData);
    request.end();
  });
}

function checkContainerStatus(containerName: string): Promise<boolean> {
  const { exec } = require("child_process");

  const checkRunningCmd = "docker container inspect -f '{{.State.Running}}'";

  return new Promise((resolve) => {
    exec(`${checkRunningCmd} ${containerName}`, (err: any, out: any) => {
      logger.debug(`Output from docker command: err: ${err}, out: ${out}`);

      if (out.replace("\n", "") == "true") {
        logger.info(`Container: ${containerName} is up and running!`);
        resolve(true);
      } else {
        logger.error(`Container: ${containerName} is down!`);
        resolve(false);
      }
    });
  });
}

describe("Environment check tests", () => {
  test("Check if all required services are accessible", async () => {
    const config = getConfigData();
    const ethereumLedgerPort = 8545;
    const ethereumConnectorPort = 5050;

    logger.debug(`Check connection to BLP (${config.hostname}:${config.port})`);
    expect(await pingService(config.hostname, config.port)).toBeTrue();

    logger.debug(
      `Check connection to Ethereum Connector (${config.hostname}:${ethereumConnectorPort})`,
    );
    expect(
      await pingService(config.hostname, ethereumConnectorPort),
    ).toBeTrue();

    logger.debug(
      `Check connection to Ethereum Ledger (${config.hostname}:${ethereumLedgerPort})`,
    );
    expect(await pingService(config.hostname, ethereumLedgerPort)).toBeTrue();
  });

  test("Check if containers started successfully", async () => {
    logger.debug(`Check ethereum ledger container`);
    const ethereumLedgerContainerName = "geth1";
    expect(await checkContainerStatus(ethereumLedgerContainerName)).toBeTrue();

    logger.debug(`Check ethereum connector container`);
    const ethereumConnectorContainerName =
      "hyperledger-cactus-plugin-ledger-connector-go-ethereum-socketio";
    expect(
      await checkContainerStatus(ethereumConnectorContainerName),
    ).toBeTrue();
  });

  test("Check connection to BLP and validate response", async () => {
    const postData = JSON.stringify({
      businessLogicID: "jLn76rgB",
    });
    const path = "/api/v1/bl/check-ethereum-validator";
    const options = createOptionObj(path, "POST", postData);

    const response = await sendRequest(options, postData);
    logger.debug(`Received response: [${response}]`);

    logger.debug(`Check status code from API`);
    expect(response[1]).toBe(200);

    logger.debug(`Check if response is not empty`);
    expect(response[0]).not.toBe("");

    let jsonResponse: any;
    try {
      jsonResponse = JSON.parse(response[0]);
    } catch (error) {
      logger.error(`There was a problem with parsing response`);
    }

    logger.debug(`Check if parsed response contains proper keys`);
    expect(Object.keys(jsonResponse)).toContain("tradeID");

    logger.debug(`Check if value assigned to tradeID key is not empty`);
    expect(jsonResponse.tradeID).not.toEqual("");
  });
});

describe("Ledger operation tests", () => {
  test("Get balance from ledger (read test <sync, async>)", async () => {
    const account = "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97";
    const path = "/api/v1/bl/check-ethereum-validator/getBalance";

    logger.info("Checking ASYNC request...");

    let postData = JSON.stringify({
      account: account,
      requestType: "async",
    });

    let options = createOptionObj(path, "POST", postData);

    let response = await sendRequest(options, postData);
    logger.debug(`Received response: [${response}]`);

    // check status code
    logger.debug(`Check status code from API`);
    expect(response[1]).toBe(200);

    // check response content
    logger.debug(`Check response content`);
    expect(response[0]).toBe("true");

    logger.info("Checking SYNC request");

    postData = JSON.stringify({
      account: account,
      requestType: "sync",
    });

    options = createOptionObj(path, "POST", postData);
    response = await sendRequest(options, postData);
    logger.debug(`Received response: [${response}]`);

    // check status code from API
    logger.debug(`Check status code from API`);
    expect(response[1]).toBe(200);

    // check if response is not empty
    expect(response[0]).not.toBe("");

    let jsonResponse: any;
    try {
      jsonResponse = JSON.parse(response[0]);
    } catch (error) {
      logger.error(`There was a problem with parsing response`);
    }

    logger.debug(`Check if parsed response contains proper keys`);
    expect(Object.keys(jsonResponse)).toContain("status");
    expect(Object.keys(jsonResponse)).toContain("amount");

    logger.debug(`Check if values assigned keys are not empty`);
    expect(jsonResponse.status).not.toEqual("");
    expect(jsonResponse.amount).not.toEqual("");

    logger.debug(
      `Check if status code retrieved from connector is between 200-300`,
    );
    expect(jsonResponse.status >= 200).toBeTruthy();
    expect(jsonResponse.status).toBeLessThan(300);

    logger.debug(`Check if balance is not negative number`);
    expect(jsonResponse.amount >= 0).toBeTruthy();
  });

  async function getCurrentBalanceOnAccount(account: string): Promise<number> {
    const getCurrentBalancePath =
      "/api/v1/bl/check-ethereum-validator/getBalance";

    const postData = JSON.stringify({
      account: account,
      requestType: "sync",
    });

    const options = createOptionObj(getCurrentBalancePath, "POST", postData);

    const srcCheckBalanceResponse = await sendRequest(options, postData);

    let srcCheckBalanceJsonResponse: any;
    try {
      srcCheckBalanceJsonResponse = JSON.parse(srcCheckBalanceResponse[0]);
    } catch (error) {
      logger.error(`There was a problem with parsing response`);
    }

    return srcCheckBalanceJsonResponse.amount;
  }

  test("Make sample transaction (write test <sync, async>)", async () => {
    const srcAccount = "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97";
    const destAccount = "9d624f7995e8bd70251f8265f2f9f2b49f169c55";
    const transferAmount = "150";
    const path = "/api/v1/bl/check-ethereum-validator/transferAssets";

    logger.info("Checking ASYNC request...");

    let postData = JSON.stringify({
      srcAccount: srcAccount,
      destAccount: destAccount,
      amount: transferAmount,
      requestType: "async",
    });

    let options = createOptionObj(path, "POST", postData);

    // Get current balances on accounts before sending request
    let srcBalanceBeforeTransaction = await getCurrentBalanceOnAccount(
      srcAccount,
    );
    let destBalanceBeforeTransaction = await getCurrentBalanceOnAccount(
      destAccount,
    );
    logger.debug(`Balances before transaction:\nsource account:${srcBalanceBeforeTransaction}
                 \ndestination account: ${destBalanceBeforeTransaction}`);

    // Make request
    let response = await sendRequest(options, postData);
    logger.debug(`Received response: [${response}]`);

    // Check status code
    logger.debug(`Check status code from API`);
    expect(response[1]).toBe(200);

    // Check response content
    logger.debug(`Check response content`);
    expect(response[0]).toBe("true");

    // Wait for 20s to complete transfer
    const foo = true;
    await new Promise((r) => setTimeout(r, 60000));
    expect(foo).toBeDefined();

    // Check balances after transaction
    let srcBalanceAfterTransaction = await getCurrentBalanceOnAccount(
      srcAccount,
    );
    let destBalanceAfterTransaction = await getCurrentBalanceOnAccount(
      destAccount,
    );

    // Check if differences from before and after transaction are correct

    expect(srcBalanceBeforeTransaction - srcBalanceAfterTransaction).toBe(
      parseInt(transferAmount),
    );
    expect(destBalanceAfterTransaction - destBalanceBeforeTransaction).toBe(
      parseInt(transferAmount),
    );
    logger.debug("Assets have been successfully moved between accounts");

    logger.info("Checking SYNC request...");

    postData = JSON.stringify({
      srcAccount: srcAccount,
      destAccount: destAccount,
      amount: transferAmount,
      requestType: "sync",
    });

    options = createOptionObj(path, "POST", postData);

    // Get current balances on accounts before sending request
    srcBalanceBeforeTransaction = await getCurrentBalanceOnAccount(srcAccount);
    destBalanceBeforeTransaction = await getCurrentBalanceOnAccount(
      destAccount,
    );
    logger.debug(`Balances before transaction:\nsource account:${srcBalanceBeforeTransaction}
                 destination account: ${destBalanceBeforeTransaction}`);

    // Make request
    response = await sendRequest(options, postData);
    logger.debug(`Received response: [${response}]`);

    // Check status code
    logger.debug(`Check status code from API`);
    expect(response[1]).toBe(200);

    // Check response content
    logger.debug(`Check response content`);
    let jsonResponse: any;
    try {
      jsonResponse = JSON.parse(response[0]);
    } catch (error) {
      logger.error(`There was a problem with parsing response`);
    }

    logger.debug(`Check if parsed response contains proper keys`);
    expect(Object.keys(jsonResponse)).toContain("status");
    expect(Object.keys(jsonResponse)).toContain("data");

    logger.debug("Check content of response");
    logger.debug(`Check if values assigned keys are not empty`);
    expect(jsonResponse.status).not.toEqual("");
    expect(jsonResponse.data).not.toEqual("");

    logger.debug(
      `Check if status code retrieved from connector is between 200-300`,
    );
    expect(jsonResponse.status >= 200).toBeTruthy();
    expect(jsonResponse.status).toBeLessThan(300);

    // Wait for 20s to complete transfer
    await new Promise((r) => setTimeout(r, 60000));
    expect(foo).toBeDefined();

    // Check balances after transaction
    srcBalanceAfterTransaction = await getCurrentBalanceOnAccount(srcAccount);
    destBalanceAfterTransaction = await getCurrentBalanceOnAccount(destAccount);

    // Check if differences from before and after transaction are correct

    expect(srcBalanceBeforeTransaction - srcBalanceAfterTransaction).toBe(
      parseInt(transferAmount),
    );
    expect(destBalanceAfterTransaction - destBalanceBeforeTransaction).toBe(
      parseInt(transferAmount),
    );
    logger.debug("Assets have been successfully moved between accounts");
  });
});
