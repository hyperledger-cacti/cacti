window.BENCHMARK_DATA = {
  "lastUpdate": 1718354336695,
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
          "id": "ab676d23e1781aa17b5f2c61cb7dec643443bded",
          "message": "feat(connector-besu): add gRPC support for operations\n\n1. The Besu connector now can be reached via the gRPC interface.\n2. The same operations are exposed as via HTTP+SocketIO\n3. gRPC supports bi-directional streaming so the block watching is also\nsupported and test coverage verifies that it works.\n4. To see an example of how to use the gRPC client of the Besu connector\nread the source code of the test case that provides the verification that\nthe functionality works:\n```\npackages/cactus-test-plugin-ledger-connector-besu/src/test/typescript/\nintegration/grpc-services/connector-besu-grpc-services.test.ts\n```\n\nDepends on #3173\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-29T09:26:12-07:00",
          "tree_id": "d3d9bebf7e0097ad2e1e2bc061e34415c163a024",
          "url": "https://github.com/hyperledger/cacti/commit/ab676d23e1781aa17b5f2c61cb7dec643443bded"
        },
        "date": 1717001650982,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 771,
            "range": "±2.96%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "zondervan.v.calvez@accenture.com",
            "name": "zondervancalvez",
            "username": "zondervancalvez"
          },
          "committer": {
            "email": "petermetz@users.noreply.github.com",
            "name": "Peter Somogyvari",
            "username": "petermetz"
          },
          "distinct": true,
          "id": "81da3334d8e638f85e398dd228bcef836a278230",
          "message": "fix(cmd-api-server): address CVE-2022-25881\n\nPrimary Changes:\n\tUpdated the Dockerfile & https-cache-semantics inside the cmd-api-server package\n\nFixes: #2862\n\nSigned-off-by: zondervancalvez <zondervan.v.calvez@accenture.com>\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-05-29T11:12:31-07:00",
          "tree_id": "150f754ac29b731c5aafa0fe70fe64afdec1aca2",
          "url": "https://github.com/hyperledger/cacti/commit/81da3334d8e638f85e398dd228bcef836a278230"
        },
        "date": 1717007025069,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 565,
            "range": "±1.81%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 349,
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
          "id": "4521d10e34c556434fe551f6d55100198b4d469d",
          "message": "test(plugin-consortium-manual): fix API server CRPC port allocation\n\n1. Also sneaking in a fix for a DCI-Lint failure that was introduced recently\nwhen we added a new Yarn plugin which then stored its install URL in the\n.yarnrc.yml file and it uses the old git default main branch name and does\nnot support the new one so we had to exclude the config file from linting.\n2. Also ensured that the ConnectRPC ports are bound to zero in all tests where the API\nserver is being used. This will prevent port conflicts randomly popping up across the\ntest suite in the future.\n3. Also removed a few test cases from the taprc file because they were already migrated to\nJest and therefore tap should not run them as they fail with the Jest syntax.\n4. Also fixing the lack of etherscan API key environment variable in the HTLC coordinator tests.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-12T10:56:35-07:00",
          "tree_id": "5500e8622a1cc2873707e37cafce8a083e3531ec",
          "url": "https://github.com/hyperledger/cacti/commit/4521d10e34c556434fe551f6d55100198b4d469d"
        },
        "date": 1718215659834,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 594,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 362,
            "range": "±1.55%",
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
          "id": "4521d10e34c556434fe551f6d55100198b4d469d",
          "message": "test(plugin-consortium-manual): fix API server CRPC port allocation\n\n1. Also sneaking in a fix for a DCI-Lint failure that was introduced recently\nwhen we added a new Yarn plugin which then stored its install URL in the\n.yarnrc.yml file and it uses the old git default main branch name and does\nnot support the new one so we had to exclude the config file from linting.\n2. Also ensured that the ConnectRPC ports are bound to zero in all tests where the API\nserver is being used. This will prevent port conflicts randomly popping up across the\ntest suite in the future.\n3. Also removed a few test cases from the taprc file because they were already migrated to\nJest and therefore tap should not run them as they fail with the Jest syntax.\n4. Also fixing the lack of etherscan API key environment variable in the HTLC coordinator tests.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-12T10:56:35-07:00",
          "tree_id": "5500e8622a1cc2873707e37cafce8a083e3531ec",
          "url": "https://github.com/hyperledger/cacti/commit/4521d10e34c556434fe551f6d55100198b4d469d"
        },
        "date": 1718216183306,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 776,
            "range": "±2.72%",
            "unit": "ops/sec",
            "extra": "179 samples"
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
          "id": "ec8123cf954b09ba8cb213c7332dfe82224c351f",
          "message": "feat(connector-fabric): drop support for Fabric v1.x\n\nBREAKING CHANGE: The Open API specification that has the enums for\nledger versions will no longer have an option for Fabric v1.x\nThis means that in the core-api package the LedgerType enum has changes\nwhich means that code that depends on that enum value will need to be\nupdated.\n\nFabric v1.x has had unmaintained dependencies associated with it such as\nthe native grpc package that stopped receiving security updates years ago\nand therefore it's dangerous to have around.\n\nThere are also some issues with Fabric v1.x that make the AIO image flaky\nwhich also makes the relevant tests flaky due to which we couldn't run\nthe v1.x Fabric tests on the CI for a while now anyway.\n\nIn order to reduce the CI resource usage and our own maintenance burden\nI suggest that we get rid of the Fabric v1.x support meaning that we can\neliminate the AIO image build and some code complexity from the test ledger\ncode as well.\n\nIn addition some old fixtures can be removed that the tests were using.\nOverall a net-positive as deleting code without losing functionality (that\nwe care about) is always a plus.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-12T11:12:42-07:00",
          "tree_id": "cfaf922e1ca373842ba7d01f923a3ad75d880f8a",
          "url": "https://github.com/hyperledger/cacti/commit/ec8123cf954b09ba8cb213c7332dfe82224c351f"
        },
        "date": 1718216681572,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 514,
            "range": "±2.52%",
            "unit": "ops/sec",
            "extra": "173 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 341,
            "range": "±1.58%",
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
          "id": "ec8123cf954b09ba8cb213c7332dfe82224c351f",
          "message": "feat(connector-fabric): drop support for Fabric v1.x\n\nBREAKING CHANGE: The Open API specification that has the enums for\nledger versions will no longer have an option for Fabric v1.x\nThis means that in the core-api package the LedgerType enum has changes\nwhich means that code that depends on that enum value will need to be\nupdated.\n\nFabric v1.x has had unmaintained dependencies associated with it such as\nthe native grpc package that stopped receiving security updates years ago\nand therefore it's dangerous to have around.\n\nThere are also some issues with Fabric v1.x that make the AIO image flaky\nwhich also makes the relevant tests flaky due to which we couldn't run\nthe v1.x Fabric tests on the CI for a while now anyway.\n\nIn order to reduce the CI resource usage and our own maintenance burden\nI suggest that we get rid of the Fabric v1.x support meaning that we can\neliminate the AIO image build and some code complexity from the test ledger\ncode as well.\n\nIn addition some old fixtures can be removed that the tests were using.\nOverall a net-positive as deleting code without losing functionality (that\nwe care about) is always a plus.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-12T11:12:42-07:00",
          "tree_id": "cfaf922e1ca373842ba7d01f923a3ad75d880f8a",
          "url": "https://github.com/hyperledger/cacti/commit/ec8123cf954b09ba8cb213c7332dfe82224c351f"
        },
        "date": 1718217295137,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 721,
            "range": "±3.32%",
            "unit": "ops/sec",
            "extra": "178 samples"
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
          "id": "4a9ed0aecae84afb19c1a52b2de3cca35fa1a3de",
          "message": "build: add OpenAPI spec bundling, stop using URL references\n\n**IMPORTANT:** From now on, if you are changing the OpenAPI specification of any given\npackage within Cacti, please make sure to edit the template file instead of editing the\nopenapi.json specific file directly because changes in the openapi.json file will be\noverwritten by the codegen script the next time you run it.\nThis slight alteration in the development flow is the least intrusive solution I could find\nto resolving our issues with the release automation.\n\nThis change enables us to have our openapi.json files work without having remote and URL\nreferences in them (which was a blocker issue for release automation).\n\n1. The openapi.json files that we used to have are now called openapi.tpl.json where the\ntpl stands for template. Their content is equivalent to what openapi.json files used to\nhave prior to this commit.\n2. These template specs are fed into the bundler tool which then spits out the files which\nthen are saved as openapi.json files. The big change is that these bundled versions are\nno longer containing any remote nor URL references, only local ones.\n3. This means that we still get project-wide re-use of schema types from packages such as\ncactus-core-api, but we no longer suffer from the additional complexities of having to deal\nwith remote and URL references.\n4. The scirpt that performs the bundling is callable separately by executing this command\n```sh\nyarn tools:bundle-open-api-tpl-files\n```\n5. The `yarn tools:bundle-open-api-tpl-files` is also embedded as a warmup step of the\nlarger `codegen` script so there is no need usually to call the bundling script separately.\n6. The heavylifting in terms of bundling is done by the tooling script that can be found\nhere: `tools/bundle-open-api-tpl-files.ts`. On a high level what it does is loop through\nexisting `openapi.tpl.json` files throughout the project and then renders their bundled\nversion next to it as `openapi.json` which then can be used by all of our tools as a self\ncontained version of the template file which *does* still have the remote and URL references\nin it.\n\nMore information on what URL and remote references are can be read here on the official\nOpenAPI website: https://swagger.io/docs/specification/using-ref/\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-13T14:33:28-07:00",
          "tree_id": "c843189a368387d67b759d8ab5d97edebaf04ee8",
          "url": "https://github.com/hyperledger/cacti/commit/4a9ed0aecae84afb19c1a52b2de3cca35fa1a3de"
        },
        "date": 1718315419780,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 577,
            "range": "±1.81%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 350,
            "range": "±1.40%",
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
          "id": "4a9ed0aecae84afb19c1a52b2de3cca35fa1a3de",
          "message": "build: add OpenAPI spec bundling, stop using URL references\n\n**IMPORTANT:** From now on, if you are changing the OpenAPI specification of any given\npackage within Cacti, please make sure to edit the template file instead of editing the\nopenapi.json specific file directly because changes in the openapi.json file will be\noverwritten by the codegen script the next time you run it.\nThis slight alteration in the development flow is the least intrusive solution I could find\nto resolving our issues with the release automation.\n\nThis change enables us to have our openapi.json files work without having remote and URL\nreferences in them (which was a blocker issue for release automation).\n\n1. The openapi.json files that we used to have are now called openapi.tpl.json where the\ntpl stands for template. Their content is equivalent to what openapi.json files used to\nhave prior to this commit.\n2. These template specs are fed into the bundler tool which then spits out the files which\nthen are saved as openapi.json files. The big change is that these bundled versions are\nno longer containing any remote nor URL references, only local ones.\n3. This means that we still get project-wide re-use of schema types from packages such as\ncactus-core-api, but we no longer suffer from the additional complexities of having to deal\nwith remote and URL references.\n4. The scirpt that performs the bundling is callable separately by executing this command\n```sh\nyarn tools:bundle-open-api-tpl-files\n```\n5. The `yarn tools:bundle-open-api-tpl-files` is also embedded as a warmup step of the\nlarger `codegen` script so there is no need usually to call the bundling script separately.\n6. The heavylifting in terms of bundling is done by the tooling script that can be found\nhere: `tools/bundle-open-api-tpl-files.ts`. On a high level what it does is loop through\nexisting `openapi.tpl.json` files throughout the project and then renders their bundled\nversion next to it as `openapi.json` which then can be used by all of our tools as a self\ncontained version of the template file which *does* still have the remote and URL references\nin it.\n\nMore information on what URL and remote references are can be read here on the official\nOpenAPI website: https://swagger.io/docs/specification/using-ref/\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-13T14:33:28-07:00",
          "tree_id": "c843189a368387d67b759d8ab5d97edebaf04ee8",
          "url": "https://github.com/hyperledger/cacti/commit/4a9ed0aecae84afb19c1a52b2de3cca35fa1a3de"
        },
        "date": 1718315959445,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 713,
            "range": "±2.56%",
            "unit": "ops/sec",
            "extra": "175 samples"
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
          "id": "c18b3fc6b119785f2c92359d89b33b4fb92bd863",
          "message": "build: unpin OpenAPI specs from v2.0.0-alpha.2 URL refs, use REMOTE\n\nOn a high level this is a find & replace operation where the occurrences of the\nfirst bullet point were replaced with the second bullet point:\n* `\"$ref\": \"https://raw.githubusercontent.com/hyperledger/cactus/v2.0.0-alpha.2`\n* `\"$ref\": \"../../../../..`\n\nThe firs bullet point above is called a URL reference while the second one is\ncalled a REMOTE references (remote as in a different spec file on the file-system).\n\n1. With this change, we unlock the release process being able to issue code that\nis working on the latest OpenAPI specifications that we are cross-referencing\nfrom one package to another.\n2. Previously you had to manually update the references in about a hundred\nand fifty locations to make sure that the versions are bumped but after this\nchange this happens automatically as the newly introduced bundling process\nand the usage of the REMOTE references instead of URL references.\n3. The problem so far with the release process was that with the URL references\nwe dependended on the existence of a pushed git tag for a successful release build.\nBut we cannot git push the tag before having performed a successful release build,\nso this was a chicken-egg problem that had to be somehow untangled from its\ncircular dependency hell and this change is what makes it happen by no longer\ndepending on the git tags having been pushed to the upstream repository.\n\nRelated to, but does not yet fix: https://github.com/hyperledger/cacti/issues/2175\n\nDepends on #3288\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-06-14T01:28:00-07:00",
          "tree_id": "7b4ece36c7176aa4c7e8f0cfd4f3e493a0b498f4",
          "url": "https://github.com/hyperledger/cacti/commit/c18b3fc6b119785f2c92359d89b33b4fb92bd863"
        },
        "date": 1718354334162,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 591,
            "range": "±1.58%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 364,
            "range": "±1.52%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}