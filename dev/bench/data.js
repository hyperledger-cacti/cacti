window.BENCHMARK_DATA = {
  "lastUpdate": 1725877162337,
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
      }
    ]
  }
}