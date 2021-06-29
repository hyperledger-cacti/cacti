import { AddressInfo } from "net";
import "jest-extended";
import { DefaultApi as ConsortiumManualApi } from "@hyperledger/cactus-plugin-consortium-manual";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";
import { DefaultConsortiumProvider } from "../../../main/typescript";
import { Configuration } from "@hyperledger/cactus-core-api";
import { Server } from "http";

describe("DefaultConsortiumProvider", () => {
  const logLevel: LogLevelDesc = "TRACE";

  let httpServer1: Server;
  beforeAll(async () => {
    httpServer1 = await Servers.startOnPreferredPort(4050);
  });

  afterAll(() => {
    Servers.shutdown(httpServer1);
  });

  it("Handles timeout/connection refusal transparently", async () => {
    const addressInfo1 = httpServer1.address() as AddressInfo;
    const apiHost = `http://${addressInfo1.address}:${addressInfo1.port}`;

    const config = new Configuration({
      basePath: apiHost,
      baseOptions: {
        timeout: 2000,
      },
    });

    const provider = new DefaultConsortiumProvider({
      logLevel,
      apiClient: new ConsortiumManualApi(config),
    });

    try {
      await provider.get();
      fail("Provider.get() did not throw despite API errors.");
    } catch (ex) {
      expect(ex).toBeTruthy();
      expect(ex.message).toBeString();
      expect(ex.message).toContain("timeout");
    }
  });

  it("Handles 4xx transparently", async () => {
    const config = new Configuration({
      basePath: "https://httpbin.org/status/400",
    });
    const provider = new DefaultConsortiumProvider({
      logLevel,
      apiClient: new ConsortiumManualApi(config),
    });

    try {
      await provider.get();
      fail("Provider.get() did not throw despite API errors.");
    } catch (ex) {
      expect(ex).toBeTruthy();
      expect(ex).toBeInstanceOf(Error);
      expect(ex.message).toBeString();
      expect(ex.message).not.toBeEmpty();
      expect(ex.message).toInclude("status code 404");
    }
  });
});
