window.BENCHMARK_DATA = {
  "lastUpdate": 1720631218859,
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
          "id": "06cb8d02e3cb278f6d33dd175732013d880b4d53",
          "message": "test(connector-corda): fix flow-database-access-v4-8 test case\n\nPrimary Change:\n---------------\n\n1. The test case was broken due to a number of different issues related\nto the AIO image build an also the connector image build, but on top of\nthose problems it also had misconfiguration issues where the port number\nwasn't set to what it should be for the RPC connection that the connector\ncontainer uses to establish communications with the AIO ledger image.\n\nSecondary Change(s):\n---------------------\n1. Fixed 2 bugs in the test tooling package where the port configuration\nwas not randomizing the exposed ports of the corda connector container and\nthe corda test ledger leading to accessibility issues.\n2. Also introduced a createJvmInt(...) utility function on the corda connector\npackage which allows the flowdb test case to construct the flow invocation\nrequests with much less manual labor (manual coding).\n\nIn order to properly verify that this test case is working, a few other\npull requests have to be merged first and container images from those\nsources published as well.\n\nIn addition to the pull request dependencies we also depend on a permission\nissue being resolved in the larger GitHub organization itself as well:\nhttps://github.com/hyperledger/governance/issues/299\n\nDepends on #3386\nDepends on #3387\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-10T09:54:41-07:00",
          "tree_id": "bd790ea082ec82df04ce5aca98aa5416c1ece7b8",
          "url": "https://github.com/hyperledger/cacti/commit/06cb8d02e3cb278f6d33dd175732013d880b4d53"
        },
        "date": 1720631217098,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 604,
            "range": "±1.71%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 361,
            "range": "±1.54%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}