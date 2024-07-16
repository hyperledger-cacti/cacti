window.BENCHMARK_DATA = {
  "lastUpdate": 1721140523362,
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
          "id": "c8b33c8052c609e449f83a5c85d74cbbeeb1cca1",
          "message": "build: project-wide upgrade of joi to v17.13.3\n\n1. Also sneaking in a fix for the ci.yaml where the coverage path env\nvariables were not declared for the stellar connector's tests and that\nwas causing the test job to fail entirely.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-16T07:18:22-07:00",
          "tree_id": "71ff846f1d5c54947fd3fe85c57666ec9eea08c8",
          "url": "https://github.com/hyperledger/cacti/commit/c8b33c8052c609e449f83a5c85d74cbbeeb1cca1"
        },
        "date": 1721140521662,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 611,
            "range": "±1.80%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 372,
            "range": "±1.19%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      }
    ]
  }
}