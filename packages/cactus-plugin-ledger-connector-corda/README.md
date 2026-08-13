# `@hyperledger-cacti/cactus-plugin-ledger-connector-corda` <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Concepts](#concepts)
  - [Contract Invocation JSON DSL](#contract-invocation-json-dsl)
  - [Expressing Primitive vs Reference Types with the DSL](#expressing-primitive-vs-reference-types-with-the-dsl)
  - [Flow Invocation Types](#flow-invocation-types)
- [Usage](#usage)
  - [Invoke Contract (flow) with no parameters](#invoke-contract-flow-with-no-parameters)
  - [Invoke Contract (flow) with a single integer parameter](#invoke-contract-flow-with-a-single-integer-parameter)
  - [Invoke Contract (flow) with a custom class parameter](#invoke-contract-flow-with-a-custom-class-parameter)
  - [Vault Queries](#vault-queries)
  - [Transaction Monitoring](#transaction-monitoring)
    - [watchBlocksV1](#watchblocksv1)
    - [Low-level HTTP API](#low-level-http-api)
  - [Custom Configuration via Env Variables](#custom-configuration-via-env-variables)
- [Testing Environment for Manual Tests via Docker Compose](#testing-environment-for-manual-tests-via-docker-compose)
- [Building Docker Image Locally](#building-docker-image-locally)
- [Scan The Locally Built Container Image for Vulnerabilities with Trivy](#scan-the-locally-built-container-image-for-vulnerabilities-with-trivy)
- [Scan The Locally Built .jar File For Vulnerabilities with Trivy](#scan-the-locally-built-jar-file-for-vulnerabilities-with-trivy)
- [Example NodeDiagnosticInfo JSON Response](#example-nodediagnosticinfo-json-response)
- [Monitoring](#monitoring)
  - [Usage Prometheus](#usage-prometheus)
  - [Prometheus Integration](#prometheus-integration)
  - [Helper code](#helper-code)
        - [response.type.ts](#responsetypets)
        - [data-fetcher.ts](#data-fetcherts)
        - [metrics.ts](#metricsts)

## Overview

The Corda connector is written in Kotlin and ships as a Spring Boot JVM application
that accepts API requests and translates those into Corda RPC calls.

Deploying the Corda connector therefore involves also deploying the mentioned JVM
application **in addition** to deploying the Cactus API server with the desired
plugins configured.

**Target Audience:**
- [x] Developers
- [x] Operators

The API surface is documented in the [OpenAPI specification](./src/main/json/openapi.json). A generated TypeScript Axios client is available at [src/main/typescript/generated/openapi/typescript-axios/](./src/main/typescript/generated/openapi/typescript-axios/).

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-ledger-connector-corda
```

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

### Expressing Primitive vs Reference Types with the DSL

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
[deserializer implementation of the JSON DSL](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-ledger-connector-corda/src/main-server/kotlin/gen/kotlin-spring/src/main/kotlin/org/hyperledger/cactus/plugin/ledger/connector/corda/server/impl/JsonJvmObjectDeserializer.kt) and take a look at the following points of interest
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
    import { DefaultApi as CordaApi } from "@hyperledger-cacti/cactus-plugin-ledger-connector-corda";
    import { FlowInvocationType } from "@hyperledger-cacti/cactus-plugin-ledger-connector-corda";

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
    import { DefaultApi as CordaApi } from "@hyperledger-cacti/cactus-plugin-ledger-connector-corda";
    import { FlowInvocationType } from "@hyperledger-cacti/cactus-plugin-ledger-connector-corda";

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

**Cactus Invocation JSON DSL Equivalent to the Above Java Snippet**

```typescript
import { DefaultApi as CordaApi } from "@hyperledger-cacti/cactus-plugin-ledger-connector-corda";
import { FlowInvocationType } from "@hyperledger-cacti/cactus-plugin-ledger-connector-corda";

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

### Vault Queries

1. Run manual test infrastructure:
  ```sh
  docker compose \
    --project-directory=./ \
    --file=./packages/cactus-plugin-ledger-connector-corda/src/test/yaml/fixtures/docker-compose.yaml \
    up \
    --build connector
  ```
2. Deploy contract:
  ```sh
curl --location 'http://127.0.0.1:8080/api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/deploy-contract-jars' \
--header 'Content-Type: application/json' \
--data '{
  "jarFiles": [
    {
      "contentBase64": "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AAAAAAQAAAAAAAAAAAAAAAAAiwoAAG5ldC9QSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAACgAAAAAAAAAAAAAAAAC/CgAAbmV0L2NvcmRhL1BLAQIUABQACAgIAAAAQQAAAAAAAgAAAAAAAAASAAAAAAAAAAAAAAAAAPkKAABuZXQvY29yZGEvc2FtcGxlcy9QSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAAGgAAAAAAAAAAAAAAAAA7CwAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9QSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAAIAAAAAAAAAAAAAAAAACFCwAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9mbG93cy9QSwECFAAUAAgICAAAAEEAsmSB+18HAABOEAAAVQAAAAAAAAAAAAAAAADVCwAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9mbG93cy9FeGFtcGxlRmxvdyRBY2NlcHRvciRjYWxsJHNpZ25UcmFuc2FjdGlvbkZsb3ckMS5jbGFzc1BLAQIUABQACAgIAAAAQQA4FOQMigQAAGgKAAA6AAAAAAAAAAAAAAAAALcTAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEFjY2VwdG9yLmNsYXNzUEsBAhQAFAAICAgAAABBAOsPTQgaAwAATAYAAFwAAAAAAAAAAAAAAAAAqRgAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvZmxvd3MvRXhhbXBsZUZsb3ckSW5pdGlhdG9yJENvbXBhbmlvbiRGSU5BTElTSU5HX1RSQU5TQUNUSU9OLmNsYXNzUEsBAhQAFAAICAgAAABBACfSq9oHAwAAQQYAAFQAAAAAAAAAAAAAAAAATRwAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvZmxvd3MvRXhhbXBsZUZsb3ckSW5pdGlhdG9yJENvbXBhbmlvbiRHQVRIRVJJTkdfU0lHUy5jbGFzc1BLAQIUABQACAgIAAAAQQCDbfUscgIAAIAEAABcAAAAAAAAAAAAAAAAANYfAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvciRDb21wYW5pb24kR0VORVJBVElOR19UUkFOU0FDVElPTi5jbGFzc1BLAQIUABQACAgIAAAAQQBkkcwlcQIAAHgEAABZAAAAAAAAAAAAAAAAANIiAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvciRDb21wYW5pb24kU0lHTklOR19UUkFOU0FDVElPTi5jbGFzc1BLAQIUABQACAgIAAAAQQDMCoCIZwIAAHQEAABbAAAAAAAAAAAAAAAAAMolAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvciRDb21wYW5pb24kVkVSSUZZSU5HX1RSQU5TQUNUSU9OLmNsYXNzUEsBAhQAFAAICAgAAABBAMWpmhjUAwAAGAoAAEUAAAAAAAAAAAAAAAAAuigAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvZmxvd3MvRXhhbXBsZUZsb3ckSW5pdGlhdG9yJENvbXBhbmlvbi5jbGFzc1BLAQIUABQACAgIAAAAQQByb0yuqwwAADQgAAA7AAAAAAAAAAAAAAAAAAEtAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvci5jbGFzc1BLAQIUABQACAgIAAAAQQC2WOa6/QEAADoDAAAxAAAAAAAAAAAAAAAAABU6AABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93LmNsYXNzUEsBAhQAFAAICAgAAABBAJueFadGAwAAbggAAAoAAAAAAAAAAAAAAAAAcTwAAGxvZzRqMi54bWxQSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAACgAAAAAAAAAAAAAAAADvPwAAbWlncmF0aW9uL1BLAQIUABQACAgIAAAAQQCPxkIS5QAAAGUCAAAiAAAAAAAAAAAAAAAAAClAAABtaWdyYXRpb24vaW91LmNoYW5nZWxvZy1tYXN0ZXIueG1sUEsBAhQAFAAICAgAAABBAN65XiljAQAADAQAAB4AAAAAAAAAAAAAAAAAXkEAAG1pZ3JhdGlvbi9pb3UuY2hhbmdlbG9nLXYxLnhtbFBLBQYAAAAAGAAYAGMIAAANQwAAAAA=",
      "filename": "BASIC_CORDAPP_workflows-1.0.jar",
      "hasDbMigrations": true
    }
  ],
  "cordappDeploymentConfigs": [
    {
      "cordappDir": "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyA/cordapps",
      "cordaNodeStartCmd": "supervisorctl start corda-a",
      "cordaJarPath": "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyA/corda.jar",
      "nodeBaseDirPath": "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyA/",
      "rpcCredentials": {
        "hostname": "127.0.0.1",
        "port": 10006,
        "username": "user1",
        "password": "test"
      },
      "sshCredentials": {
        "hostKeyEntry": "not-used-right-now-so-this-does-not-matter... ;-(",
        "hostname": "127.0.0.1",
        "password": "root",
        "port": 22,
        "username": "root"
      }
    },
    {
      "cordappDir": "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyB/cordapps",
      "cordaNodeStartCmd": "supervisorctl start corda-b",
      "cordaJarPath": "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyB/corda.jar",
      "nodeBaseDirPath": "/samples-kotlin/Advanced/negotiation-cordapp/build/nodes/PartyB/",
      "rpcCredentials": {
        "hostname": "127.0.0.1",
        "port": 10009,
        "username": "user1",
        "password": "test"
      },
      "sshCredentials": {
        "hostKeyEntry": "not-used-right-now-so-this-does-not-matter... ;-(",
        "hostname": "127.0.0.1",
        "password": "root",
        "port": 22,
        "username": "root"
      }
    }
  ]
}'
```
3. Invoke new Endpoint
  ```sh
  curl --location 'http://127.0.0.1:8080/api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/vault-query' \
  --header 'Content-Type: application/json' \
  --data '{
      "contractStateType": "net.corda.samples.example.states.IOUState"
  }'
  ```


### Transaction Monitoring
- There are two interfaces to monitor changes of vault states - reactive `watchBlocksV1` method, and low-level HTTP API calls.
- Note: The monitoring APIs are implemented only on kotlin-server connector (`main-server`), not typescript connector!
- For usage examples review the functional test file: `packages/cactus-plugin-ledger-connector-corda/src/test/typescript/integration/monitor-transactions-v4.8.test.ts`
- Because transactions read from corda are stored on the connector, they will be lost if connector is closed/killed before transaction were read by the clients.
- Each client has own set of state monitors that are managed independently. After starting the monitoring, each new transaction is queued on the connector until read and explicitly cleared by `watchBlocksV1` or direct HTTP API call.
- Client monitors can be periodically removed by the connector, if there was no action from the client for specified amount of time.
- Client expiration delay can be configured with `cactus.sessionExpireMinutes` option. It default to 30 minutes.
- Each transaction has own index assigned by the corda connector. Index is unique for each client monitoring session. For instance:
  - Stopping monitoring for given state will reset the transaction index counter for given client. After restart, it will report first transaction with index 0.
  - Each client can see tha same transaction with different index.
  - Index can be used to determine the transaction order for given client session.

#### watchBlocksV1
- `watchBlocksV1(options: watchBlocksV1Options): Observable<CordaBlock>`
- Reactive (RxJS) interface to observe state changes.
- Internally, it uses polling of low-level HTTP APIs.
- Watching block should return each block at least once, no blocks should be missed after startMonitor has started. The only case when transaction is lost is when connector we were connected to died.
- Transactions can be duplicated in case internal `ClearMonitorTransactionsV1` call was not successful (for instance, because of connection problems).
- Options:
  - `stateFullClassName: string`: state to monitor.
  - `pollRate?: number`: how often poll the kotlin server for changes (default 5 seconds).

#### Low-level HTTP API
- These should not be used when watchBlocks API is sufficient.
- Consists of the following methods:
  - `startMonitorV1`: Start monitoring for specified state changes. All changes after calling this function will be stored in internal kotlin-server buffer, ready to be read by calls to `GetMonitorTransactionsV1`. Transactions occuring before the call to startMonitorV1 will not be reported.
  - `GetMonitorTransactionsV1`: Read all transactions for given state name still remaining in internal buffer.
  - `ClearMonitorTransactionsV1`: Remove transaction for given state name with specified index number from internal buffer. Should be used to acknowledge receiving specified transactions in user code, so that transactions are not reported multiple times.
  - `stopMonitorV1`: Don't watch for transactions changes anymore, remove any transactions that were not read until now.

### Custom Configuration via Env Variables

```json
{
  "cactus": {
    "threadCount": 3,
    "sessionExpireMinutes": 10,
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

## Testing Environment for Manual Tests via Docker Compose

From the project root directory, execute this command to build both the all-in-one ledger and JVM connector images:

```sh
docker compose \
  --project-directory=./ \
  --file=./packages/cactus-plugin-ledger-connector-corda/src/test/yaml/fixtures/docker-compose.yaml \
  up
```

## Building Docker Image Locally

The `cccs` tag used in the below example commands is a shorthand for the
full name of the container image otherwise referred to as `cactus-corda-connector-server`.

From the project root:

```sh
DOCKER_BUILDKIT=1 docker build \
  ./packages/cactus-plugin-ledger-connector-corda/src/main-server/ \
  --progress=plain \
  --tag cccs \
  --tag cccs:latest \
  --tag "ghcr.io/hyperledger-cacti/cacti-connector-corda-server:$(date -u +"%Y-%m-%dT%H-%M-%SZ")-$(git describe --contains --all HEAD | sed -r 's,/,-,g')_$(git rev-parse --short HEAD)"
```

## Scan The Locally Built Container Image for Vulnerabilities with Trivy

Here, we are assuming that 
1. You've just built the container image and tagged it as `cccs` in the previous section.
2. You have a working [Trivy Installation](https://aquasecurity.github.io/trivy/v0.53/getting-started/installation/)
on your host OS or you are using the VSCode Dev Container which ships with Trivy installed by default.

```sh
trivy image cccs --scanners=vuln --severity=CRITICAL --severity=HIGH
```

## Scan The Locally Built .jar File For Vulnerabilities with Trivy

```sh
cd packages/cactus-plugin-ledger-connector-corda/src/main-server/kotlin/gen/kotlin-spring/

./gradlew clean build -Pversion=dev -DrootProjectName=cacti-connector-corda-server

trivy rootfs ./build/libs/cacti-connector-corda-server-dev.jar --scanners=vuln --severity=CRITICAL --severity=HIGH
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

## Testing

To run the tests for this package, execute:
```sh
npm test
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
  metrics_path: api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics
  scrape_interval: 5s
  static_configs:
    - targets: ['{host}:{port}']
```

Here the `host:port` is where the prometheus exporter metrics are exposed. 
Example metrics URL: `http://localhost:42379/api/v1/plugins/@hyperledger-cacti/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_corda_total_tx_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.
