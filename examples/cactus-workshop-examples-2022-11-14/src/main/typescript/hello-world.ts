// WARNING: This code IS NOT production-ready nor secure! Namely, cross-site scripting is possible if user input is not sanitized.
import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import {
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

const log: Logger = LoggerProvider.getOrCreate({
  label: "cacti-node-ipfs-example",
  level: "info",
});

const main = async () => {
  // start an IPFS network (a key-value store) for demonstration purposes
  const ipfsNetwork = new GoIpfsTestContainer({});
  await ipfsNetwork.start();

  // retrieve the url so that the IPFS connector plugin is
  // able to connect to the IPFS network. This will be used
  // as an argument for the plugin bellow
  const { create } = await import("kubo-rpc-client");
  const ipfsClientOrOptions = create({
    url: await ipfsNetwork.getApiUrl(),
  });

  //Configuring APIServer
  const configService = new ConfigService();
  const apiServerOptions: any = await configService.newExampleConfig();
  apiServerOptions.configFile = "";
  apiServerOptions.authorizationProtocol = "NONE";

  //The port where the APIServer will be listening
  apiServerOptions.apiPort = 3001;
  apiServerOptions.cockpitPort = 3100;
  apiServerOptions.grpcPort = 5000;
  apiServerOptions.apiTlsEnabled = false; //Disable TLS (or provide TLS certs for secure HTTP if you are deploying to production)
  apiServerOptions.plugins = [
    //add plugins that will be exposed by the API Server
    {
      packageName: "@hyperledger/cactus-plugin-object-store-ipfs",
      type: PluginImportType.Remote,
      action: PluginImportAction.Install,
      options: {
        parentDir: `/${uuidv4()}/${uuidv4()}/`,
        logLevel: "DEBUG",
        instanceId: uuidv4(),
        ipfsClientOrOptions,
      },
    },
  ];

  const config = await configService.newExampleConfigConvict(apiServerOptions);

  const apiServer = new ApiServer({
    httpServerApi: createServer(),
    config: config.getProperties(),
  });

  //Starting the Cacti APIServer
  apiServer.start();
};

export async function launchApp(): Promise<void> {
  try {
    await main();
    log.info(`Cacti Hello World example ran OK `);
  } catch (ex) {
    log.error(`Cacti Hello World example crashed: `, ex);
    process.exit(1);
  }
}

if (require.main === module) {
  launchApp();
}
