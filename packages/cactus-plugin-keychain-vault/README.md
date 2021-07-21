# `@hyperledger/cactus-plugin-keychain-vault`

## Prometheus Exporter

This class creates a prometheus exporter, which scrapes the transactions (total transaction count) for the use cases incorporating the use of Keychain vault plugin.


### Usage
The prometheus exporter object is initialized in the `PluginKeychainVault` class constructor itself, so instantiating the object of the `PluginKeychainVault` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginKeychainVaultOptions` interface for `PluginKeychainVault` constructor.

`getPrometheusMetricsV1` function returns the prometheus exporter metrics, currently displaying the total key count, which currently increments everytime the `set()` and `delete()` method of the `PluginKeychainVault` class is called.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'keychain_vault_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-keychain-vault/src/test/typescript/integration/plugin-keychain-vault.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-keychain-plugin/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_keychain_vault_total_key_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.
