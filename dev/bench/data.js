window.BENCHMARK_DATA = {
  "lastUpdate": 1716412611936,
  "repoUrl": "https://github.com/hyperledger/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "fazzatti@gmail.com",
            "name": "Fabricius Zatti",
            "username": "fazzatti"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "58fa94e194f7716934e717a0e3075773ebd31b4c",
          "message": "feat(test-tooling): add Stellar test ledger\n\n- Add a Stellar test ledger class that can be used in integration tests\n  to start and stop a Stellar test network based on the Stellar\n  quickstart docker image: https://github.com/stellar/quickstart\n\n- Inclues the following services for fetching ledger state, executing\nclassic transactions and also soroban smart contracts transactions.\n  - Stellar Core\n  - Horizon API\n  - Soroban RPC\n  - Friendbot\n\nFixes #3239\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>\nSigned-off-by: Fabricius Zatti <fazzatti@gmail.com>",
          "timestamp": "2024-05-22T14:04:57-07:00",
          "tree_id": "5a355871030f8377ac427a148fca249bbf683fd6",
          "url": "https://github.com/hyperledger/cacti/commit/58fa94e194f7716934e717a0e3075773ebd31b4c"
        },
        "date": 1716412610023,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 598,
            "range": "±1.58%",
            "unit": "ops/sec",
            "extra": "180 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 369,
            "range": "±1.45%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      }
    ]
  }
}