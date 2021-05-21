# `@hyperledger/cactus-plugin-ledger-connector-corda` <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Usage](#usage)
  - [Custom Configuration via Env Variables](#custom-configuration-via-env-variables)
- [Building Docker Image Locally](#building-docker-image-locally)
- [Example NodeDiagnosticInfo JSON Response](#example-nodediagnosticinfo-json-response)
- [Monitoring](#monitoring)
  - [Usage Prometheus](#usage-prometheus)
  - [Prometheus Integration](#prometheus-integration)
  - [Helper code](#helper-code)
        - [response.type.ts](#responsetypets)
        - [data-fetcher.ts](#data-fetcherts)
        - [metrics.ts](#metricsts)

## Usage

Take a look at how the API client can be used to run transactions on a Corda ledger:
`packages/cactus-plugin-ledger-connector-corda/src/test/typescript/integration/jvm-kotlin-spring-server.test.ts`


### Custom Configuration via Env Variables

```json
{
  "cactus": {
    "corda": {
      "node": {
        "host": "localhost"
      },
      "rpc": {
        "port": 10006,
        "username": "user1",
        "password": "test"
      }
    }
  }
}
```

```sh
SPRING_APPLICATION_JSON='{"cactus":{"corda":{"node": {"host": "localhost"}, "rpc":{"port": 10006, "username":"user1", "password": "test"}}}}' gradle test
```

```json
{
  "flowFullClassName" : "net.corda.samples.example.flows.ExampleFlow${"$"}Initiator",
  "flowInvocationType" : "FLOW_DYNAMIC",
  "params" : [ {
    "jvmTypeKind" : "PRIMITIVE",
    "jvmType" : {
      "fqClassName" : "java.lang.Integer"
    },
    "primitiveValue" : 42,
    "jvmCtorArgs" : null
  }, {
    "jvmTypeKind" : "REFERENCE",
    "jvmType" : {
      "fqClassName" : "net.corda.core.identity.Party"
    },
    "primitiveValue" : null,
    "jvmCtorArgs" : [ {
      "jvmTypeKind" : "REFERENCE",
      "jvmType" : {
        "fqClassName" : "net.corda.core.identity.CordaX500Name"
      },
      "primitiveValue" : null,
      "jvmCtorArgs" : [ {
        "jvmTypeKind" : "PRIMITIVE",
        "jvmType" : {
          "fqClassName" : "java.lang.String"
        },
        "primitiveValue" : "PartyB",
        "jvmCtorArgs" : null
      }, {
        "jvmTypeKind" : "PRIMITIVE",
        "jvmType" : {
          "fqClassName" : "java.lang.String"
        },
        "primitiveValue" : "New York",
        "jvmCtorArgs" : null
      }, {
        "jvmTypeKind" : "PRIMITIVE",
        "jvmType" : {
          "fqClassName" : "java.lang.String"
        },
        "primitiveValue" : "US",
        "jvmCtorArgs" : null
      } ]
    }, {
      "jvmTypeKind" : "REFERENCE",
      "jvmType" : {
        "fqClassName" : "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl"
      },
      "primitiveValue" : null,
      "jvmCtorArgs" : [ {
        "jvmTypeKind" : "PRIMITIVE",
        "jvmType" : {
          "fqClassName" : "java.lang.String"
        },
        "primitiveValue" : "EdDSA",
        "jvmCtorArgs" : null
      }, {
        "jvmTypeKind" : "PRIMITIVE",
        "jvmType" : {
          "fqClassName" : "java.lang.String"
        },
        "primitiveValue" : "X.509",
        "jvmCtorArgs" : null
      }, {
        "jvmTypeKind" : "PRIMITIVE",
        "jvmType" : {
          "fqClassName" : "java.lang.String"
        },
        "primitiveValue" : "MCowBQYDK2VwAyEAoOv19eiCDJ7HzR9UrfwbFig7qcD1jkewKkkS4WF9kPA=",
        "jvmCtorArgs" : null
      } ]
    } ]
  } ],
  "timeoutMs" : null
}
```

```json
I 16:51:01 1 Client.main - nodeDiagnosticInfo=
{
  "version" : "4.6",
  "revision" : "85e387ea730d9be7d6dc2b23caba1ee18305af74",
  "platformVersion" : 8,
  "vendor" : "Corda Open Source",
  "cordapps" : [ {
    "type" : "Workflow CorDapp",
    "name" : "workflows-1.0",
    "shortName" : "Example-Cordapp Flows",
    "minimumPlatformVersion" : 8,
    "targetPlatformVersion" : 8,
    "version" : "1",
    "vendor" : "Corda Open Source",
    "licence" : "Apache License, Version 2.0",
    "jarHash" : {
      "offset" : 0,
      "size" : 32,
      "bytes" : "V7ssTw0etgg3nSGk1amArB+fBH8fQUyBwIFs0DhID+0="
    }
  }, {
    "type" : "Contract CorDapp",
    "name" : "contracts-1.0",
    "shortName" : "Example-Cordapp Contracts",
    "minimumPlatformVersion" : 8,
    "targetPlatformVersion" : 8,
    "version" : "1",
    "vendor" : "Corda Open Source",
    "licence" : "Apache License, Version 2.0",
    "jarHash" : {
      "offset" : 0,
      "size" : 32,
      "bytes" : "Xe0eoh4+T6fsq4u0QKqkVsVDMYSWhuspHqE0wlOlyqU="
    }
  } ]
}
```

## Building Docker Image Locally

The `cccs` tag used in the below example commands is a shorthand for the
full name of the container image otherwise referred to as `cactus-corda-connector-server`.

From the project root:

```sh
DOCKER_BUILDKIT=1 docker build ./packages/cactus-plugin-ledger-connector-corda/src/main-server/ -t cccs
```

## Example NodeDiagnosticInfo JSON Response

```json
{
  "version": "4.6",
  "revision": "85e387ea730d9be7d6dc2b23caba1ee18305af74",
  "platformVersion": 8,
  "vendor": "Corda Open Source",
  "cordapps": [
    {
      "type": "Workflow CorDapp",
      "name": "workflows-1.0",
      "shortName": "Obligation Flows",
      "minimumPlatformVersion": 8,
      "targetPlatformVersion": 8,
      "version": "1",
      "vendor": "Corda Open Source",
      "licence": "Apache License, Version 2.0",
      "jarHash": {
        "bytes": "Vf9MllnrC7vrWxrlDE94OzPMZW7At1HhTETL/XjiAmc=",
        "offset": 0,
        "size": 32
      }
    },
    {
      "type": "CorDapp",
      "name": "corda-confidential-identities-4.6",
      "shortName": "corda-confidential-identities-4.6",
      "minimumPlatformVersion": 1,
      "targetPlatformVersion": 1,
      "version": "Unknown",
      "vendor": "Unknown",
      "licence": "Unknown",
      "jarHash": {
        "bytes": "nqBwqHJMbLW80hmRbKEYk0eAknFiX8N40LKuGsD0bPo=",
        "offset": 0,
        "size": 32
      }
    },
    {
      "type": "Contract CorDapp",
      "name": "corda-finance-contracts-4.6",
      "shortName": "Corda Finance Demo",
      "minimumPlatformVersion": 1,
      "targetPlatformVersion": 8,
      "version": "1",
      "vendor": "R3",
      "licence": "Open Source (Apache 2)",
      "jarHash": {
        "bytes": "a43Q/GJG6JKTZzq3U80P8L1DWWcB/D+Pl5uitEtAeQQ=",
        "offset": 0,
        "size": 32
      }
    },
    {
      "type": "Workflow CorDapp",
      "name": "corda-finance-workflows-4.6",
      "shortName": "Corda Finance Demo",
      "minimumPlatformVersion": 1,
      "targetPlatformVersion": 8,
      "version": "1",
      "vendor": "R3",
      "licence": "Open Source (Apache 2)",
      "jarHash": {
        "bytes": "wXdD4Iy50RaWzPp7n9s1xwf4K4MB8eA1nmhPquTMvxg=",
        "offset": 0,
        "size": 32
      }
    },
    {
      "type": "Contract CorDapp",
      "name": "contracts-1.0",
      "shortName": "Obligation Contracts",
      "minimumPlatformVersion": 8,
      "targetPlatformVersion": 8,
      "version": "1",
      "vendor": "Corda Open Source",
      "licence": "Apache License, Version 2.0",
      "jarHash": {
        "bytes": "grTZzN71Cpxw6rZe/U5SB6/ehl99B6VQ1+ZJEx1rixs=",
        "offset": 0,
        "size": 32
      }
    }
  ]
}
```

## Monitoring

### Usage Prometheus
The prometheus exporter object is initialized in the `PluginLedgerConnectorCorda` class constructor itself, so instantiating the object of the `PluginLedgerConnectorCorda` class, gives access to the exporter object.
You can also initialize the prometheus exporter object seperately and then pass it to the `IPluginLedgerConnectorCordaOptions` interface for `PluginLedgerConnectoCorda` constructor.

`getPrometheusExporterMetricsEndpointV1` function returns the prometheus exporter metrics, currently displaying the total transaction count, which currently increments everytime the `transact()` method of the `PluginLedgerConnectorCorda` class is called.

### Prometheus Integration
To use Prometheus with this exporter make sure to install [Prometheus main component](https://prometheus.io/download/).
Once Prometheus is setup, the corresponding scrape_config needs to be added to the prometheus.yml

```(yaml)
- job_name: 'corda_ledger_connector_exporter'
  metrics_path: api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. The test cases (For example, packages/cactus-plugin-ledger-connector-corda/src/test/typescript/integration/deploy-cordapp-jars-to-nodes.test.ts) exposes it over `0.0.0.0` and a random port(). The random port can be found in the running logs of the test case and looks like (42379 in the below mentioned URL)
`Metrics URL: http://0.0.0.0:42379/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_corda_total_tx_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.
