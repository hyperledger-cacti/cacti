import fs from "fs";
import { AddressInfo } from "net";
import http from "http";
import path from "path";

import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";

import express from "express";
import bodyParser from "body-parser";
import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";

import { FabricTestLedgerV1 } from "@hyperledger/cactus-test-tooling";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core-api";

import {
  PluginLedgerConnectorFabric,
  ChainCodeCompiler,
  ICompilationOptions,
} from "../../../../../main/typescript/public-api";

import { HELLO_WORLD_CONTRACT_GO_SOURCE } from "../../../fixtures/go/hello-world-contract-fabric-v14/hello-world-contract-go-source";

import { IPluginLedgerConnectorFabricOptions } from "../../../../../main/typescript/plugin-ledger-connector-fabric";

test.skip("deploys contract from go source", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const ledger = new FabricTestLedgerV1({ publishAllPorts: true });
  await ledger.start();

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  t.ok(connectionProfile);

  const sshConfig = await ledger.getSshConfig();

  const pluginRegistry = new PluginRegistry();
  const pluginOpts: IPluginLedgerConnectorFabricOptions = {
    instanceId: uuidv4(),
    pluginRegistry,
    sshConfig,
    logLevel,
    connectionProfile,
  };
  const plugin = new PluginLedgerConnectorFabric(pluginOpts);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  test.onFinish(async () => await Servers.shutdown(server));

  const [endpoint] = await plugin.installWebServices(expressApp);

  const url = `http://localhost:${port}${endpoint.getPath()}`;

  const form = new FormData();
  const headers = form.getHeaders();

  const compiler = new ChainCodeCompiler({ logLevel });

  const opts: ICompilationOptions = {
    fileName: "hello-world-contract.go",
    moduleName: "hello-world-contract",
    pinnedDeps: ["github.com/hyperledger/fabric@v1.4.8"],
    modTidyOnly: true, // we just need the go.mod file so tidy only is enough
    sourceCode: HELLO_WORLD_CONTRACT_GO_SOURCE,
  };

  const result = await compiler.compile(opts);
  t.ok(result, "result OK");
  t.ok(result.goVersionInfo, "result.goVersionInfo OK");
  t.ok(result.goModFilePath, "result.goModFilePath OK");
  t.ok(result.sourceFilePath, "result.sourceFilePath OK");
  t.comment(result.goVersionInfo);

  const goModStream = fs.createReadStream(result.goModFilePath);
  const sourceFileStream = fs.createReadStream(result.sourceFilePath);

  // Second argument can take Buffer or Stream (lazily read during the request) too.
  // Third argument is filename if you want to simulate a file upload. Otherwise omit.
  form.append("files", sourceFileStream, path.basename(result.sourceFilePath));
  form.append("files", goModStream, path.basename(result.goModFilePath));

  const reqConfig: AxiosRequestConfig = {
    headers,
    maxContentLength: 128 * 1024 * 1024, // 128 MB
    maxBodyLength: 128 * 1024 * 1024, // 128 MB,
  };
  t.comment(`Req.URL=${url}`);
  const res = await axios.post(url, form, reqConfig);
  const { status, data } = res;

  t.comment(`res.status: ${res.status}`);
  t.equal(status, 200, "res.status === 200 OK");

  t.true(data.success, "res.data.success === true");

  t.end();
});
