window.BENCHMARK_DATA = {
  "lastUpdate": 1788423680324,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "committer": {
            "name": "VRamakrishna",
            "username": "VRamakrishna",
            "email": "vramakr2@in.ibm.com"
          },
          "id": "e7d5b3bbc7229b8f3410c5736df61f3dd6f98e98",
          "message": "ci(docs): version docs publishing with mike\n\nPublish versioned docs via mike instead of mkdocs gh-deploy: tag pushes\ndeploy <version> with a moving `latest` alias (default), main pushes\nrefresh `dev`. main is gated on doc-path changes; tags always publish.\n\nAssisted-by: Claude Opus 4.8\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-09-01T20:40:00Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/e7d5b3bbc7229b8f3410c5736df61f3dd6f98e98"
        },
        "date": 1788423465907,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 752,
            "range": "±3.88%",
            "unit": "ops/sec",
            "extra": "175 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 871,
            "range": "±2.10%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "committer": {
            "name": "VRamakrishna",
            "username": "VRamakrishna",
            "email": "vramakr2@in.ibm.com"
          },
          "id": "e7d5b3bbc7229b8f3410c5736df61f3dd6f98e98",
          "message": "ci(docs): version docs publishing with mike\n\nPublish versioned docs via mike instead of mkdocs gh-deploy: tag pushes\ndeploy <version> with a moving `latest` alias (default), main pushes\nrefresh `dev`. main is gated on doc-path changes; tags always publish.\n\nAssisted-by: Claude Opus 4.8\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-09-01T20:40:00Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/e7d5b3bbc7229b8f3410c5736df61f3dd6f98e98"
        },
        "date": 1788423676657,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 874,
            "range": "±4.07%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}