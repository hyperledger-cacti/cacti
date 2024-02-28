window.BENCHMARK_DATA = {
  "lastUpdate": 1709114528995,
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
          "id": "0804bab4c9b43f2e22be6d77be127415a9a0532f",
          "message": "perf(cmd-api-server): add demonstration of continuous benchmarking\n\nPrimary change:\n---------------\n\nThis is the ice-breaker for some work that got stuck related to this issue:\nhttps://github.com/hyperledger/cacti/issues/2672\n\nThe used benchamking library (benchmark.js) is old but solid and has\nalmost no dependencies which means that we'll be in the clear longer term\nwhen it comes to CVEs popping up.\n\nThe benchmarks added here are very simple and measure the throughput of\nthe API server's Open API spec providing endpoints.\n\nThe GitHub action that we use is designed to do regression detection and\nreporting but this is hard to verify before actually putting it in place\nas we cannot simulate the CI environment's clone on a local environment.\n\nThe hope is that this change will make it so that if someone tries to\nmake a code change that will lower performance significantly, then we\ncan catch that at the review stage instead of having to find out later.\n\nSecondary change:\n-----------------\n\n1. Started using tsx in favor of ts-node because it appers to be about\n5% faster when looking at the benchmark execution. It also claims to have\nless problems with ESM compared to ts-node so if this initial trial\ngoes well we could later on decide to swap out ts-node with it project-wide.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-02-02T00:09:44-08:00",
          "tree_id": "741d7ddf0400698b2fdfb3d8ac58c18e884a4afe",
          "url": "https://github.com/hyperledger/cacti/commit/0804bab4c9b43f2e22be6d77be127415a9a0532f"
        },
        "date": 1706862334141,
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
            "value": 387,
            "range": "±1.39%",
            "unit": "ops/sec",
            "extra": "180 samples"
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
          "id": "9fd38983feb9a114e383294224121f850070093a",
          "message": "build(deps): fix CVE-2022-25887 by upgrading sanitize-html to v2.11.0\n\nAlso upgraded the typings to the latest available one.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n(cherry picked from commit ad4e91bbcd216eaa36a371278a65a033698754a8)",
          "timestamp": "2024-02-13T22:41:10-08:00",
          "tree_id": "f65d627d885a87439d730fa78bba8431ffdcefce",
          "url": "https://github.com/hyperledger/cacti/commit/9fd38983feb9a114e383294224121f850070093a"
        },
        "date": 1707893811587,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 618,
            "range": "±1.64%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 384,
            "range": "±1.50%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "anmolbansal1807@gmail.com",
            "name": "Anmol Bansal",
            "username": "AnmolBansalDEV"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "6a476a0f1143380d2fd6bf81c68b0842c13c6ae2",
          "message": "feat(connector-polkadot): add connector pkg, openapi specs, test suite\n\nPrimary Changes\n---------------\n1. Created openapi specs for get-prometheus-exporter-metrics, get-transaction-info,\n   get-raw-transaction, sign-raw-transaction, run-transaction, deploy-contract-ink,\n   and invoke-contract endpoints\n2. Created relevant types for the request as well as response for the above endpoints\n3. Added generated code for these endpoints\n4. Created connector class with functions to interact with the polkadot ledger\n5. Created webservices to interact with the endpoint and the relevant class method\n6. Created unit and integration testcases in jest to test base functionality of the connector\n\nSecondary Changes\n-----------------\n1. Added an ink! contract for running the testcases\n2. Added the polkadot connector to ci workflow\n3. Created substrate.md to docs-cactus\n4. Added the polkadot connector to tsconfig.json\n\nSigned-off-by: Anmol Bansal <anmolbansal1807@gmail.com>\n\n=======================================================================\n\nfeat(polkadot): creation of polkadot AIO image\n\nPrimary Changes\n---------------\n1. Updated docker image to include multi-stage build\n2. Added healthcheck to the image\n3. Added Supervisord and removed unneccessary start script\n4. Updated the Readme with relevant commands\n\nSigned-off-by: Anmol Bansal <anmolbansal1807@gmail.com>\n\n=======================================================================\n\nfeat(polkadot): update substrate test tooling\n\nPrimary Changes\n---------------\n1. Added correct healthcheck for ledger container\n2. Update the Substrate test ledger testcases\n\nSigned-off-by: Anmol Bansal <anmolbansal1807@gmail.com>\n\n=======================================================================\n\nfeat(polkadot): creation of readme and architecture reference diagrams\n\nPrimary Changes\n---------------\n1. Added README.md for the connector\n2. Added Architecture diagrams for the plugin\n\nSecondary Changes\n-----------------\n1. Added the docker image for the polkadot connector\n\nFixes hyperledger/cacti#726\nFixes hyperledger/cacti#727\nFixes hyperledger/cacti#627\n\nCo-authored-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n\nSigned-off-by: Anmol Bansal <anmolbansal1807@gmail.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-02-27T13:31:05-08:00",
          "tree_id": "1e627dac65b9400842418f4e0039467a9c3443eb",
          "url": "https://github.com/hyperledger/cacti/commit/6a476a0f1143380d2fd6bf81c68b0842c13c6ae2"
        },
        "date": 1709070394642,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 649,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 415,
            "range": "±2.27%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "andre.augusto@tecnico.ulisboa.pt",
            "name": "André Augusto",
            "username": "AndreAugusto11"
          },
          "committer": {
            "email": "9387513+outSH@users.noreply.github.com",
            "name": "Michal Bajer",
            "username": "outSH"
          },
          "distinct": true,
          "id": "f57ab70412a61f943b6a4ac88baa074f5893fc45",
          "message": "test(test-tooling): fix FabricTestLedger INVALID_ENDORSER_TRANSACTION\n\n* reverts changes of commit 3371772c582389f6ee0c6fb66af875dd93cc94c6,\nwhich seems to be breaking the Fabric Test Ledger\n\nResults of further investigation into the root cause done by Peter:\n1. The URLs we specify have the `grpcs://` protocol specified meaning that\nTLS is used for securing the connection.\n2. Certificates that are generated by the Fabric-provided boostrap scripts\nwhen setting up crypto materials for the ledger are generated with `localhost`\nas the hostname instead of the IP address of localhost.\n3. The C++ gRPC implementation does not support mixing IP addresses and\nhostnames when it comes to connections that are using TLS, e.g. if the\ncertificate we are using was made out for `localhost` then it won't work\nfor `127.0.0.1` even though technically from our perspective they meaning\nthe same thing (do note however that technically localhost could be set\nup to resolve to something other than 127.0.0.1 in a DNS server so the\ndifference is meaningful).\n\nSource: https://github.com/grpc/grpc/issues/2691\n\ncloses #3009\n\nCo-authored-by: Peter Somogyvari <peter.somogyvari@accenture.com>\n\nSigned-off-by: André Augusto <andre.augusto@tecnico.ulisboa.pt>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-02-28T10:52:27+01:00",
          "tree_id": "cd8fd97c24f621973d23107f70892bbace4f3448",
          "url": "https://github.com/hyperledger/cacti/commit/f57ab70412a61f943b6a4ac88baa074f5893fc45"
        },
        "date": 1709114527296,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 641,
            "range": "±1.74%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 396,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}