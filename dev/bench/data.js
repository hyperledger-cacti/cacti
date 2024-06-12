window.BENCHMARK_DATA = {
  "lastUpdate": 1718216186571,
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
          "id": "ab676d23e1781aa17b5f2c61cb7dec643443bded",
          "message": "feat(connector-besu): add gRPC support for operations\n\n1. The Besu connector now can be reached via the gRPC interface.\n2. The same operations are exposed as via HTTP+SocketIO\n3. gRPC supports bi-directional streaming so the block watching is also\nsupported and test coverage verifies that it works.\n4. To see an example of how to use the gRPC client of the Besu connector\nread the source code of the test case that provides the verification that\nthe functionality works:\n```\npackages/cactus-test-plugin-ledger-connector-besu/src/test/typescript/\nintegration/grpc-services/connector-besu-grpc-services.test.ts\n```\n\nDepends on #3173\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-29T09:26:12-07:00",
          "tree_id": "d3d9bebf7e0097ad2e1e2bc061e34415c163a024",
          "url": "https://github.com/hyperledger/cacti/commit/ab676d23e1781aa17b5f2c61cb7dec643443bded"
        },
        "date": 1717001650982,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 771,
            "range": "±2.96%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "zondervan.v.calvez@accenture.com",
            "name": "zondervancalvez",
            "username": "zondervancalvez"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "81da3334d8e638f85e398dd228bcef836a278230",
          "message": "fix(cmd-api-server): address CVE-2022-25881\n\nPrimary Changes:\n\tUpdated the Dockerfile & https-cache-semantics inside the cmd-api-server package\n\nFixes: #2862\n\nSigned-off-by: zondervancalvez <zondervan.v.calvez@accenture.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-29T11:12:31-07:00",
          "tree_id": "150f754ac29b731c5aafa0fe70fe64afdec1aca2",
          "url": "https://github.com/hyperledger/cacti/commit/81da3334d8e638f85e398dd228bcef836a278230"
        },
        "date": 1717007025069,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 565,
            "range": "±1.81%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 349,
            "range": "±1.39%",
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
          "id": "4521d10e34c556434fe551f6d55100198b4d469d",
          "message": "test(plugin-consortium-manual): fix API server CRPC port allocation\n\n1. Also sneaking in a fix for a DCI-Lint failure that was introduced recently\nwhen we added a new Yarn plugin which then stored its install URL in the\n.yarnrc.yml file and it uses the old git default main branch name and does\nnot support the new one so we had to exclude the config file from linting.\n2. Also ensured that the ConnectRPC ports are bound to zero in all tests where the API\nserver is being used. This will prevent port conflicts randomly popping up across the\ntest suite in the future.\n3. Also removed a few test cases from the taprc file because they were already migrated to\nJest and therefore tap should not run them as they fail with the Jest syntax.\n4. Also fixing the lack of etherscan API key environment variable in the HTLC coordinator tests.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-12T10:56:35-07:00",
          "tree_id": "5500e8622a1cc2873707e37cafce8a083e3531ec",
          "url": "https://github.com/hyperledger/cacti/commit/4521d10e34c556434fe551f6d55100198b4d469d"
        },
        "date": 1718215659834,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 594,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 362,
            "range": "±1.55%",
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
          "id": "4521d10e34c556434fe551f6d55100198b4d469d",
          "message": "test(plugin-consortium-manual): fix API server CRPC port allocation\n\n1. Also sneaking in a fix for a DCI-Lint failure that was introduced recently\nwhen we added a new Yarn plugin which then stored its install URL in the\n.yarnrc.yml file and it uses the old git default main branch name and does\nnot support the new one so we had to exclude the config file from linting.\n2. Also ensured that the ConnectRPC ports are bound to zero in all tests where the API\nserver is being used. This will prevent port conflicts randomly popping up across the\ntest suite in the future.\n3. Also removed a few test cases from the taprc file because they were already migrated to\nJest and therefore tap should not run them as they fail with the Jest syntax.\n4. Also fixing the lack of etherscan API key environment variable in the HTLC coordinator tests.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-12T10:56:35-07:00",
          "tree_id": "5500e8622a1cc2873707e37cafce8a083e3531ec",
          "url": "https://github.com/hyperledger/cacti/commit/4521d10e34c556434fe551f6d55100198b4d469d"
        },
        "date": 1718216183306,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 776,
            "range": "±2.72%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      }
    ]
  }
}