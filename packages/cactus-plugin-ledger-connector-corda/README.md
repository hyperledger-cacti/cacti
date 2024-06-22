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
curl --location 'http://127.0.0.1:8080/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars' \
--header 'Content-Type: application/json' \
--data '{
  "jarFiles": [
    {
      "contentBase64": "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AAAAAAQAAAAAAAAAAAAAAAAAbwgAAG5ldC9QSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAACgAAAAAAAAAAAAAAAACjCAAAbmV0L2NvcmRhL1BLAQIUABQACAgIAAAAQQAAAAAAAgAAAAAAAAASAAAAAAAAAAAAAAAAAN0IAABuZXQvY29yZGEvc2FtcGxlcy9QSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAAGgAAAAAAAAAAAAAAAAAfCQAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9QSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAAJAAAAAAAAAAAAAAAAABpCQAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9jb250cmFjdHMvUEsBAhQAFAAICAgAAABBADNkbPa3AQAAKAMAAEUAAAAAAAAAAAAAAAAAvQkAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvY29udHJhY3RzL0lPVUNvbnRyYWN0JENvbW1hbmRzJENyZWF0ZS5jbGFzc1BLAQIUABQACAgIAAAAQQCZqmaOZgEAAKkCAAA+AAAAAAAAAAAAAAAAAOcLAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2NvbnRyYWN0cy9JT1VDb250cmFjdCRDb21tYW5kcy5jbGFzc1BLAQIUABQACAgIAAAAQQAE/YOltwIAAMgEAAA/AAAAAAAAAAAAAAAAALkNAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2NvbnRyYWN0cy9JT1VDb250cmFjdCRDb21wYW5pb24uY2xhc3NQSwECFAAUAAgICAAAAEEAsucK20wLAAAxGAAANQAAAAAAAAAAAAAAAADdEAAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9jb250cmFjdHMvSU9VQ29udHJhY3QuY2xhc3NQSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAAIQAAAAAAAAAAAAAAAACMHAAAbmV0L2NvcmRhL3NhbXBsZXMvZXhhbXBsZS9zY2hlbWEvUEsBAhQAFAAICAgAAABBAGZggFq5AQAAeQIAADAAAAAAAAAAAAAAAAAA3RwAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvc2NoZW1hL0lPVVNjaGVtYS5jbGFzc1BLAQIUABQACAgIAAAAQQAPwV9sfAUAAC4MAABAAAAAAAAAAAAAAAAAAPQeAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL3NjaGVtYS9JT1VTY2hlbWFWMSRQZXJzaXN0ZW50SU9VLmNsYXNzUEsBAhQAFAAICAgAAABBANMoSBorAwAAtAUAADIAAAAAAAAAAAAAAAAA3iQAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvc2NoZW1hL0lPVVNjaGVtYVYxLmNsYXNzUEsBAhQAFAAICAgAAABBAAAAAAACAAAAAAAAACEAAAAAAAAAAAAAAAAAaSgAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvc3RhdGVzL1BLAQIUABQACAgIAAAAQQDANrL8QgoAAJUZAAAvAAAAAAAAAAAAAAAAALooAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL3N0YXRlcy9JT1VTdGF0ZS5jbGFzc1BLBQYAAAAAFAAUAGUGAABZMwAAAAA=",
      "filename": "BASIC_CORDAPP_contracts-1.0.jar",
      "hasDbMigrations": true
    },
    {
      "contentBase64": "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ZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEFjY2VwdG9yLmNsYXNzUEsBAhQAFAAICAgAAABBAOsPTQgaAwAATAYAAFwAAAAAAAAAAAAAAAAAqRgAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvZmxvd3MvRXhhbXBsZUZsb3ckSW5pdGlhdG9yJENvbXBhbmlvbiRGSU5BTElTSU5HX1RSQU5TQUNUSU9OLmNsYXNzUEsBAhQAFAAICAgAAABBACfSq9oHAwAAQQYAAFQAAAAAAAAAAAAAAAAATRwAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvZmxvd3MvRXhhbXBsZUZsb3ckSW5pdGlhdG9yJENvbXBhbmlvbiRHQVRIRVJJTkdfU0lHUy5jbGFzc1BLAQIUABQACAgIAAAAQQCDbfUscgIAAIAEAABcAAAAAAAAAAAAAAAAANYfAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvciRDb21wYW5pb24kR0VORVJBVElOR19UUkFOU0FDVElPTi5jbGFzc1BLAQIUABQACAgIAAAAQQBkkcwlcQIAAHgEAABZAAAAAAAAAAAAAAAAANIiAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvciRDb21wYW5pb24kU0lHTklOR19UUkFOU0FDVElPTi5jbGFzc1BLAQIUABQACAgIAAAAQQDMCoCIZwIAAHQEAABbAAAAAAAAAAAAAAAAAMolAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvciRDb21wYW5pb24kVkVSSUZZSU5HX1RSQU5TQUNUSU9OLmNsYXNzUEsBAhQAFAAICAgAAABBAMWpmhjUAwAAGAoAAEUAAAAAAAAAAAAAAAAAuigAAG5ldC9jb3JkYS9zYW1wbGVzL2V4YW1wbGUvZmxvd3MvRXhhbXBsZUZsb3ckSW5pdGlhdG9yJENvbXBhbmlvbi5jbGFzc1BLAQIUABQACAgIAAAAQQByb0yuqwwAADQgAAA7AAAAAAAAAAAAAAAAAAEtAABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93JEluaXRpYXRvci5jbGFzc1BLAQIUABQACAgIAAAAQQC2WOa6/QEAADoDAAAxAAAAAAAAAAAAAAAAABU6AABuZXQvY29yZGEvc2FtcGxlcy9leGFtcGxlL2Zsb3dzL0V4YW1wbGVGbG93LmNsYXNzUEsBAhQAFAAICAgAAABBAJueFadGAwAAbggAAAoAAAAAAAAAAAAAAAAAcTwAAGxvZzRqMi54bWxQSwECFAAUAAgICAAAAEEAAAAAAAIAAAAAAAAACgAAAAAAAAAAAAAAAADvPwAAbWlncmF0aW9uL1BLAQIUABQACAgIAAAAQQCPxkIS5QAAAGUCAAAiAAAAAAAAAAAAAAAAAClAAABtaWdyYXRpb24vaW91LmNoYW5nZWxvZy1tYXN0ZXIueG1sUEsBAhQAFAAICAgAAABBAN65XiljAQAADAQAAB4AAAAAAAAAAAAAAAAAXkEAAG1pZ3JhdGlvbi9pb3UuY2hhbmdlbG9nLXYxLnhtbFBLBQYAAAAAGAAYAGMIAAANQwAAAAA=",
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
  curl --location 'http://127.0.0.1:8080/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/vault-query' \
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
  --tag "ghcr.io/hyperledger/cactus-connector-corda-server:$(date +%F)-$(git rev-parse --symbolic-full-name --abbrev-ref HEAD)-$(git rev-parse --short HEAD)"
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

Here the `host:port` is where the prometheus exporter metrics are exposed. 
Example metrics URL: `http://localhost:42379/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics`

Once edited, you can start the prometheus service by referencing the above edited prometheus.yml file.
On the prometheus graphical interface (defaulted to http://localhost:9090), choose **Graph** from the menu bar, then select the **Console** tab. From the **Insert metric at cursor** drop down, select **cactus_corda_total_tx_count** and click **execute**

### Helper code

###### response.type.ts
This file contains the various responses of the metrics.

###### data-fetcher.ts
This file contains functions encasing the logic to process the data points

###### metrics.ts
This file lists all the prometheus metrics and what they are used for.
