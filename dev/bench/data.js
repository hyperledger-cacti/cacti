window.BENCHMARK_DATA = {
  "lastUpdate": 1725292158829,
  "repoUrl": "https://github.com/hyperledger/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "adrian.batuto@accenture.com",
            "name": "adrianbatuto",
            "username": "adrianbatuto"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "ec9683d38670fe5d657b602db8215e602fd4209d",
          "message": "feat(corda): support 5.1 via TS/HTTP (no JVM)\nFixes #2978\nFixes #3293\n\nSigned-off-by: adrianbatuto <adrian.batuto@accenture.com>",
          "timestamp": "2024-08-19T14:43:10-07:00",
          "tree_id": "530c66f1928ba9481fcc2d1d760582bf58be6677",
          "url": "https://github.com/hyperledger/cacti/commit/ec9683d38670fe5d657b602db8215e602fd4209d"
        },
        "date": 1724104805933,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 592,
            "range": "±1.67%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 345,
            "range": "±1.99%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "adrian.batuto@accenture.com",
            "name": "adrianbatuto",
            "username": "adrianbatuto"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "ec9683d38670fe5d657b602db8215e602fd4209d",
          "message": "feat(corda): support 5.1 via TS/HTTP (no JVM)\nFixes #2978\nFixes #3293\n\nSigned-off-by: adrianbatuto <adrian.batuto@accenture.com>",
          "timestamp": "2024-08-19T14:43:10-07:00",
          "tree_id": "530c66f1928ba9481fcc2d1d760582bf58be6677",
          "url": "https://github.com/hyperledger/cacti/commit/ec9683d38670fe5d657b602db8215e602fd4209d"
        },
        "date": 1724105297971,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 729,
            "range": "±2.16%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "444e04cf796f29aac9fd4a860638ca064645dc08",
          "message": "build(connector-corda): upgrade to Spring Boot v3.3.1\n\nIMPORTANT: The project now needs JDK 17 and Gradle 8 for development.\n\n1. The bean validation has been replaced to the jakarta flavor as mandated\nby the spring boot upgrade.\n2. Request bodies in the OpenAPI spec for Corda v4 were made mandatory\nwhere applicable (which is most of the endpoints)\n3. The Open API spec based request validation test case has been moved to\nthe new Corda v4.12 test case which now builds both the connector JVM app\nand the AIO image at runtime so that we can guarantee that the latest\ncode changes are being verified.\n4. Added quicker and easier steps in the readme of the corda connector\nto run trivy scans on the .jar files instead of the container images.\nThe .jar files are 20x faster to build and scanning them instead of the\ncontainer images doesn't suffer from the problem that the dev build\ndependencies are showing up in the scans (creating false positives)\n5. Updated the CI to use the .jar file for scanning as well instead of\nthe container image.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-08-30T11:33:02+05:30",
          "tree_id": "18622fb0c6917f8c7a51d34eb5a07864dda8c67e",
          "url": "https://github.com/hyperledger/cacti/commit/444e04cf796f29aac9fd4a860638ca064645dc08"
        },
        "date": 1724998483432,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 592,
            "range": "±1.78%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 346,
            "range": "±1.72%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "444e04cf796f29aac9fd4a860638ca064645dc08",
          "message": "build(connector-corda): upgrade to Spring Boot v3.3.1\n\nIMPORTANT: The project now needs JDK 17 and Gradle 8 for development.\n\n1. The bean validation has been replaced to the jakarta flavor as mandated\nby the spring boot upgrade.\n2. Request bodies in the OpenAPI spec for Corda v4 were made mandatory\nwhere applicable (which is most of the endpoints)\n3. The Open API spec based request validation test case has been moved to\nthe new Corda v4.12 test case which now builds both the connector JVM app\nand the AIO image at runtime so that we can guarantee that the latest\ncode changes are being verified.\n4. Added quicker and easier steps in the readme of the corda connector\nto run trivy scans on the .jar files instead of the container images.\nThe .jar files are 20x faster to build and scanning them instead of the\ncontainer images doesn't suffer from the problem that the dev build\ndependencies are showing up in the scans (creating false positives)\n5. Updated the CI to use the .jar file for scanning as well instead of\nthe container image.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-08-30T11:33:02+05:30",
          "tree_id": "18622fb0c6917f8c7a51d34eb5a07864dda8c67e",
          "url": "https://github.com/hyperledger/cacti/commit/444e04cf796f29aac9fd4a860638ca064645dc08"
        },
        "date": 1724998941915,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 727,
            "range": "±2.90%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87",
          "message": "fix(security): address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3\n\nhttps://github.com/hyperledger/cacti/security/dependabot/1172\n\nCVE ID\nCVE-2024-39338\n\nGHSA ID\nGHSA-8hc4-vh64-cxmj\n\naxios 1.7.2 allows SSRF via unexpected behavior where requests for path\nrelative URLs get processed as protocol relative URLs.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-08-30T09:12:59-07:00",
          "tree_id": "0d531b6cecfdea199fa7b9fd51d490b915f11c3f",
          "url": "https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87"
        },
        "date": 1725035416450,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 593,
            "range": "±1.98%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 339,
            "range": "±2.06%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87",
          "message": "fix(security): address CVE-2024-39338 SSRF in axios >= 1.3.2, <= 1.7.3\n\nhttps://github.com/hyperledger/cacti/security/dependabot/1172\n\nCVE ID\nCVE-2024-39338\n\nGHSA ID\nGHSA-8hc4-vh64-cxmj\n\naxios 1.7.2 allows SSRF via unexpected behavior where requests for path\nrelative URLs get processed as protocol relative URLs.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-08-30T09:12:59-07:00",
          "tree_id": "0d531b6cecfdea199fa7b9fd51d490b915f11c3f",
          "url": "https://github.com/hyperledger/cacti/commit/7e7bb44c01a2d19306ecaaaa2ba2e3c574039c87"
        },
        "date": 1725035882362,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 718,
            "range": "±3.09%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "957da7c3e1d80068391485a825ba6bb1e68333ac",
          "message": "feat(core-api): add createIsJwsGeneralTypeGuard, createAjvTypeGuard<T>\n\n1. createAjvTypeGuard<T>() is the lower level utility which can be used\nto construct the more convenient, higher level type predicates/type guards\nsuch as createIsJwsGeneralTypeGuard() which uses createAjvTypeGuard<JwsGeneral>\nunder the hood.\n2. This commit is also meant to be establishing a larger, more generic\npattern of us being able to create type guards out of the Open API specs\nin a convenient way instead of having to write the validation code by hand.\n\nAn example usage of the new createAjvTypeGuard<T>() utility is the\ncreateIsJwsGeneralTypeGuard() function itself.\n\nAn example usage of the new createIsJwsGeneralTypeGuard() can be found\nin packages/cactus-plugin-consortium-manual/src/main/typescript/plugin-consortium-manual.ts\n\nThe code documentation contains examples as well for maximum discoverabilty\nand I'll also include it here:\n\n```typescript\nimport { JWSGeneral } from \"@hyperledger/cactus-core-api\";\nimport { createIsJwsGeneralTypeGuard } from \"@hyperledger/cactus-core-api\";\n\nexport class PluginConsortiumManual {\n  private readonly isJwsGeneral: (x: unknown) => x is JWSGeneral;\n\n  constructor() {\n    // Creating the type-guard function is relatively costly due to the Ajv schema\n    // compilation that needs to happen as part of it so it is good practice to\n    // cache the type-guard function as much as possible, for examle by adding it\n    // as a class member on a long-lived object such as a plugin instance which is\n    // expected to match the life-cycle of the API server NodeJS process itself.\n    // The specific anti-pattern would be to create a new type-guard function\n    // for each request received by a plugin as this would affect performance\n    // negatively.\n    this.isJwsGeneral = createIsJwsGeneralTypeGuard();\n  }\n\n  public async getNodeJws(): Promise<JWSGeneral> {\n    // rest of the implementation that produces a JWS ...\n    const jws = await joseGeneralSign.sign();\n\n    if (!this.isJwsGeneral(jws)) {\n      throw new TypeError(\"Jose GeneralSign.sign() gave non-JWSGeneral type\");\n    }\n    return jws;\n  }\n}\n```\n\nRelevant discussion took place here:\nhttps://github.com/hyperledger/cacti/pull/3471#discussion_r1731894747\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-02T08:23:56-07:00",
          "tree_id": "f0a96975cecbe783530ab2031beadee53efbd0b2",
          "url": "https://github.com/hyperledger/cacti/commit/957da7c3e1d80068391485a825ba6bb1e68333ac"
        },
        "date": 1725291665622,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 606,
            "range": "±1.77%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 353,
            "range": "±1.78%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "957da7c3e1d80068391485a825ba6bb1e68333ac",
          "message": "feat(core-api): add createIsJwsGeneralTypeGuard, createAjvTypeGuard<T>\n\n1. createAjvTypeGuard<T>() is the lower level utility which can be used\nto construct the more convenient, higher level type predicates/type guards\nsuch as createIsJwsGeneralTypeGuard() which uses createAjvTypeGuard<JwsGeneral>\nunder the hood.\n2. This commit is also meant to be establishing a larger, more generic\npattern of us being able to create type guards out of the Open API specs\nin a convenient way instead of having to write the validation code by hand.\n\nAn example usage of the new createAjvTypeGuard<T>() utility is the\ncreateIsJwsGeneralTypeGuard() function itself.\n\nAn example usage of the new createIsJwsGeneralTypeGuard() can be found\nin packages/cactus-plugin-consortium-manual/src/main/typescript/plugin-consortium-manual.ts\n\nThe code documentation contains examples as well for maximum discoverabilty\nand I'll also include it here:\n\n```typescript\nimport { JWSGeneral } from \"@hyperledger/cactus-core-api\";\nimport { createIsJwsGeneralTypeGuard } from \"@hyperledger/cactus-core-api\";\n\nexport class PluginConsortiumManual {\n  private readonly isJwsGeneral: (x: unknown) => x is JWSGeneral;\n\n  constructor() {\n    // Creating the type-guard function is relatively costly due to the Ajv schema\n    // compilation that needs to happen as part of it so it is good practice to\n    // cache the type-guard function as much as possible, for examle by adding it\n    // as a class member on a long-lived object such as a plugin instance which is\n    // expected to match the life-cycle of the API server NodeJS process itself.\n    // The specific anti-pattern would be to create a new type-guard function\n    // for each request received by a plugin as this would affect performance\n    // negatively.\n    this.isJwsGeneral = createIsJwsGeneralTypeGuard();\n  }\n\n  public async getNodeJws(): Promise<JWSGeneral> {\n    // rest of the implementation that produces a JWS ...\n    const jws = await joseGeneralSign.sign();\n\n    if (!this.isJwsGeneral(jws)) {\n      throw new TypeError(\"Jose GeneralSign.sign() gave non-JWSGeneral type\");\n    }\n    return jws;\n  }\n}\n```\n\nRelevant discussion took place here:\nhttps://github.com/hyperledger/cacti/pull/3471#discussion_r1731894747\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-02T08:23:56-07:00",
          "tree_id": "f0a96975cecbe783530ab2031beadee53efbd0b2",
          "url": "https://github.com/hyperledger/cacti/commit/957da7c3e1d80068391485a825ba6bb1e68333ac"
        },
        "date": 1725292156235,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 697,
            "range": "±2.75%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      }
    ]
  }
}