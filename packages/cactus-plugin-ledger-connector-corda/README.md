# `@hyperledger/cactus-plugin-ledger-connector-corda`

> TODO: description

## Usage

Take a look at how the API client can be used to run transactions on a corda ledger:
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