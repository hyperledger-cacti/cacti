window.BENCHMARK_DATA = {
  "lastUpdate": 1712010497825,
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
      }
    ]
  }
}