window.BENCHMARK_DATA = {
  "lastUpdate": 1716073677217,
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
          "id": "9b41377c3885cf12be3c0f49bd2745200b0d07d3",
          "message": "feat(plugin-keychain-memory): add observability via RxJS ReplaySubjects\n\n1. This is an example of how to add observability to a plugin such as\nif you had to somehow expose the stream of transaction execution requests\nflowing through a connector plugin but did not feel like setting up Kafka\nor RabbitMQ just for this and instead opted to do it with an in-process,\npurely NodeJS/Javascript based solution.\n2. The downside of this is of course that this doesn't work well in a\ndistributed computing environment just by itself, since if you were to\nhost a fleet of servers running the same connector plugin with horizontal\nscaling, then this wouldn't be able to observe all the invocations across\nthe server fleet, but it would still make it easier to implement a functionality\nlike that.\n3. The main purpose of this pull request is educational. The keychain memory\nplugin is only used for testing and demonstration purposes and I wanted to\nshow to a few other contributors what I meant when I was explaining that\nthey could just use RxJS subjects to allow consumers of the connector plugins\nto observe the stream of transactions flowing through said connector plugin\ninstance.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-18T15:03:59-07:00",
          "tree_id": "090eee4ea4fb41114e168ae586a92de5df1f3ce4",
          "url": "https://github.com/hyperledger/cacti/commit/9b41377c3885cf12be3c0f49bd2745200b0d07d3"
        },
        "date": 1716071337762,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 725,
            "range": "±3.57%",
            "unit": "ops/sec",
            "extra": "179 samples"
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
          "id": "ccc175a51400211255aaa6bb0b086787fa7a96ee",
          "message": "build(deps-dev): bump express and @types/express project-wide\n\nBumps [express](https://github.com/expressjs/express) from 4.18.2 to 4.19.2.\n- [Release notes](https://github.com/expressjs/express/releases)\n- [Changelog](https://github.com/expressjs/express/blob/master/History.md)\n- [Commits](https://github.com/expressjs/express/compare/4.18.2...4.19.2)\n\n---\nupdated-dependencies:\n- dependency-name: express\n  dependency-type: direct:development\n...\n\nCo-authored-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-18T15:42:35-07:00",
          "tree_id": "77774fcb1feee4b0a7a644812eeddc65ee6d8489",
          "url": "https://github.com/hyperledger/cacti/commit/ccc175a51400211255aaa6bb0b086787fa7a96ee"
        },
        "date": 1716073171648,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 589,
            "range": "±1.80%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 365,
            "range": "±1.37%",
            "unit": "ops/sec",
            "extra": "181 samples"
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
          "id": "ccc175a51400211255aaa6bb0b086787fa7a96ee",
          "message": "build(deps-dev): bump express and @types/express project-wide\n\nBumps [express](https://github.com/expressjs/express) from 4.18.2 to 4.19.2.\n- [Release notes](https://github.com/expressjs/express/releases)\n- [Changelog](https://github.com/expressjs/express/blob/master/History.md)\n- [Commits](https://github.com/expressjs/express/compare/4.18.2...4.19.2)\n\n---\nupdated-dependencies:\n- dependency-name: express\n  dependency-type: direct:development\n...\n\nCo-authored-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-18T15:42:35-07:00",
          "tree_id": "77774fcb1feee4b0a7a644812eeddc65ee6d8489",
          "url": "https://github.com/hyperledger/cacti/commit/ccc175a51400211255aaa6bb0b086787fa7a96ee"
        },
        "date": 1716073674033,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 761,
            "range": "±2.98%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      }
    ]
  }
}