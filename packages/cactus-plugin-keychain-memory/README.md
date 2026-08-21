# `@hyperledger-cacti/cactus-plugin-keychain-memory`

> In-memory keychain plugin for development and testing.

## Overview

This package implements the Cacti keychain plugin interfaces with a `Map`-backed
store. It supports direct plugin calls, OpenAPI web services, and ConnectRPC
services for setting, retrieving, checking, and deleting keychain entries.

The plugin stores values as plain text and provides no encryption or persistent
storage. Do not use it to hold production secrets.

**Target Audience:**

- [x] Developers
- [ ] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-keychain-memory
```

## Configuration

The `IPluginKeychainMemoryOptions` interface accepts the following options:

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `instanceId` | Yes | None | Unique identifier for this plugin instance. |
| `keychainId` | Yes | None | Logical identifier for the keychain. |
| `logLevel` | No | `"INFO"` | Plugin log level. |
| `backend` | No | New empty `Map` | Initial in-memory key-value store. |
| `prometheusExporter` | No | New exporter instance | Prometheus exporter used by the plugin. |
| `observabilityBufferSize` | No | `1` | Replay buffer size for keychain operation events. |
| `observabilityTtlSeconds` | No | `1` | Replay window for keychain operation events. |

## API Summary

The plugin implements `IPluginKeychain`, `IPluginWebService`, and
`IPluginCrpcService`. Its primary operations are:

- `set()` to store a value under a key
- `get()` to retrieve a value
- `has()` to check whether a key exists
- `delete()` to remove a key
- `getPrometheusMetricsV1()` to retrieve Prometheus metrics

The HTTP API is defined in the
[OpenAPI specification](./src/main/json/openapi.json). Generated TypeScript
Axios client code is available under
[`src/main/typescript/generated/openapi/typescript-axios/`](./src/main/typescript/generated/openapi/typescript-axios/).

## Usage

```typescript
import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";

const keychain = new PluginKeychainMemory({
  instanceId: "keychain-memory-instance",
  keychainId: "development-keychain",
  logLevel: "INFO",
});

await keychain.set("example-key", "example-value");

const value = await keychain.get("example-key");
const isPresent = await keychain.has("example-key");

await keychain.delete("example-key");
```

## Prometheus Exporter

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Keychain memory plugin.


### Usage
The prometheus exporter object is initialized in the `PluginKeychainMemory` class constructor itself, so instantiating the object of the `PluginKeychainMemory` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginKeychainMemoryOptions` interface for `PluginKeychainMemory` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total key count, which currently updates everytime a new key is added/removed from the list of total keys.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'keychain_memory_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-keychain-memory/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-keychain-memory/src/test/typescript/unit/plugin-keychain-memory.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-keychain-memory/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_keychain_memory_total_key_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.

## Testing

From the repository root, run the package tests with:

```sh
yarn test:jest:all packages/cactus-plugin-keychain-memory/src/test/typescript
```

The test suite covers the direct plugin API, generated API client, API surface,
and observability behavior.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE](../../LICENSE) file.
