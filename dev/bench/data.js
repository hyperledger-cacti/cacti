window.BENCHMARK_DATA = {
  "lastUpdate": 1720589604781,
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
          "id": "d6629c5b6b0df29caed8a2b0b0b3306cb2bdcb86",
          "message": "refactor(connector-quorum): retire Quorum connector\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-09T22:12:33-07:00",
          "tree_id": "bf299cbd2427dd9b16db9c65416506c1617500ff",
          "url": "https://github.com/hyperledger/cacti/commit/d6629c5b6b0df29caed8a2b0b0b3306cb2bdcb86"
        },
        "date": 1720589601573,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 602,
            "range": "±1.71%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 372,
            "range": "±1.57%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}