window.BENCHMARK_DATA = {
  "lastUpdate": 1729617246059,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "aldousss.alvarez@gmail.com",
            "name": "aldousalvarez",
            "username": "aldousalvarez"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "891a70567243eb96879680e3deea1136d9ad654c",
          "message": "test(test-plugin-ledger-connector-besu): jestify v21-sign-transaction-endpoint\n\nPrimary Changes\n----------------\npackages/cactus-test-plugin-ledger-connector-besu/src/test/typescript/\nintegration/plugin-validator-besu/v21-sign-transaction-endpoint.test.ts\n\nFixes #3565\n\nSigned-off-by: aldousalvarez <aldousss.alvarez@gmail.com>",
          "timestamp": "2024-10-22T09:54:22-07:00",
          "tree_id": "29ad48dffd9d11615f87549860c2ae5de307fe73",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/891a70567243eb96879680e3deea1136d9ad654c"
        },
        "date": 1729617242683,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 719,
            "range": "±2.63%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}