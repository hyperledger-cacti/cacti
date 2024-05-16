window.BENCHMARK_DATA = {
  "lastUpdate": 1715828359900,
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
      }
    ]
  }
}