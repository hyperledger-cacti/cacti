window.BENCHMARK_DATA = {
  "lastUpdate": 1717001653082,
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
      }
    ]
  }
}