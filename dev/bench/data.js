window.BENCHMARK_DATA = {
  "lastUpdate": 1712244530447,
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
      }
    ]
  }
}