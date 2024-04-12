window.BENCHMARK_DATA = {
  "lastUpdate": 1712906972434,
  "repoUrl": "https://github.com/hyperledger/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "michal.bajer@fujitsu.com",
            "name": "Michal Bajer",
            "username": "outSH"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "fa27fde9a28f83ff29964693be656dc107046517",
          "message": "feat(cactus-plugin-ledger-connector-iroha): remove deprecated iroha connector\n\n- Iroha connector is broken for some time and it's SDK does't seem to be\n    actively supported anymore (in regards of bug or security fixes).\n\nCloses: #3159\nPart of: #3155\n\nSigned-off-by: Michal Bajer <michal.bajer@fujitsu.com>",
          "timestamp": "2024-04-01T15:13:07-07:00",
          "tree_id": "179f468f39a57de520043dac3f6866ce0b0e1dd2",
          "url": "https://github.com/hyperledger/cacti/commit/fa27fde9a28f83ff29964693be656dc107046517"
        },
        "date": 1712010494895,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 573,
            "range": "±1.90%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 349,
            "range": "±1.97%",
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
          "id": "5762dadfe108c6c73251d5b474961e4888941b90",
          "message": "feat(cmd-api-server): add gRPC plugin auto-registration support\n\n1. The API server supports gRPC endpoints, but plugins are not yet able\nto register their own gRPC services to be exposed the same way that was\nalready possible for HTTP endpoints to be registered dynamically. This\nwas due to an oversight when the original contribution was made by Peter\n(who was the person making the oversight - good job Peter)\n2. The functionality works largely the same as it does for the HTTP\nendpoints but it does so for gRPC services (which is the equivalent of\nendpoints in gRPC terminology, so service === endpoint in this context.)\n3. There are new methods added to the public API surface of the API server\npackage which can be used to construct gRPC credential and server objects\nusing the instance of the library that is used by the API server.\nThis is necessary because the validation logic built into grpc-js fails\nfor these mentioned objects if the creds or the server was constructed\nwith a different instance of the library than the one used by the API\nserver.\n4. Different instance in this context means just that the exact same\nversion of the library was imported from a different path for example\nthere could be the node_modules directory of the besu connector and also\nthe node_modules directory of the API server.\n5. Because of the problem outlined above, the only way we can have functioning\ntest cases is if the API server exposes its own instance of grpc-js.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-04-04T08:17:07-07:00",
          "tree_id": "8843922adaa37c5969b007999fef27d27a40c281",
          "url": "https://github.com/hyperledger/cacti/commit/5762dadfe108c6c73251d5b474961e4888941b90"
        },
        "date": 1712244529010,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 550,
            "range": "±1.49%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 355,
            "range": "±1.51%",
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
          "id": "c569460b099469184a7953ffc0f806ddf3facb38",
          "message": "feat(cmd-api-server): add ConnectRPC auto-registration for plugins\n\n1. This is enabling plugins to expose their operations via ConnectRPC\nservices which is very similar to gRPC but it comes with a few extra\nbells and whistles that can come in very handy.\n2. There is an upcoming pull request that makes it so that the keychain\nmemory plugin implements and registers its services via this newly added\nhook of the API server. The importance of this is that test coverage for\nthe code in this commit resides on another branch, meaning that even though\nthere are no new test cases on this branch, the feature has been extensively\ntested and there is test-automation in place to continue verifying it\nas well.\n3. The main difference between the hook methods are that for CRPC the\nAPI server expects an array of service definition+implementation pairs\ninstead of just a single one. This was a design decision forced by the\nissues with implementing separate services in a single class: The compiler\nwas hard to appease in a way that kept the code clean. gRPC did not suffer\nfrom this and therefore the registration methods defined for that only\nreturn a single gRPC service defintion+implementation pair which can combine\nany number of .proto services.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-04-08T17:19:14-07:00",
          "tree_id": "66d28fc1c3da87e53764470516168ae6040fa106",
          "url": "https://github.com/hyperledger/cacti/commit/c569460b099469184a7953ffc0f806ddf3facb38"
        },
        "date": 1712623164928,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 579,
            "range": "±1.69%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 359,
            "range": "±1.44%",
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
          "id": "383f8528d88989b44c9763fc883c3d9ac74da21e",
          "message": "feat(core): add configureExpressAppBase() utility function\n\n1. The idea here is to re-use the common basic tasks of configuring an\nexpress instance similar to how the API server does it but without having\nthe chicken-egg problem of circular dependencies between the API server\nand the plugins.\n2. More detailed discussion can be seen in this other pull request in\nthe comments: https://github.com/hyperledger/cacti/pull/3169\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-04-08T22:11:33-07:00",
          "tree_id": "7d7999e1129c7c36443db1c4f6dbd7f408183ca3",
          "url": "https://github.com/hyperledger/cacti/commit/383f8528d88989b44c9763fc883c3d9ac74da21e"
        },
        "date": 1712640615839,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 583,
            "range": "±1.69%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 364,
            "range": "±1.26%",
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
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "68a46c2be48760e576b0c44cba13dcb731b8e828",
          "message": "build(deps): bump h2\n\nBumps [h2](https://github.com/hyperium/h2) from 0.3.24 to 0.3.26.\n- [Release notes](https://github.com/hyperium/h2/releases)\n- [Changelog](https://github.com/hyperium/h2/blob/v0.3.26/CHANGELOG.md)\n- [Commits](https://github.com/hyperium/h2/compare/v0.3.24...v0.3.26)\n\n---\nupdated-dependencies:\n- dependency-name: h2\n  dependency-type: indirect\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>",
          "timestamp": "2024-04-12T00:16:19-07:00",
          "tree_id": "7fc713a2170cd7b26ef42fcb241a3cb64907dd03",
          "url": "https://github.com/hyperledger/cacti/commit/68a46c2be48760e576b0c44cba13dcb731b8e828"
        },
        "date": 1712906969686,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 571,
            "range": "±1.84%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 353,
            "range": "±1.33%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}