window.BENCHMARK_DATA = {
  "lastUpdate": 1717007028275,
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
      }
    ]
  }
}