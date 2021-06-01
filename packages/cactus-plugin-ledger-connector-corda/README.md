# `@hyperledger/cactus-plugin-ledger-connector-corda` <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Summary](#summary)
- [Concepts](#concepts)
  - [Contract Invocation JSON DSL](#contract-invocation-json-dsl)
  - [Expressing Primitive vs Reference Types with the DLS](#expressing-primitive-vs-reference-types-with-the-dls)
  - [Flow Invocation Types](#flow-invocation-types)
- [Usage](#usage)
  - [Invoke Contract (flow) with no parameters](#invoke-contract-flow-with-no-parameters)
  - [Invoke Contract (flow) with a single integer parameter](#invoke-contract-flow-with-a-single-integer-parameter)
  - [Invoke Contract (flow) with a custom class parameter](#invoke-contract-flow-with-a-custom-class-parameter)
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

## Summary

The Corda connector is written in Kotlin and ships as a Spring Boot JVM application
that accepts API requests and translates those into Corda RPC calls.

Deploying the Corda connector therefore involves also deploying the mentioned JVM
application **in addition** to deploying the Cactus API server with the desired
plugins configured.

## Concepts

### Contract Invocation JSON DSL

One of our core design principles for Hyperledger Cactus is to have low impact
deployments meaning that changes to the ledgers themselves should be kept to a
minimum or preferably have no need for any at all. With this in mind, we had to
solve the challenge of providing users with the ability to invoke Corda flows
as dynamically as possible within the confines of the strongly typed JVM contrasted
with the weakly typed Javascript language runtime of NodeJS.

Corda might release some convenience features to ease this in the future, but
in the meantime we have the *Contract Invocation JSON DSL* which allows developers
to specify truly arbitrary JVM types as part of their contract invocation arguments
even if otherwise these types would not be possible to serialize or deserialize
with traditional tooling such as the excellent
[Jackson JSON Java library](https://github.com/FasterXML/jackson) or similar ones.

### Expressing Primitive vs Reference Types with the DLS

The features of the DSL include expressing whether a contract invocation parameter
is a reference or a primitive JVM data types.
This is a language feature that Javascript has as well to some extent, but for
those in need of a refresher, here's a writeup from a well known Q/A website that
I found on the internet: [What's the difference between primitive and reference types?
](https://stackoverflow.com/a/32049775/698470)

To keep it simple, the following types are primitive data types in the
Java Virtual Machine (JVM) and everything else not included in the list below
can be safely considered a reference type:
- boolean
- byte
- short
- char
- int
- long
- float
- double

If you'd like to further clarify how this works and feel like an exciting adventure
then we recommend that you dive into the source code of the
[deserializer implementation of the JSON DSL](https://github.com/hyperledger/cactus/blob/main/packages/cactus-plugin-ledger-connector-corda/src/main-server/kotlin/gen/kotlin-spring/src/main/kotlin/org/hyperledger/cactus/plugin/ledger/connector/corda/server/impl/JsonJvmObjectDeserializer.kt) and take a look at the following points of interest
in the code located there:
- `val exoticTypes: Map<String, Class<*>>`
- `fun instantiate(jvmObject: JvmObject)`

### Flow Invocation Types

Can be **dynamic** or **tracked dynamic** and the corresponding enum values
are defined as:

```typescript
/**
 * Determines which flow starting method will be used on the back-end when invoking the flow. Based on the value here the plugin back-end might invoke the rpc.startFlowDynamic() method or the rpc.startTrackedFlowDynamic() method. Streamed responses are aggregated and returned in a single response to HTTP callers who are not equipped to handle streams like WebSocket/gRPC/etc. do.
 * @export
 * @enum {string}
 */
export enum FlowInvocationType {
    TRACKEDFLOWDYNAMIC = 'TRACKED_FLOW_DYNAMIC',
    FLOWDYNAMIC = 'FLOW_DYNAMIC'
}
```

[Official Corda Java Docs - startFlowDynamic()](https://api.corda.net/api/corda-os/4.7/html/api/kotlin/corda/net.corda.core.messaging/-corda-r-p-c-ops/start-flow-dynamic.html)

[Official Corda Java Docs - startTrackedFlowDynamic()](https://api.corda.net/api/corda-os/4.7/html/api/kotlin/corda/net.corda.core.messaging/-corda-r-p-c-ops/start-tracked-flow-dynamic.html)


## Usage

Take a look at how the API client can be used to run transactions on a Corda ledger:
`packages/cactus-plugin-ledger-connector-corda/src/test/typescript/integration/jvm-kotlin-spring-server.test.ts`


### Invoke Contract (flow) with no parameters

Below, we'll demonstrate invoking a simple contract with no parameters.

**The contract source:**

```java
package com.example.organization.samples.application.flows;

class SomeCoolFlow {
  // constructor with no arguments
  public SomeCoolFlow() {
    this.doSomething();
  }

  public doSomething(): void {
    throw new RuntimeException("Method not implemented.");
  }
}
```

**Steps to build your request:**

1. Find out the fully qualified class name of your contract (flow) and set this as the value for the request parameter `flowFullClassName`
2. Decide on your flow invocation type which largely comes down to answering the question of: Does your invocation follow a request/response pattern or more like a channel subscription where multiple updates at different times are streamed to the client in response to the invocation request? In our example we assume the simpler request/response communication pattern and therefore will set the `flowInvocationType` to `FlowInvocationType.FLOWDYNAMIC`
3. Invoke the flow via the API client with the `params` argument being specified as an empty array `[]`
    ```typescript
    import { DefaultApi as CordaApi } from "@hyperledger/cactus-plugin-ledger-connector-corda";
    import { FlowInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-corda";

    const apiUrl = "your-cactus-host.example.com"; // don't forget to specify the port if applicable
    const apiClient = new CordaApi({ basePath: apiUrl });

    const res = await apiClient.invokeContractV1({
      flowFullClassName: "com.example.organization.samples.application.flows.SomeCoolFlow",
      flowInvocationType: FlowInvocationType.FLOWDYNAMIC,
      params: [],
      timeoutMs: 60000,
    });
    ```

### Invoke Contract (flow) with a single integer parameter

Below, we'll demonstrate invoking a simple contract with a single numeric parameter.

**The contract source:**

```java
package com.example.organization.samples.application.flows;

class SomeCoolFlow {
  // constructor with a primitive type long argument
  public SomeCoolFlow(long myParameterThatIsLong) {
    // do something with the parameter here
  }
}
```

**Steps to build your request:**

1. Find out the fully qualified class name of your contract (flow) and set this as the value for the request parameter `flowFullClassName`
2. Decide on your flow invocation type. More details at [Invoke Contract (flow) with no parameters](#invoke-contract-flow-with-no-parameters)
3. Find out what is the fully qualified class name of the parameter you wish to pass in. You can do this be inspecting the sources of the contract itself. If you do not have access to those sources, then the documentation of the contract should have answers or the person who authored said contract. In our case here the fully qualified class name for the number parameter is simply `long` because it is a primitive data type and as such these can be referred to in their short form, but the fully qualified version also works such as: `java.lang.Long`.
When in doubt about these, you can always consult the [official java.lang.Long Java Docs](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/Long.html)
After having determined the above, you can construct your first `JvmObject` JSON object as follows in order to pass in the number `42` as the first and only parameter for our flow invocation:
    ```json
    params: [
      {
        jvmTypeKind: JvmTypeKind.PRIMITIVE,
        jvmType: {
          fqClassName: "long",
        },
        primitiveValue: 42,
      }
    ]
    ```
1. Invoke the flow via the API client with the `params` populated as explained above:
    ```typescript
    import { DefaultApi as CordaApi } from "@hyperledger/cactus-plugin-ledger-connector-corda";
    import { FlowInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-corda";

    // don't forget to specify the port if applicable
    const apiUrl = "your-cactus-host.example.com";
    const apiClient = new CordaApi({ basePath: apiUrl });

    const res = await apiClient.invokeContractV1({
      flowFullClassName: "com.example.organization.samples.application.flows.SomeCoolFlow",
      flowInvocationType: FlowInvocationType.FLOWDYNAMIC,
      params: [
        {
          jvmTypeKind: JvmTypeKind.PRIMITIVE,
          jvmType: {
            fqClassName: "long",
          },
          primitiveValue: 42,
        }
      ],
      timeoutMs: 60000,
    });
    ```

### Invoke Contract (flow) with a custom class parameter

Below, we'll demonstrate invoking a contract with a single class instance parameter.

**The contract sources:**

```java
package com.example.organization.samples.application.flows;

// contract with a class instance parameter
class BuildSpaceshipFlow {
  public BuildSpaceshipFlow(SpaceshipInfo buildSpecs) {
    // build spaceship as per the specs
  }
}
```

```java
package com.example.organization.samples.application.flows;

// The type that the contract accepts as an input parameter
class SpaceshipInfo {
  public SpaceshipInfo(String name, Integer seatsForHumans) {
  }
}
```

**Assembling and Sending your request:**

Invoke the flow via the API client with the `params` populated as shown below.

Key thing notice here is that we now have a class instance as a parameter for our contract (flow) invocation so we have to describe how this class instance itself will be instantiated by providing a nested array of parameters via the `jvmCtorArgs` which stands for Java Virtual Machine Constructor Arguments meaning that elements of this array will be passed in dynamically (via Reflection) to the class constructor.

**Java Equivalent**

```java
cordaRpcClient.startFlowDynamic(
  BuildSpaceshipFlow.class,
  new SpaceshipInfo(
    "The last spaceship you'll ever need.",
    10000000
  )
);
```

**Cactus Invocation JSON DLS Equivalent to the Above Java Snippet**

```typescript
import { DefaultApi as CordaApi } from "@hyperledger/cactus-plugin-ledger-connector-corda";
import { FlowInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-corda";

// don't forget to specify the port if applicable
const apiUrl = "your-cactus-host.example.com";
const apiClient = new CordaApi({ basePath: apiUrl });

const res = await apiClient.invokeContractV1({
  flowFullClassName: "com.example.organization.samples.application.flows.BuildSpaceshipFlow",
  flowInvocationType: FlowInvocationType.FLOWDYNAMIC,
  params: [
    {
      jvmTypeKind: JvmTypeKind.REFERENCE,
        jvmType: {
        fqClassName: "com.example.organization.samples.application.flows.SpaceshipInfo",
      },

      jvmCtorArgs: [
        {
          jvmTypeKind: JvmTypeKind.PRIMITIVE,
          jvmType: {
            fqClassName: "java.lang.String",
          },
          primitiveValue: "The last spaceship you'll ever need.",
        },
        {
          jvmTypeKind: JvmTypeKind.PRIMITIVE,
          jvmType: {
            fqClassName: "java.lang.Long",
          },
          primitiveValue: 10000000000,
        },
      ],
    }
  ],
  timeoutMs: 60000,
});
```

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
