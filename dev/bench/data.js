window.BENCHMARK_DATA = {
  "lastUpdate": 1721323073231,
  "repoUrl": "https://github.com/hyperledger/cacti",
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
          "id": "c8b33c8052c609e449f83a5c85d74cbbeeb1cca1",
          "message": "build: project-wide upgrade of joi to v17.13.3\n\n1. Also sneaking in a fix for the ci.yaml where the coverage path env\nvariables were not declared for the stellar connector's tests and that\nwas causing the test job to fail entirely.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-16T07:18:22-07:00",
          "tree_id": "71ff846f1d5c54947fd3fe85c57666ec9eea08c8",
          "url": "https://github.com/hyperledger/cacti/commit/c8b33c8052c609e449f83a5c85d74cbbeeb1cca1"
        },
        "date": 1721140521662,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 611,
            "range": "±1.80%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 372,
            "range": "±1.19%",
            "unit": "ops/sec",
            "extra": "183 samples"
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
          "id": "87f5f609d738becc33e0bcc5232498a95e4c00d2",
          "message": "test(test-tooling): fix WS identity server port publish configuration\n\n1. The hostconfig portion of the container start configuration was not\nbeing set up correctly which made it so that the exposed ports were not\npublished on randomized ports like they were supposed to.\n2. This caused  the `fabric-v2-2-x/run-transaction-with-ws-ids.test.ts`\ntest to fail because it couldn't map the container port to a host machine\nport.\n3. Setting up the ws-test-server.ts class so that it does map the ports\nto the host machine solved the issue.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-17T13:15:43-07:00",
          "tree_id": "0dfd34409fd8b89fcce8ab242479cc60ee4ce58b",
          "url": "https://github.com/hyperledger/cacti/commit/87f5f609d738becc33e0bcc5232498a95e4c00d2"
        },
        "date": 1721248241128,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 607,
            "range": "±1.79%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 364,
            "range": "±1.41%",
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
          "id": "497ea3226631fdcad763e6281ee058d91ca01988",
          "message": "test(test-tooling): add container image builder utilities\n\n1. Currently our integration tests depend on pre-published container\nimages to be on the official registry (ghcr.io). This has pros and cons.\nThe pro is that we can pin the tests to a specific ledger version and\nthen have confidence that the test code works with that specific image.\nOn the other hand if the image itself has problems we won't know it until\nafter it was published and then tests were executed with it (unless we\nperform manual testing which is a lot of effrot as it requires the\nmanual modification of the test cases).\n2. In order to gives us the ability to test against the container image\ndefinitions as they are in the current revision of the source code,\nwe are adding here a couple of utility functions to streamline writing\ntest cases that build the container images for themselves as part of the\ntest case.\n\nAn example of how to use it in a test case:\n\n```typescript\nconst imgConnectorJvm = await buildImageConnectorCordaServer({\n    logLevel,\n});\n\n// ...\n\nconnector = new CordaConnectorContainer({\n    logLevel,\n    imageName: imgConnectorJvm.imageName,\n    imageVersion: imgConnectorJvm.imageVersion,\n    envVars: [envVarSpringAppJson],\n});\n\n```\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-17T17:31:23-07:00",
          "tree_id": "59d3d8a612cce5ee7e4b23eb014491baec319e68",
          "url": "https://github.com/hyperledger/cacti/commit/497ea3226631fdcad763e6281ee058d91ca01988"
        },
        "date": 1721263376497,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 603,
            "range": "±1.65%",
            "unit": "ops/sec",
            "extra": "180 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 367,
            "range": "±1.50%",
            "unit": "ops/sec",
            "extra": "183 samples"
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
          "id": "6ff8111c2534f71a5f623433eba59a610d84f4eb",
          "message": "fix: address CVE-2022-24434, GHSA-wm7h-9275-46v2 caused by dicer\n\nThe process for this fix was to:\n1. `yarn why -R dicer`\n2. Then examine the output of that and see which dependencies are using\ndicer indirectly (transient dependencies)\n3. `yarn up multer --exact`\n4. `yarn up express-openapi-validator --exact`\n5. Profit, e.g. running `yarn why -R dicer` at this point shows that\ndicer has been eliminated from the dependency tree completely.\n\nhttps://github.com/hyperledger/cacti/security/dependabot/176\n\nWeaknesses\nCWE-248\n\nCVE ID\nCVE-2022-24434\n\nGHSA ID\nGHSA-wm7h-9275-46v2\n\nAlso sneaking in a test case hot-fix for\nbesu/deploy-contract/private-deploy-contract-from-json-cactus.test.ts\nwhere the error message assertion broke down after a change in error\nhandling of the contract deployment endpoint.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-18T09:52:47-07:00",
          "tree_id": "f790bf3fa1eb223c0d52d9f597d58f1a50090a32",
          "url": "https://github.com/hyperledger/cacti/commit/6ff8111c2534f71a5f623433eba59a610d84f4eb"
        },
        "date": 1721322597660,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 610,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 373,
            "range": "±1.38%",
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
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "6ff8111c2534f71a5f623433eba59a610d84f4eb",
          "message": "fix: address CVE-2022-24434, GHSA-wm7h-9275-46v2 caused by dicer\n\nThe process for this fix was to:\n1. `yarn why -R dicer`\n2. Then examine the output of that and see which dependencies are using\ndicer indirectly (transient dependencies)\n3. `yarn up multer --exact`\n4. `yarn up express-openapi-validator --exact`\n5. Profit, e.g. running `yarn why -R dicer` at this point shows that\ndicer has been eliminated from the dependency tree completely.\n\nhttps://github.com/hyperledger/cacti/security/dependabot/176\n\nWeaknesses\nCWE-248\n\nCVE ID\nCVE-2022-24434\n\nGHSA ID\nGHSA-wm7h-9275-46v2\n\nAlso sneaking in a test case hot-fix for\nbesu/deploy-contract/private-deploy-contract-from-json-cactus.test.ts\nwhere the error message assertion broke down after a change in error\nhandling of the contract deployment endpoint.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-18T09:52:47-07:00",
          "tree_id": "f790bf3fa1eb223c0d52d9f597d58f1a50090a32",
          "url": "https://github.com/hyperledger/cacti/commit/6ff8111c2534f71a5f623433eba59a610d84f4eb"
        },
        "date": 1721323070451,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 710,
            "range": "±3.02%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}