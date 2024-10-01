window.BENCHMARK_DATA = {
  "lastUpdate": 1727770499891,
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
      },
      {
        "commit": {
          "author": {
            "email": "raynato.c.pedrajeta@accenture.com",
            "name": "raynato.c.pedrajeta",
            "username": "raynatopedrajeta"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "ebe781657fa1887c27c68dfc420afde84690791d",
          "message": "test(test tooling): add DamlTestLedger implementation\nPrimary Changes\n---------------\n1. Create a test tooling class for DAML AIO Image\nFixes #3435\n\nSigned-off-by: raynato.c.pedrajeta <raynato.c.pedrajeta@accenture.com>",
          "timestamp": "2024-09-27T10:04:52-07:00",
          "tree_id": "540e311b78daeb1a1ee820a155dd30e25a700597",
          "url": "https://github.com/hyperledger/cacti/commit/ebe781657fa1887c27c68dfc420afde84690791d"
        },
        "date": 1727457417707,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 585,
            "range": "±1.70%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 706,
            "range": "±2.60%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "raynato.c.pedrajeta@accenture.com",
            "name": "raynato.c.pedrajeta",
            "username": "raynatopedrajeta"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "ebe781657fa1887c27c68dfc420afde84690791d",
          "message": "test(test tooling): add DamlTestLedger implementation\nPrimary Changes\n---------------\n1. Create a test tooling class for DAML AIO Image\nFixes #3435\n\nSigned-off-by: raynato.c.pedrajeta <raynato.c.pedrajeta@accenture.com>",
          "timestamp": "2024-09-27T10:04:52-07:00",
          "tree_id": "540e311b78daeb1a1ee820a155dd30e25a700597",
          "url": "https://github.com/hyperledger/cacti/commit/ebe781657fa1887c27c68dfc420afde84690791d"
        },
        "date": 1727457892854,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 685,
            "range": "±2.59%",
            "unit": "ops/sec",
            "extra": "178 samples"
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
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": false,
          "id": "fb3286c78eb0b442eb624e35d0215bbb73492e75",
          "message": "chore(release): publish v2.0.0-rc.5\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-09-29T23:37:37-07:00",
          "tree_id": "f38e2c43f2f277107d82ad76321f3b0419b5d0f5",
          "url": "https://github.com/hyperledger/cacti/commit/fb3286c78eb0b442eb624e35d0215bbb73492e75"
        },
        "date": 1727707917752,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 646,
            "range": "±4.68%",
            "unit": "ops/sec",
            "extra": "176 samples"
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
            "email": "peter.somogyvari@accenture.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": false,
          "id": "ce5f9df3f7a0f0cd1a63c8e6d0db38c2efda38dd",
          "message": "chore(release): publish v2.0.0-rc.6\n\nIn addition to being a regular release candidate, this also includes a\n(probable) fix for the npm/ghcr publishing github action.\n\nThe above fix is the entire reason why we are issuing this release to begin\nwith: to verify that the automatic publishing script works before issuing\nthe v2.0.0 GA release after long last.\n\nDepends on #3563\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-10-01T00:23:39-07:00",
          "tree_id": "bda34f8b9c952db3ee650022f8632c3307b451ff",
          "url": "https://github.com/hyperledger/cacti/commit/ce5f9df3f7a0f0cd1a63c8e6d0db38c2efda38dd"
        },
        "date": 1727770496789,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 581,
            "range": "±1.69%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 697,
            "range": "±2.87%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}