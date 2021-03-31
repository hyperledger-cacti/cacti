# `@hyperledger/cactus-cmd-api-server` <!-- omit in toc -->

- [Summary](#summary)
- [Usage](#usage)
  - [Basic Example](#basic-example)
  - [Remote Plugin Imports at Runtime Example](#remote-plugin-imports-at-runtime-example)
  - [Complete Example](#complete-example)
- [Deployment Scenarios](#deployment-scenarios)
  - [Production Deployment Example](#production-deployment-example)
  - [Low Resource Deployment Example](#low-resource-deployment-example)
- [Prometheus Exporter](#prometheus-exporter)
  - [Usage Prometheus](#usage-prometheus)
  - [Prometheus Integration](#prometheus-integration)
  - [Helper Code](#helper-code)
- [FAQ](#faq)
  - [What is the difference between a Cactus Node and a Cactus API Server?](#what-is-the-difference-between-a-cactus-node-and-a-cactus-api-server)
  - [Is the API server horizontally scalable?](#is-the-api-server-horizontally-scalable)
  - [Does the API server automatically protect me from malicious plugins?](#does-the-api-server-automatically-protect-me-from-malicious-plugins)
  - [Can I use the API server with plugins deployed as a service?](#can-i-use-the-api-server-with-plugins-deployed-as-a-service)

## Summary

This package is part of the Hyperledger Cactus blockchain integration framework
and is used as a shell/container of sort for housing different Cactus plugins
(which all live in their own npm packages as well).

The API server gives you for free the following benefits, should you choose to
use it:
1. Automatic wiring of API endpoints for Cactus plugins which implement the `IPluginWebService` Typescript interface
2. Lightweight inversion of control container provided to plugins in the form of the `PluginRegistry` so that plugins can depend on each other in a way that each plugin instance can be uniquely identified and obtained by other plugins. A great example of this in action is ledger connector plugins frequently using the `PluginRegistry` to look up instances of keychain plugins to get access to secrets that are needed for the connector plugins to accomplish certain tasks such as cryptographically signing some information or SSH-ing into a server instance in order to upload and deploy binary (or otherwise) artifacts of smart contracts.

## Usage

Like with most parts of the framework in Cactus, using the `ApiServer` is optional.

To see the `ApiServer` in action, the end to end tests of the framework are a great
place to start.
A few excerpts that regularly occur in said tests can be seen below as well for
the reader's convenience.

One of our design principles for the framework is **secure by default** which
means that the API servers
1. assumes TLS is enabled by default and
2. cross-origin resource sharing is disabled completely

### Basic Example

```typescript
#!/usr/bin/env node

import { ApiServer } from "../api-server";
import { ConfigService } from "../config/config-service";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

const log: Logger = LoggerProvider.getOrCreate({
  label: "cactus-api",
  level: "INFO",
});

const main = async () => {
  const configService = new ConfigService();
  const config = configService.getOrCreate();
  const serverOptions = config.getProperties();

  LoggerProvider.setLogLevel(serverOptions.logLevel);

  if (process.argv[2].includes("help")) {
    const helpText = ConfigService.getHelpText();
    console.log(helpText);
    log.info(`Effective Configuration:`);
    log.info(JSON.stringify(serverOptions, null, 4));
  } else {
    const apiServer = new ApiServer({ config: serverOptions });
    await apiServer.start();
  }
};

export async function launchApp(): Promise<void> {
  try {
    await main();
    log.info(`Cactus API server launched OK `);
  } catch (ex) {
    log.error(`Cactus API server crashed: `, ex);
    process.exit(1);
  }
}

if (require.main === module) {
  launchApp();
}

```

### Remote Plugin Imports at Runtime Example

```typescript
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

const main = async () => {

  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  // If there is no configuration file on the file system, just set it to empty string
  apiServerOptions.configFile = "";
  // Enable CORS for
  apiServerOptions.apiCorsDomainCsv = "your.domain.example.com";
  apiServerOptions.apiPort = 3000;
  apiServerOptions.cockpitPort = 3100;
  // Disble TLS (or provide TLS certs for secure HTTP if you are deploying to production)
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.plugins = [
    {
      // npm package name of the plugin you are installing
      // Since this will be imported at runtime, you are responsible for
      // installing the package yourself prior to launching the API server.
      packageName: "@hyperledger/cactus-plugin-keychain-vault",
      // The REMOTE value means that a different plugin factory will be imported and
      // called to obtain the plugin instance. This way plugins can support them
      // being imported by the API server regardless of the language the plugin
      // was written in.
      type: PluginImportType.REMOTE,
      // The options that will be passed in to the plugin factory
      options: {
        keychainId: "_keychainId_",
        instanceId: "_instanceId_",
        remoteConfig: configuration,
      },
    },
  ];
  const config = configService.newExampleConfigConvict(apiServerOptions);

  const apiServer = new ApiServer({
    config: config.getProperties(),
  });

  // start the API server here and you are ready to roll
};

export async function launchApp(): Promise<void> {
  try {
    await main();
    log.info(`Cactus API server launched OK `);
  } catch (ex) {
    log.error(`Cactus API server crashed: `, ex);
    process.exit(1);
  }
}

if (require.main === module) {
  launchApp();
}

```

### Complete Example

For a complete example of how to use the API server, read all the code of the
supply chain exmaple's backend package:

https://github.com/hyperledger/cactus/tree/main/examples/cactus-example-supply-chain-backend/src/main/typescript

## Deployment Scenarios

There's a set of building blocks (members, nodes, API server processes, plugin instances) that you can use when defining (founding) a consortium and these building blocks relate to each other in a way that can be expressed with an entity relationship diagram which can be seen below.
The composability rules can be deducted from how the diagram elements (entities) are connected (related) to each other, e.g. the API server process can have any number of plugin instances in it and a node can contain any number of API server processes, and so on until the top level construct is reached: the consortium.

> Consortium management does not relate to achieving consensus on data/transactions involving individual ledgers, merely about consensus on the metadata of a consortium.

![deployment-entity-relationship-diagram.png](https://github.com/hyperledger/cactus/raw/4a337be719a9d2e2ccb877edccd7849f4be477ec/whitepaper/deployment-entity-relationship-diagram.png)

Now, with these composability rules in mind, let us demonstrate a few different deployment scenarios (both expected and exotic ones) to showcase the framework's flexibility in this regard.

### Production Deployment Example

Many different configurations are possible here as well.
One way to have two members form a consortium and both of those members provide highly available, high throughput services is to have a deployment as shown on the below figure.
What is important to note here is that this consortium has 2 nodes, 1 for each member
and it is irrelevant how many API servers those nodes have internally because they
all respond to requests through the network host/web domain that is tied to the
node.
One could say that API servers do not have a distinguishable identity relative to
their peer API servers, only the higher-level nodes do.

![deployment-production-example.png](https://github.com/hyperledger/cactus/raw/4a337be719a9d2e2ccb877edccd7849f4be477ec/whitepaper/deployment-production-example.png)

### Low Resource Deployment Example

This is an example to showcase how you can pull up a full consortium even from
within a single operating system process (API server) with multiple members and
their respective nodes. It is not something that's recommended for a production
grade environment, ever, but it is great for demos and integration tests where
you have to simulate a fully functioning consortium with as little hardware footprint
as possible to save on time and cost.

The individual nodes/API servers are isolated by listening on seperate TCP ports
of the machine they are hosted on:

![deployment-low-resource-example.png](https://github.com/hyperledger/cactus/raw/4a337be719a9d2e2ccb877edccd7849f4be477ec/whitepaper/deployment-low-resource-example.png)

## Prometheus Exporter
This class creates a prometheus exporter, which scrapes the total Cactus node count.

### Usage Prometheus
The prometheus exporter object is initialized in the `ApiServer` class constructor itself, so instantiating the object of the `ApiServer` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IApiServerConstructorOptions` interface for `ApiServer` constructor.

`getPrometheusExporterMetricsV1` function returns the prometheus exporter metrics, currently displaying the total plugins imported, which currently refreshes to match the plugin count, everytime `setTotalPluginImports` method is called.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'consortium_manual_exporter'
  metrics_path: /api/v1/api-server/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-consortium-manual/src/test/typescript/unit/consortium/get-node-jws-endpoint-v1.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/api-server/get-prometheus-exporter-metrics/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_api_server_total_plugin_imports** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points.

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.





## FAQ

### What is the difference between a Cactus Node and a Cactus API Server?

The node is what has an identity within your PKI and can be made up of 1-N API
server instances that all share the same configuration/identity of the node.
See deployment scenarios above for a much more detailed explanation.

### Is the API server horizontally scalable?

**Yes, 100%.**
Keep in mind though that the API server can be loaded up with arbitrary plugins
meaning that if you write a plugin that has a central database that can only
do 1 transaction per second, then it will not help you much that the API server
itself is horizontally scalable because deploying a thousand instances of the
API server will just result in you having a thousand instances of your plugin
all waiting for that underlying database with its 1 TPS throughput hogging your
system.
When we say that the API server is horizontally scalable, we mean that the API
server itself is designed not to have any such state mentioned in the example
above.
You are responsible for only deploying plugins in the API server that are
horizontally scalable as well. In short, your whole system is only horizontally
scalable if all components of it are horizontally scalable.

### Does the API server automatically protect me from malicious plugins?

**No.** If you install a third-party plugin that wasn't vetted by anyone and that
plugin happens to have malicious code in it to steal your private keys, it can
do so.
You are responsible for making sure that the plugins you install have no known
security vulnerabilities or backdoors e.g. they are considered "secure".
The double quotes around "secure" is meant to signify the fact that no software
is ever really truly secure, just merely lacking of known vulnerabilities at
any given point in time.

### Can I use the API server with plugins deployed as a service?

**Yes.** You can deploy your plugin written in any language, anywhere as long
as it is accessible over the network and does come with a Typescript API client
that you can use to install into the API server as a proxy for an in-process
plugin implementation.
