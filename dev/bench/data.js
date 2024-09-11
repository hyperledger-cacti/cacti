window.BENCHMARK_DATA = {
  "lastUpdate": 1726075405825,
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
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "456e60db069e570781b3f50d4155de07065a006b",
          "message": "build(deps): bump the npm_and_yarn group across 3 directories with 3 updates\n\n---\nupdated-dependencies:\n- dependency-name: \"@grpc/grpc-js\"\n  dependency-type: direct:production\n  dependency-group: npm_and_yarn\n- dependency-name: axios\n  dependency-type: direct:production\n  dependency-group: npm_and_yarn\n- dependency-name: qs\n  dependency-type: direct:development\n  dependency-group: npm_and_yarn\n- dependency-name: axios\n  dependency-type: direct:production\n  dependency-group: npm_and_yarn\n- dependency-name: \"@grpc/grpc-js\"\n  dependency-type: direct:development\n  dependency-group: npm_and_yarn\n...\n\nCo-authored-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-11T09:58:13-07:00",
          "tree_id": "2ae0d38920ee96029a875f7d62dcf786d9cc5de4",
          "url": "https://github.com/hyperledger/cacti/commit/456e60db069e570781b3f50d4155de07065a006b"
        },
        "date": 1726074921484,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 612,
            "range": "±1.58%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 744,
            "range": "±3.28%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "456e60db069e570781b3f50d4155de07065a006b",
          "message": "build(deps): bump the npm_and_yarn group across 3 directories with 3 updates\n\n---\nupdated-dependencies:\n- dependency-name: \"@grpc/grpc-js\"\n  dependency-type: direct:production\n  dependency-group: npm_and_yarn\n- dependency-name: axios\n  dependency-type: direct:production\n  dependency-group: npm_and_yarn\n- dependency-name: qs\n  dependency-type: direct:development\n  dependency-group: npm_and_yarn\n- dependency-name: axios\n  dependency-type: direct:production\n  dependency-group: npm_and_yarn\n- dependency-name: \"@grpc/grpc-js\"\n  dependency-type: direct:development\n  dependency-group: npm_and_yarn\n...\n\nCo-authored-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-11T09:58:13-07:00",
          "tree_id": "2ae0d38920ee96029a875f7d62dcf786d9cc5de4",
          "url": "https://github.com/hyperledger/cacti/commit/456e60db069e570781b3f50d4155de07065a006b"
        },
        "date": 1726075402814,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 717,
            "range": "±2.57%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}