import {
  ApiServer,
  ConfigService,
  AuthorizationProtocol,
} from "../../../main/typescript/public-api";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  ICactusPlugin,
  IPluginGrpcService,
  IGrpcSvcDefAndImplPair,
} from "@hyperledger-cacti/cactus-core-api";

describe("API server: awaits IPluginGrpcService registrations before bindAsync", () => {
  let isPluginRegistered = false;
  let apiServer: ApiServer;

  afterAll(async () => {
    if (apiServer) {
      await apiServer.shutdown();
    }
  });

  test("Plugin GRPC service registration completes before ApiServer start resolves", async () => {
    class MockGrpcPlugin implements ICactusPlugin, IPluginGrpcService {
      public getPackageName(): string {
        return "mock-grpc-plugin";
      }
      public getInstanceId(): string {
        return "mock-grpc-plugin-instance-1";
      }
      public async onPluginInit(): Promise<unknown> {
        return;
      }
      public async createGrpcSvcDefAndImplPairs(): Promise<
        IGrpcSvcDefAndImplPair[]
      > {
        return new Promise((resolve) => {
          setTimeout(() => {
            isPluginRegistered = true;
            resolve([]);
          }, 1000); // Artificial 1-second delay to trigger the race condition
        });
      }
    }

    const mockPlugin = new MockGrpcPlugin();
    const pluginRegistry = new PluginRegistry({ plugins: [mockPlugin] });

    const configService = new ConfigService();
    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.configFile = "";
    apiSrvOpts.logLevel = "TRACE";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = []; // Handled by the injected pluginRegistry

    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    // Start the server and wait for it to resolve
    const startResponse = await apiServer.start();

    expect(startResponse).toBeTruthy();

    // If the race condition exists, start() will resolve immediately
    // and isPluginRegistered will still be false.
    // With the fix (Promise.all), start() blocks until the 1-second timeout finishes.
    expect(isPluginRegistered).toBe(true);
  });
});
