import path from "path";
import { CompilerTools } from "../../../../main/typescript/compiler-tools/compiler-tools";
import fs from "fs-extra";
import { FileBase64 } from "../../../../main/typescript";
import temp from "temp";
import { LoggerProvider } from "@hyperledger-cacti/cactus-common";
import tar from "tar-fs";
import { pruneDockerContainersIfGithubAction } from "@hyperledger-cacti/cactus-test-tooling";

const logLevel = "DEBUG";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "satpTestWithLedgerConnectors",
});

beforeAll(async () => {
  const pruning = pruneDockerContainersIfGithubAction({ logLevel });
  await expect(pruning).resolves.not.toThrow();
});

afterAll(async () => {
  const pruning = pruneDockerContainersIfGithubAction({ logLevel });
  await expect(pruning).resolves.not.toThrow();
  temp.cleanup();
});

describe("Test CLI comands for Fabric connector", () => {
  it("It should deploy the container and stop", async () => {
    const ccCompiler = new CompilerTools({
      logLevel: "DEBUG",
    });
    await ccCompiler.start();
    await ccCompiler.waitForHealthCheck();
    const container = ccCompiler.getContainer();
    const containerId = container.id;
    expect(container).toBeDefined();
    expect(containerId).toBeDefined();

    await ccCompiler.stop();
    const containerData = await container.inspect();
    expect(containerData.State.Running).toBe(false);
    expect(containerData.State.Status).toBe("exited");
  });
  it("It should compile GO chaincode and package the code with peer binary", async () => {
    const ccCompiler = new CompilerTools({
      logLevel: "DEBUG",
    });
    await ccCompiler.start();
    await ccCompiler.waitForHealthCheck();
    const container = ccCompiler.getContainer();
    const containerId = container.id;
    expect(container).toBeDefined();
    expect(containerId).toBeDefined();

    temp.track();

    // Ensure __dirname is defined (for ESM, use import.meta.url or set __dirname)
    const coreYamlPath = path.resolve(
      __dirname,
      "../../../resources/fixtures/addOrgX/core.yaml",
    );

    if (!fs.existsSync(coreYamlPath)) {
      throw new Error(`core.yaml not found at path: ${coreYamlPath}`);
    }

    const baseName = path.basename(coreYamlPath);
    const dir = path.dirname(coreYamlPath);

    const coreYamlTarStream = tar.pack(dir, {
      entries: [baseName], // only include the file
    });

    await ccCompiler.getContainer().putArchive(coreYamlTarStream, {
      path: "./",
    });

    const contractRelPath =
      "../../fixtures/go/basic-asset-transfer/chaincode-go";
    const contractDir = path.join(__dirname, contractRelPath);
    const contractName = "basic-asset-transfer-2";
    const ccLabel = "basic-asset-transfer-2";

    const smartContractGoPath = path.join(
      contractDir,
      "./chaincode/",
      "./smartcontract.go",
    );
    const smartContractGoBuf = await fs.readFile(smartContractGoPath);
    const smartContractGo = {
      body: smartContractGoBuf.toString("base64"),
      filepath: "./chaincode/",
      filename: `smartcontract.go`,
    };
    const assetTransferGoPath = path.join(contractDir, "./assetTransfer.go");
    const assetTransferGoBuf = await fs.readFile(assetTransferGoPath);
    const assetTransferGo = {
      body: assetTransferGoBuf.toString("base64"),
      filename: `${contractName}.go`,
    };
    const goModPath = path.join(contractDir, "./go.mod");
    const goModBuf = await fs.readFile(goModPath);
    const goMod = {
      body: goModBuf.toString("base64"),
      filename: "go.mod",
    };

    const goSumPath = path.join(contractDir, "./go.sum");
    const goSumBuf = await fs.readFile(goSumPath);
    const goSum = {
      body: goSumBuf.toString("base64"),
      filename: "go.sum",
    };

    const sourceFiles: FileBase64[] = [
      assetTransferGo,
      smartContractGo,
      goMod,
      goSum,
    ];

    const tmpDirPrefix = `hyperledger-cacti-test-go-compile-${contractName}`;
    const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

    for (const sourceFile of sourceFiles) {
      const { filename, filepath, body } = sourceFile;
      const relativePath = filepath || "./";
      const subDirPath = path.join(tmpDirPath, relativePath);
      fs.mkdirSync(subDirPath, { recursive: true });
      const localFilePath = path.join(subDirPath, filename);
      fs.writeFileSync(localFilePath, body, "base64");
    }

    const tarStream = tar.pack(tmpDirPath);

    await ccCompiler.getContainer().putArchive(tarStream, {
      path: "./chaincode",
    });

    log.debug("Compiling GO Chaincode...");
    const out = await ccCompiler.executeCommand({
      command: ["go", "mod", "vendor"],
      label: "Compiling GO Chain Code",
      env: ["GO111MODULE=on"],
    });

    if (out.code !== 0) {
      throw new Error(`Failed to compile GO chaincode: ${JSON.stringify(out)}`);
    }
    log.debug(`stdout: ${JSON.stringify(out)}`);
    log.debug("GO Chaincode compiled OK.");

    const packageExecCommand = [
      "peer",
      "lifecycle",
      "chaincode",
      "package",
      `${contractName}.tar.gz`,
      "--path",
      "./",
      "--label",
      ccLabel,
      "--lang",
      "golang",
    ];

    const packageOut = await ccCompiler.executeCommand({
      command: packageExecCommand,
      label: "Packaging GO Chain Code",
      env: ["FABRIC_CFG_PATH=./.."], // Ensure the peer command can find the core.yaml
    });

    log.debug(`stdout: ${JSON.stringify(packageOut)}`);
    if (packageOut.code !== 0) {
      throw new Error(
        `Failed to package GO chaincode: ${JSON.stringify(packageOut)}`,
      );
    }
    log.debug("GO Chaincode packaged OK.");

    await ccCompiler.stop();
    temp.cleanup();
  });
  it.skip("It should compile Java chaincode and package the code with peer binary", async () => {
    const ccCompiler = new CompilerTools({
      logLevel: "DEBUG",
    });
    await ccCompiler.start();
    await ccCompiler.waitForHealthCheck();
    const container = ccCompiler.getContainer();
    const containerId = container.id;
    expect(container).toBeDefined();
    expect(containerId).toBeDefined();

    //TODO IMPLEMENT
    await ccCompiler.stop();
  });
  it("It should compile JS chaincode and package the code with peer binary", async () => {
    const ccCompiler = new CompilerTools({
      logLevel: "DEBUG",
    });
    await ccCompiler.start();
    await ccCompiler.waitForHealthCheck();
    const container = ccCompiler.getContainer();
    const containerId = container.id;
    expect(container).toBeDefined();
    expect(containerId).toBeDefined();

    temp.track();

    // Ensure __dirname is defined (for ESM, use import.meta.url or set __dirname)
    const coreYamlPath = path.resolve(
      __dirname,
      "../../../resources/fixtures/addOrgX/core.yaml",
    );

    if (!fs.existsSync(coreYamlPath)) {
      throw new Error(`core.yaml not found at path: ${coreYamlPath}`);
    }

    const baseName = path.basename(coreYamlPath);
    const dir = path.dirname(coreYamlPath);

    const coreYamlTarStream = tar.pack(dir, {
      entries: [baseName], // only include the file
    });

    await ccCompiler.getContainer().putArchive(coreYamlTarStream, {
      path: "./",
    });

    const contractRelPath =
      "../../fixtures/go/basic-asset-transfer/chaincode-javascript/";
    const contractDir = path.join(__dirname, contractRelPath);

    const contractName = "basic-asset-transfer-2";
    const ccLabel = "basic-asset-transfer-2";

    const sourceFiles: FileBase64[] = [];
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.js";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./assetTransfer.js";
      const relativePath = "./lib/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    const tmpDirPrefix = `hyperledger-cacti-test-go-compile-${contractName}`;
    const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

    for (const sourceFile of sourceFiles) {
      const { filename, filepath, body } = sourceFile;
      const relativePath = filepath || "./";
      const subDirPath = path.join(tmpDirPath, relativePath);
      fs.mkdirSync(subDirPath, { recursive: true });
      const localFilePath = path.join(subDirPath, filename);
      fs.writeFileSync(localFilePath, body, "base64");
    }

    const tarStream = tar.pack(tmpDirPath);

    await ccCompiler.getContainer().putArchive(tarStream, {
      path: "./chaincode",
    });

    log.debug("Compiling JS Chaincode...");
    log.debug("JS Chaincode does not need compiling.");

    const packageExecCommand = [
      "peer",
      "lifecycle",
      "chaincode",
      "package",
      `${contractName}.tar.gz`,
      "--path",
      "./",
      "--label",
      ccLabel,
      "--lang",
      "node",
    ];

    const packageOut = await ccCompiler.executeCommand({
      command: packageExecCommand,
      label: "Packaging JS Chaincode",
      env: ["FABRIC_CFG_PATH=./.."], // Ensure the peer command can find the core.yaml
    });

    log.debug(`stdout: ${JSON.stringify(packageOut)}`);
    if (packageOut.code !== 0) {
      throw new Error(
        `Failed to package JS chaincode: ${JSON.stringify(packageOut)}`,
      );
    }
    log.debug("JS Chaincode packaged OK.");

    await ccCompiler.stop();
    temp.cleanup();
  });

  it("It should compile TypeScript chaincode and package the code with peer binary", async () => {
    const ccCompiler = new CompilerTools({
      logLevel: "DEBUG",
    });
    await ccCompiler.start();
    await ccCompiler.waitForHealthCheck();
    const container = ccCompiler.getContainer();
    const containerId = container.id;
    expect(container).toBeDefined();
    expect(containerId).toBeDefined();

    temp.track();

    // Ensure __dirname is defined (for ESM, use import.meta.url or set __dirname)
    const coreYamlPath = path.resolve(
      __dirname,
      "../../../resources/fixtures/addOrgX/core.yaml",
    );

    if (!fs.existsSync(coreYamlPath)) {
      throw new Error(`core.yaml not found at path: ${coreYamlPath}`);
    }

    const baseName = path.basename(coreYamlPath);
    const dir = path.dirname(coreYamlPath);

    const coreYamlTarStream = tar.pack(dir, {
      entries: [baseName], // only include the file
    });

    await ccCompiler.getContainer().putArchive(coreYamlTarStream, {
      path: "./",
    });

    const contractRelPath =
      "../../fixtures/go/basic-asset-transfer/chaincode-typescript/";
    const contractDir = path.join(__dirname, contractRelPath);

    const contractName = "basic-asset-transfer-2";
    const ccLabel = "basic-asset-transfer-2";

    const sourceFiles: FileBase64[] = [];
    {
      const filename = "./tslint.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./asset.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./assetTransfer.ts";
      const relativePath = "./src/";
      const filePath = path.join(contractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      sourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    const tmpDirPrefix = `hyperledger-cacti-test-go-compile-${contractName}`;
    const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

    for (const sourceFile of sourceFiles) {
      const { filename, filepath, body } = sourceFile;
      const relativePath = filepath || "./";
      const subDirPath = path.join(tmpDirPath, relativePath);
      fs.mkdirSync(subDirPath, { recursive: true });
      const localFilePath = path.join(subDirPath, filename);
      fs.writeFileSync(localFilePath, body, "base64");
    }

    const tarStream = tar.pack(tmpDirPath);

    await ccCompiler.getContainer().putArchive(tarStream, {
      path: "./chaincode",
    });

    log.debug("Compiling TS Chaincode...");
    await ccCompiler.executeCommand({
      command: ["npm", "install"],
      label: "NPM Install Chain Code",
    });

    log.debug("ChainCode: Typescript build");
    await ccCompiler.executeCommand({
      command: ["npm", "run", "build"],
      label: "NPM Build Chain Code",
    });

    log.debug("Typescript Chaincode compiled OK.");

    const packageExecCommand = [
      "peer",
      "lifecycle",
      "chaincode",
      "package",
      `${contractName}.tar.gz`,
      "--path",
      "./",
      "--label",
      ccLabel,
      "--lang",
      "node",
    ];

    const packageOut = await ccCompiler.executeCommand({
      command: packageExecCommand,
      label: "Packaging TS Chaincode",
      env: ["FABRIC_CFG_PATH=./.."], // Ensure the peer command can find the core.yaml
    });

    log.debug(`stdout: ${JSON.stringify(packageOut)}`);
    if (packageOut.code !== 0) {
      throw new Error(
        `Failed to package TS chaincode: ${JSON.stringify(packageOut)}`,
      );
    }
    log.debug("TS Chaincode packaged OK.");

    await ccCompiler.stop();
    temp.cleanup();
  });
});
