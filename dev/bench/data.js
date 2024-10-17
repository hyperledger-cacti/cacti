window.BENCHMARK_DATA = {
  "lastUpdate": 1729208197466,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
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
          "id": "1a0f661027568bd7bb7420fdb6ab6a0991a15c4b",
          "message": "chore(release): publish v2.0.0\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-10-16T20:29:20-07:00",
          "tree_id": "8a06fc086387341a0bf3002398a64e418bb8ab79",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/1a0f661027568bd7bb7420fdb6ab6a0991a15c4b"
        },
        "date": 1729136786767,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 599,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 710,
            "range": "±3.08%",
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
          "id": "1a0f661027568bd7bb7420fdb6ab6a0991a15c4b",
          "message": "chore(release): publish v2.0.0\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-10-16T20:29:20-07:00",
          "tree_id": "8a06fc086387341a0bf3002398a64e418bb8ab79",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/1a0f661027568bd7bb7420fdb6ab6a0991a15c4b"
        },
        "date": 1729137269251,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 731,
            "range": "±2.95%",
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
          "id": "11dacbcef25ba3e7fa9f9880f60655be1e2396ef",
          "message": "fix(besu): deployContractSolBytecodeNoKeychainV1 requires keychainId\n\nIn the DeployContractSolidityBytecodeNoKeychainV1Request of\n`packages/cactus-plugin-ledger-connector-besu/src/main/json/openapi.tpl.json`\nthere are parameters that are required despite the entire point of this\noperation is to not need them (e.g. keychainId and contract JSON object).\n\nFixes #3586\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-10-17T16:16:32-07:00",
          "tree_id": "5802f84f4083cdb62a4cb6a485110b28a97e5386",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/11dacbcef25ba3e7fa9f9880f60655be1e2396ef"
        },
        "date": 1729208193710,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 595,
            "range": "±34.43%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      }
    ]
  }
}