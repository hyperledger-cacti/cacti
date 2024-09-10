window.BENCHMARK_DATA = {
  "lastUpdate": 1725997249820,
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
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "0b70ec96b824b67e7c587315ac0138a045179e6a",
          "message": "chore(release): publish v2.0.0-rc.4\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-09T15:32:06+05:30",
          "tree_id": "6dd523631d5cf1e2d4d47e71df02c13c7606b319",
          "url": "https://github.com/hyperledger/cacti/commit/0b70ec96b824b67e7c587315ac0138a045179e6a"
        },
        "date": 1725877158379,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 620,
            "range": "±1.82%",
            "unit": "ops/sec",
            "extra": "180 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 359,
            "range": "±1.91%",
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
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "0b70ec96b824b67e7c587315ac0138a045179e6a",
          "message": "chore(release): publish v2.0.0-rc.4\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-09T15:32:06+05:30",
          "tree_id": "6dd523631d5cf1e2d4d47e71df02c13c7606b319",
          "url": "https://github.com/hyperledger/cacti/commit/0b70ec96b824b67e7c587315ac0138a045179e6a"
        },
        "date": 1725877625710,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 753,
            "range": "±2.92%",
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
          "id": "68d50ba270911d030e3aca8b3fdc891f43267c6b",
          "message": "test(connector-besu): jest migrate get-past-logs-endpoint.test.ts\n\nDepends on #3528 => test(test-tooling): add new besu AIO image builder utility\n\nFixes #3527\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-10T12:13:59-07:00",
          "tree_id": "dc7ad978cb183e18be8943d2d5b906cc45b2270b",
          "url": "https://github.com/hyperledger/cacti/commit/68d50ba270911d030e3aca8b3fdc891f43267c6b"
        },
        "date": 1725997248069,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 690,
            "range": "±2.69%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      }
    ]
  }
}