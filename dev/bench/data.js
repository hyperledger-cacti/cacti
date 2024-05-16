window.BENCHMARK_DATA = {
  "lastUpdate": 1715844684493,
  "repoUrl": "https://github.com/hyperledger/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "eduardovasques10@tecnico.ulisboa.pt",
            "name": "eduv09",
            "username": "eduv09"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "231a5e532bcb8219986dd7f5c8fa4d66cef99f34",
          "message": "feat(bungee-hermes): process & merge views\n\n- Added new types for view merging\n- Created some merge and process policies for demonstration\n- new endpoints and plugin logic to merge and process views\n- two new tests to test new functionality\n- utility function to fully deserialize a view\n- slightly changed View type, to keep reccord of its old versions metadata\n- updated README.md\n\nSigned-off-by: eduv09 <eduardovasques10@tecnico.ulisboa.pt>",
          "timestamp": "2024-05-15T19:40:09-07:00",
          "tree_id": "dabff8f919efd65772a4aa03867ed55937eb9099",
          "url": "https://github.com/hyperledger/cacti/commit/231a5e532bcb8219986dd7f5c8fa4d66cef99f34"
        },
        "date": 1715827854281,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 591,
            "range": "±1.67%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 363,
            "range": "±1.41%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "eduardovasques10@tecnico.ulisboa.pt",
            "name": "eduv09",
            "username": "eduv09"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "231a5e532bcb8219986dd7f5c8fa4d66cef99f34",
          "message": "feat(bungee-hermes): process & merge views\n\n- Added new types for view merging\n- Created some merge and process policies for demonstration\n- new endpoints and plugin logic to merge and process views\n- two new tests to test new functionality\n- utility function to fully deserialize a view\n- slightly changed View type, to keep reccord of its old versions metadata\n- updated README.md\n\nSigned-off-by: eduv09 <eduardovasques10@tecnico.ulisboa.pt>",
          "timestamp": "2024-05-15T19:40:09-07:00",
          "tree_id": "dabff8f919efd65772a4aa03867ed55937eb9099",
          "url": "https://github.com/hyperledger/cacti/commit/231a5e532bcb8219986dd7f5c8fa4d66cef99f34"
        },
        "date": 1715828358301,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 773,
            "range": "±2.89%",
            "unit": "ops/sec",
            "extra": "180 samples"
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
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "8ff9b653ec6159a290b554152c827aaac50f8eae",
          "message": "build: bump rustls\n\nBumps the cargo group with 1 update in the /packages/cactus-core-api directory: [rustls](https://github.com/rustls/rustls).\n\n\nUpdates `rustls` from 0.21.9 to 0.21.12\n- [Release notes](https://github.com/rustls/rustls/releases)\n- [Changelog](https://github.com/rustls/rustls/blob/main/CHANGELOG.md)\n- [Commits](https://github.com/rustls/rustls/compare/v/0.21.9...v/0.21.12)\n\n---\nupdated-dependencies:\n- dependency-name: rustls\n  dependency-type: indirect\n  dependency-group: cargo\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>",
          "timestamp": "2024-05-16T12:37:05+05:30",
          "tree_id": "f71278b12a6e305131267b3cbf525c9787e74520",
          "url": "https://github.com/hyperledger/cacti/commit/8ff9b653ec6159a290b554152c827aaac50f8eae"
        },
        "date": 1715844056243,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 582,
            "range": "±1.85%",
            "unit": "ops/sec",
            "extra": "175 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 359,
            "range": "±1.23%",
            "unit": "ops/sec",
            "extra": "180 samples"
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
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "8ff9b653ec6159a290b554152c827aaac50f8eae",
          "message": "build: bump rustls\n\nBumps the cargo group with 1 update in the /packages/cactus-core-api directory: [rustls](https://github.com/rustls/rustls).\n\n\nUpdates `rustls` from 0.21.9 to 0.21.12\n- [Release notes](https://github.com/rustls/rustls/releases)\n- [Changelog](https://github.com/rustls/rustls/blob/main/CHANGELOG.md)\n- [Commits](https://github.com/rustls/rustls/compare/v/0.21.9...v/0.21.12)\n\n---\nupdated-dependencies:\n- dependency-name: rustls\n  dependency-type: indirect\n  dependency-group: cargo\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>",
          "timestamp": "2024-05-16T12:37:05+05:30",
          "tree_id": "f71278b12a6e305131267b3cbf525c9787e74520",
          "url": "https://github.com/hyperledger/cacti/commit/8ff9b653ec6159a290b554152c827aaac50f8eae"
        },
        "date": 1715844682750,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 779,
            "range": "±2.52%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}