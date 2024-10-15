window.BENCHMARK_DATA = {
  "lastUpdate": 1728971431000,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
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
          "id": "a4ec6118ed356fe12d35c2a6eddfd9eab1a37141",
          "message": "docs: change github org from hyperledger to hyperledger-cacti\n\nThe diff here came to be by doing a simple search & replace repo-wise\nwhere \"https://github.com/hyperledger/cacti/\" got replaced with\n\"https://github.com/hyperledger-cacti/cacti/\"\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-10-14T22:39:18-07:00",
          "tree_id": "34515692c43b0a7d5934932967012bd8f1902fc5",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/a4ec6118ed356fe12d35c2a6eddfd9eab1a37141"
        },
        "date": 1728971428090,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 596,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 724,
            "range": "±3.13%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      }
    ]
  }
}