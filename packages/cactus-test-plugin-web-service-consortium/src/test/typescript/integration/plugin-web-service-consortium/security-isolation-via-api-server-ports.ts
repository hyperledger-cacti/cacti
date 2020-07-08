// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { AxiosResponse } from "axios";
import { Server } from "http";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ApiServer,
  ConfigService,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";
import { PluginRegistry } from "@hyperledger/cactus-core-api";
import { PluginKVStorageMemory } from "@hyperledger/cactus-plugin-kv-storage-memory";
import {
  DefaultApi,
  Configuration,
  HealthCheckResponse,
} from "@hyperledger/cactus-sdk";
import {
  DefaultApi as DefaultApiPlugin,
  Configuration as ConfigurationPlugin,
  PluginWebServiceConsortium,
  IPluginWebServiceConsortiumOptions,
} from "@hyperledger/cactus-plugin-web-service-consortium";

LoggerProvider.setLogLevel("TRACE");
const log: Logger = LoggerProvider.getOrCreate({
  label: "security-isolation-via-api-server-ports",
});

tap.test(
  "pulls up API server with consortium web service on different port",
  async (assert: any) => {
    // 1. Instantiate a key value storage plugin that works in memory (good here because we don't need persistence)
    const kvStoragePlugin = new PluginKVStorageMemory({ backend: new Map() });

    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    const pluginRegistry = new PluginRegistry({ plugins: [kvStoragePlugin] });

    // 3. Instantiate the web service consortium plugin which will host itself on a new TCP port for isolation/security
    // Note that if we omitted the `webAppOptions` object that the web service plugin would default to installing itself
    // on the default port of the API server. This allows for flexibility in deployments.
    const options: IPluginWebServiceConsortiumOptions = {
      pluginRegistry,
      privateKey:
        "4eb8be4f03c19623c884c584e7b1baacf352bf7bf399330a212d90e32fff64da",
      logLevel: "trace",
      webAppOptions: {
        hostname: "127.0.0.1",
        port: 0,
      },
    };
    const webServiceConsortiumPlugin = new PluginWebServiceConsortium(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const cactusApiServerOptions: ICactusApiServerOptions = configService.newExampleConfig();
    cactusApiServerOptions.configFile = "";
    cactusApiServerOptions.apiCorsDomainCsv = "*";
    cactusApiServerOptions.apiPort = 0;
    cactusApiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(
      cactusApiServerOptions
    );

    pluginRegistry.add(webServiceConsortiumPlugin);

    const apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });
    assert.tearDown(() => apiServer.shutdown());

    // 5. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    // 6. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
    const httpServer = apiServer.getHttpServerApi();
    const addressInfo: any = httpServer?.address();
    log.debug(`AddressInfo: `, addressInfo);
    const CACTUS_API_HOST = `http://${addressInfo.address}:${addressInfo.port}`;

    const configuration = new Configuration({ basePath: CACTUS_API_HOST });
    const api = new DefaultApi(configuration);

    // 7. Issue an API call to the API server via the main SDK verifying that the SDK and the API server both work
    const healthcheckResponse: AxiosResponse<HealthCheckResponse> = await api.apiV1ApiServerHealthcheckGet();
    assert.ok(healthcheckResponse);
    assert.ok(healthcheckResponse.data);
    assert.ok(healthcheckResponse.data.success);
    assert.ok(healthcheckResponse.data.memoryUsage);
    assert.ok(healthcheckResponse.data.createdAt);

    // 8. Get the dedicated HTTP server of the web service plugin
    const httpServerConsortium: Server = webServiceConsortiumPlugin
      .getHttpServer()
      .orElseThrow(
        () => new Error("webServiceConsortiumPlugin HTTP server is not present")
      );
    assert.ok(httpServerConsortium, "Get the plugin specific HTTP server");
    const addressInfoConsortium: any = httpServerConsortium.address();
    assert.ok(
      addressInfoConsortium,
      "Get the plugin specific AddressInfo object"
    );
    assert.ok(
      addressInfoConsortium.port,
      "plugin specific web app address info has a port"
    );
    assert.ok(
      addressInfoConsortium.address,
      "plugin specific web app address info has an address (host)"
    );

    // 9. Verify that the web service plugin is on a different port for security isolation
    assert.ok(
      addressInfoConsortium.port !== addressInfo.port,
      "plugin specific and API server base port are different"
    );

    const CACTUS_API_HOST2 = `http://${addressInfoConsortium.address}:${addressInfoConsortium.port}`;
    const configuration2 = new ConfigurationPlugin({
      basePath: CACTUS_API_HOST2,
      baseOptions: { timeout: 2000 },
    });
    const api2 = new DefaultApiPlugin(configuration2);

    const consortium = {
      configurationEndpoint: "fake",
      id: "adsf",
      name: "asdf",
      cactusNodes: [{ host: "asdf", publicKey: "adsf" }],
    };
    const response: AxiosResponse = await api2.apiV1PluginsHyperledgerCactusPluginWebServiceConsortiumConsortiumPost(
      consortium
    );
    assert.ok(
      response,
      "expect a truthy response object from consortium POST endpoint"
    );
    assert.ok(response.status === 201, "expect HTTP status code to equal 201");

    assert.end();
  }
);
