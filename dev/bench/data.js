window.BENCHMARK_DATA = {
  "lastUpdate": 1721248243237,
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
          "id": "87f5f609d738becc33e0bcc5232498a95e4c00d2",
          "message": "test(test-tooling): fix WS identity server port publish configuration\n\n1. The hostconfig portion of the container start configuration was not\nbeing set up correctly which made it so that the exposed ports were not\npublished on randomized ports like they were supposed to.\n2. This caused  the `fabric-v2-2-x/run-transaction-with-ws-ids.test.ts`\ntest to fail because it couldn't map the container port to a host machine\nport.\n3. Setting up the ws-test-server.ts class so that it does map the ports\nto the host machine solved the issue.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-17T13:15:43-07:00",
          "tree_id": "0dfd34409fd8b89fcce8ab242479cc60ee4ce58b",
          "url": "https://github.com/hyperledger/cacti/commit/87f5f609d738becc33e0bcc5232498a95e4c00d2"
        },
        "date": 1721248241128,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 607,
            "range": "±1.79%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 364,
            "range": "±1.41%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}