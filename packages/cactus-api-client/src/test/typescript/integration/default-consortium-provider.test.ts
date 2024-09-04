import http from "node:http";
import { AddressInfo } from "node:net";

import "jest-extended";
import { StatusCodes } from "http-status-codes";

import { DefaultApi as ConsortiumManualApi } from "@hyperledger/cactus-plugin-consortium-manual";
import {
  LoggerProvider,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { DefaultConsortiumProvider } from "../../../main/typescript";
import { Configuration } from "@hyperledger/cactus-core-api";

describe("DefaultConsortiumProvider", () => {
  const logLevel: LogLevelDesc = "SILENT";

  const log = LoggerProvider.getOrCreate({
    label: "default-consortium-provider.test.ts",
    level: logLevel,
  });

  let httpServer1: http.Server;
  let apiClientConfig: Configuration;

  beforeAll(async () => {
    httpServer1 = await Servers.startOnPreferredPort(4050);
    const { address, port } = httpServer1.address() as AddressInfo;
    const apiHost = `http://${address}:${port}`;
    log.info("API host: %s", apiHost);

    apiClientConfig = new Configuration({
      basePath: apiHost,
      baseOptions: {
        timeout: 2000,
      },
    });
  });

  afterAll(async () => {
    await Servers.shutdown(httpServer1);
  });

  it("Handles timeout/connection refusal transparently", async () => {
    const provider = new DefaultConsortiumProvider({
      logLevel,
      apiClient: new ConsortiumManualApi(apiClientConfig),
    });

    expect(provider.get()).rejects.toMatchObject({
      message: expect.stringMatching(
        new RegExp(`connect ECONNREFUSED (.*):4050`),
      ),
    });
  });

  it("Handles 4xx transparently", async () => {
    const config = new Configuration({
      basePath: "https://httpbin.org/status/400",
    });
    const provider = new DefaultConsortiumProvider({
      logLevel,
      apiClient: new ConsortiumManualApi(config),
    });

    expect(provider.get()).rejects.toMatchObject({
      code: "ERR_BAD_REQUEST",
      message: expect.stringContaining("status code " + StatusCodes.NOT_FOUND),
    });
  });
});
