window.BENCHMARK_DATA = {
  "lastUpdate": 1721942607579,
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
          "id": "1ce7c605778ef4cc53e78e480e70dc48669ebf5b",
          "message": "chore(release): publish v2.0.0-rc.3\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-24T17:47:00+05:30",
          "tree_id": "c4097ca89262a035e7a7f101e17e3da0282158a2",
          "url": "https://github.com/hyperledger/cacti/commit/1ce7c605778ef4cc53e78e480e70dc48669ebf5b"
        },
        "date": 1721824515635,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 602,
            "range": "±1.77%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 366,
            "range": "±1.41%",
            "unit": "ops/sec",
            "extra": "181 samples"
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
            "email": "sandeepn.official@gmail.com",
            "name": "Sandeep Nishad",
            "username": "sandeepnRES"
          },
          "distinct": true,
          "id": "1ce7c605778ef4cc53e78e480e70dc48669ebf5b",
          "message": "chore(release): publish v2.0.0-rc.3\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-24T17:47:00+05:30",
          "tree_id": "c4097ca89262a035e7a7f101e17e3da0282158a2",
          "url": "https://github.com/hyperledger/cacti/commit/1ce7c605778ef4cc53e78e480e70dc48669ebf5b"
        },
        "date": 1721824950235,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 726,
            "range": "±2.48%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "jagpreet.singh.sasan@accenture.com",
            "name": "jagpreetsinghsasan",
            "username": "jagpreetsinghsasan"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "9c4d9be8ac7a1608bf15cbaf887ed0836c02f747",
          "message": "build(api-client): generate go client\n\n    Primary Changes\n    ----------------\n    1. Updated package.json file for packages to\n       include the new codegen script\n    2. Added a new dep, replace for string\n       manupulation in package.json\n\nFixes #393\n\nSigned-off-by: jagpreetsinghsasan <jagpreet.singh.sasan@accenture.com>",
          "timestamp": "2024-07-25T14:06:22-07:00",
          "tree_id": "4db60a87b0df4cca6a76f559d461c607d148f604",
          "url": "https://github.com/hyperledger/cacti/commit/9c4d9be8ac7a1608bf15cbaf887ed0836c02f747"
        },
        "date": 1721942604837,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 600,
            "range": "±1.76%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 367,
            "range": "±1.44%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}