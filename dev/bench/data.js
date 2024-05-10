window.BENCHMARK_DATA = {
  "lastUpdate": 1715370208484,
  "repoUrl": "https://github.com/hyperledger/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "ruzell.vince.aquino@accenture.com",
            "name": "ruzell22",
            "username": "ruzell22"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "379d41dd4b2cc994801c85f1fa16ea854f0301f7",
          "message": "feat(connector-besu): add continuous benchmarking with JMeter\n\nPrimary Changes\n---------------\n\n1. Added continuous benchmarking using JMeter that reports performance\nin cactus-plugin-ledger-connector-besu using one of its endpoint.\n\nfixes: #2672\n\nSigned-off-by: ruzell22 <ruzell.vince.aquino@accenture.com>",
          "timestamp": "2024-05-10T12:19:01-07:00",
          "tree_id": "a54c70c1e0c103314b2bfa7a9c58f136671d1105",
          "url": "https://github.com/hyperledger/cacti/commit/379d41dd4b2cc994801c85f1fa16ea854f0301f7"
        },
        "date": 1715370206035,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 774,
            "range": "±2.79%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      }
    ]
  }
}