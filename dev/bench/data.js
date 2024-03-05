window.BENCHMARK_DATA = {
  "lastUpdate": 1709604665546,
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
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "777bc7edc22649a68539da4bcc1b0516adf79d2e",
          "message": "build(deps): bump sanitize-html from 2.7.0 to 2.12.1\n\nBumps [sanitize-html](https://github.com/apostrophecms/sanitize-html) from 2.7.0 to 2.12.1.\n- [Changelog](https://github.com/apostrophecms/sanitize-html/blob/main/CHANGELOG.md)\n- [Commits](https://github.com/apostrophecms/sanitize-html/compare/2.7.0...2.12.1)\n\n---\nupdated-dependencies:\n- dependency-name: sanitize-html\n  dependency-type: direct:production\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>",
          "timestamp": "2024-03-03T17:27:53-08:00",
          "tree_id": "32291af004349416ed6de17da00b3a7b3906d6c6",
          "url": "https://github.com/hyperledger/cacti/commit/777bc7edc22649a68539da4bcc1b0516adf79d2e"
        },
        "date": 1709516644201,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 615,
            "range": "±1.81%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 388,
            "range": "±1.31%",
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
          "id": "f58576cd04be418e2626b5c5feed0431e3321aa4",
          "message": "build(deps): upgrade pkg openapi-types to v12.1.3 project-wide\n\nThe command used to perform this upgrade was:\n\n`yarn up openapi-types --exact`\n\nSimple quality of life improvement. The openapi-types package is used\nmainly as a helper for dealing with Open API spec related logic in a\ncleaner manner. It doesn't really affect the runtime behavior of the\ncode that much.\nWith all that said, it is worthwhile to consolidate the versions we use\nbecause strange/hard to debug compiler bugs can (and do) emerge from\ntime to time just on account of us juggling multiple different versions\nof certain libraries.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-03T22:16:35-08:00",
          "tree_id": "5ec75fdc84e6b2c5fd1e42af8733210ceb8e3311",
          "url": "https://github.com/hyperledger/cacti/commit/f58576cd04be418e2626b5c5feed0431e3321aa4"
        },
        "date": 1709533956955,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 608,
            "range": "±1.73%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 389,
            "range": "±1.35%",
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
          "id": "f02a0aaf8383557bb0b1a01b3e60746730599345",
          "message": "build(deps): project-wide upgrade to uuid@9.0.2 and @types/uuid@9.0.8\n\nQuality of life dependency consolidation and regular maintenance.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-04T00:15:42-08:00",
          "tree_id": "4120dc70f8c760db4b1aa09883342553f1e7d31e",
          "url": "https://github.com/hyperledger/cacti/commit/f02a0aaf8383557bb0b1a01b3e60746730599345"
        },
        "date": 1709541045852,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 572,
            "range": "±2.20%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 381,
            "range": "±1.40%",
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
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "d9b5a0d11e75dbeaba27ceace5d30297ee76af87",
          "message": "build(deps): upgrade to prettier@3.2.5, eslint@8.57.0\n\nAlso upgraded the ESLint related packages such as the typescript parser\nplugin and all the other plugins or configuration management packages\nrelated to ESLint in general.\n\nThe reason why it's important that we keep up to date with ESLint is\nbecause newer versions of Typescript are not getting backported to older\nversions of ESLint fast enough (if at all) so to be able to reliably\nlint our newer Typescript code, we need to keep up to date with ESLint\nas well.\n\nIn addition to the dependency upgrades we are also applying the automatic\nformatter's changes that it started making after the upgrade.\n\nTo-do for later: Consolidate the ESLint versions used among the different\ncomponents of the project because right now we still have a few packages\nthat declare much older versions of ESLint such as 3.x and 4.x.\n\nDepends on #3052 because that pull request also applies some of the\nautomatic formatting changes that were forgotten in an earlier pull request.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-04T08:02:33-08:00",
          "tree_id": "7003e08f6677f5581a3eb9335a580cd7df609883",
          "url": "https://github.com/hyperledger/cacti/commit/d9b5a0d11e75dbeaba27ceace5d30297ee76af87"
        },
        "date": 1709569070318,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 616,
            "range": "±1.56%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 389,
            "range": "±1.56%",
            "unit": "ops/sec",
            "extra": "182 samples"
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
          "id": "59dbd6ac571a246fc2859dff7000ef37fc0609ff",
          "message": "refactor(test-tooling): fix types of streams: use NodeJS.ReadableStream\n\n1. The container management library that we use in the test infrastructure\n(called dockerode) is expecting streams that are defined in the global\nnamespace of the `@types/node` library, e.g. the standard library of NodeJS\nitself.\n2. Previously we were using the \"streams\" package to provide type information\nto the streams that we were passing around to dockerode and it was working\nfine, but after some changes that seem unrelated this has broken the\ncompilation process.\n3. The mentioned changes are not yet on the main branch, but we expect\nthem to be there soon and so this change is laying the groundwork for that\nby pre-emptively fixing the broken build's root cause which is that the\ntest-tooling package does not declare it's typings related dependencies\ncorrectly: It implicitly uses the NodeJS standard library's types but\nso far had not declared them on the package level.\n4. This change is therefore to rectify the issue of the `@types/node`\ndependency missing from the test-tooling package and also the refactoring\nof some of the test ledger classes which were relying on the `streams`\nbuiltin package instead of correctly using the NodeJS.ReadableStream global.\n5. Earlier the reasoning for this was that we try to avoid pulling in\ntypes from the global scope because we try to avoid any sort of dependency\non the global scope in general. Once we have proof though that this is\ncausing issues with the build, then we must give up the principle for\npractical reasons (and only in the minimum viable scope, e.g. this does\nnot change the fact that everywhere else in the codebase we should still\ndo our best to avoid using the global scoped classes, types, functions,\netc..).\n\nThank you to @AndreAugusto11 and @RafaelAPB for pointing out this issue\nthrough the pull request of his that is currently being worked on at the\ntime of this writing:\nhttps://github.com/RafaelAPB/blockchain-integration-framework/pull/72\n\nRelated to but does not address #2811\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-04T09:39:35-08:00",
          "tree_id": "944e4462cdd9a66dbef02ef55d5e38ff14929194",
          "url": "https://github.com/hyperledger/cacti/commit/59dbd6ac571a246fc2859dff7000ef37fc0609ff"
        },
        "date": 1709574888720,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 626,
            "range": "±1.74%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 399,
            "range": "±1.21%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "49699333+dependabot[bot]@users.noreply.github.com",
            "name": "dependabot[bot]",
            "username": "dependabot[bot]"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "76cb99c798cbd1d4101bb3cb098d93eaa8bd7a69",
          "message": "build(deps): bump mio\n\nBumps [mio](https://github.com/tokio-rs/mio) from 0.8.6 to 0.8.11.\n- [Release notes](https://github.com/tokio-rs/mio/releases)\n- [Changelog](https://github.com/tokio-rs/mio/blob/master/CHANGELOG.md)\n- [Commits](https://github.com/tokio-rs/mio/compare/v0.8.6...v0.8.11)\n\n---\nupdated-dependencies:\n- dependency-name: mio\n  dependency-type: indirect\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>",
          "timestamp": "2024-03-04T18:01:14-08:00",
          "tree_id": "98b1c30c67bfb078fb88ba24d815dc0f1e408c12",
          "url": "https://github.com/hyperledger/cacti/commit/76cb99c798cbd1d4101bb3cb098d93eaa8bd7a69"
        },
        "date": 1709604663326,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 619,
            "range": "±1.72%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 390,
            "range": "±1.45%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}