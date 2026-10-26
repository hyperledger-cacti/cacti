window.BENCHMARK_DATA = {
  "lastUpdate": 1793003307959,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "f1a71a40096b83225407b858aa7f4b3f1adab7b8",
          "message": "docs(mkdocs): publish package README and API references\n\nAddresses #4596\n\nPublish 34 package and extension READMEs through MkDocs snippets.\nKeep the existing package index and point it to published pages.\nPreserve useful legacy content in canonical READMEs and expose\nsupporting package documentation without duplicating its prose.\n\nInclude the optional OpenAPI publishing work with 18 package\nreference pages while preserving existing API documentation URLs.\n\nSupporting changes required for publishing:\n- Add explicit Markdown reference destinations so source READMEs\n  and MkDocs pages resolve links correctly without a rewriting hook.\n- Link images to their existing repository assets to avoid copies.\n- Generate API pages through a MkDocs hook so local and CI builds\n  use the same process without separate preprocessing.\n- Require MkDocs 1.6 or newer for its generated-file API.\n- Extend deployment path filters to cover package publishing inputs.\n- Stop copying SATP architecture Markdown over its snippet wrapper.\n- Add publishing tests and correct rendering issues found during\n  migration, including Markdown fences and nested code blocks.\n\nAssisted-by: openai:gpt-5\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-03T06:28:38Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/f1a71a40096b83225407b858aa7f4b3f1adab7b8"
        },
        "date": 1789028248336,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 602,
            "range": "±3.38%",
            "unit": "ops/sec",
            "extra": "174 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 611,
            "range": "±2.46%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "f1a71a40096b83225407b858aa7f4b3f1adab7b8",
          "message": "docs(mkdocs): publish package README and API references\n\nAddresses #4596\n\nPublish 34 package and extension READMEs through MkDocs snippets.\nKeep the existing package index and point it to published pages.\nPreserve useful legacy content in canonical READMEs and expose\nsupporting package documentation without duplicating its prose.\n\nInclude the optional OpenAPI publishing work with 18 package\nreference pages while preserving existing API documentation URLs.\n\nSupporting changes required for publishing:\n- Add explicit Markdown reference destinations so source READMEs\n  and MkDocs pages resolve links correctly without a rewriting hook.\n- Link images to their existing repository assets to avoid copies.\n- Generate API pages through a MkDocs hook so local and CI builds\n  use the same process without separate preprocessing.\n- Require MkDocs 1.6 or newer for its generated-file API.\n- Extend deployment path filters to cover package publishing inputs.\n- Stop copying SATP architecture Markdown over its snippet wrapper.\n- Add publishing tests and correct rendering issues found during\n  migration, including Markdown fences and nested code blocks.\n\nAssisted-by: openai:gpt-5\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-03T06:28:38Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/f1a71a40096b83225407b858aa7f4b3f1adab7b8"
        },
        "date": 1789028504379,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 831,
            "range": "±3.49%",
            "unit": "ops/sec",
            "extra": "177 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "f1a71a40096b83225407b858aa7f4b3f1adab7b8",
          "message": "docs(mkdocs): publish package README and API references\n\nAddresses #4596\n\nPublish 34 package and extension READMEs through MkDocs snippets.\nKeep the existing package index and point it to published pages.\nPreserve useful legacy content in canonical READMEs and expose\nsupporting package documentation without duplicating its prose.\n\nInclude the optional OpenAPI publishing work with 18 package\nreference pages while preserving existing API documentation URLs.\n\nSupporting changes required for publishing:\n- Add explicit Markdown reference destinations so source READMEs\n  and MkDocs pages resolve links correctly without a rewriting hook.\n- Link images to their existing repository assets to avoid copies.\n- Generate API pages through a MkDocs hook so local and CI builds\n  use the same process without separate preprocessing.\n- Require MkDocs 1.6 or newer for its generated-file API.\n- Extend deployment path filters to cover package publishing inputs.\n- Stop copying SATP architecture Markdown over its snippet wrapper.\n- Add publishing tests and correct rendering issues found during\n  migration, including Markdown fences and nested code blocks.\n\nAssisted-by: openai:gpt-5\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-03T06:28:38Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/f1a71a40096b83225407b858aa7f4b3f1adab7b8"
        },
        "date": 1789373801939,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 575,
            "range": "±4.14%",
            "unit": "ops/sec",
            "extra": "171 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 591,
            "range": "±2.63%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "f1a71a40096b83225407b858aa7f4b3f1adab7b8",
          "message": "docs(mkdocs): publish package README and API references\n\nAddresses #4596\n\nPublish 34 package and extension READMEs through MkDocs snippets.\nKeep the existing package index and point it to published pages.\nPreserve useful legacy content in canonical READMEs and expose\nsupporting package documentation without duplicating its prose.\n\nInclude the optional OpenAPI publishing work with 18 package\nreference pages while preserving existing API documentation URLs.\n\nSupporting changes required for publishing:\n- Add explicit Markdown reference destinations so source READMEs\n  and MkDocs pages resolve links correctly without a rewriting hook.\n- Link images to their existing repository assets to avoid copies.\n- Generate API pages through a MkDocs hook so local and CI builds\n  use the same process without separate preprocessing.\n- Require MkDocs 1.6 or newer for its generated-file API.\n- Extend deployment path filters to cover package publishing inputs.\n- Stop copying SATP architecture Markdown over its snippet wrapper.\n- Add publishing tests and correct rendering issues found during\n  migration, including Markdown fences and nested code blocks.\n\nAssisted-by: openai:gpt-5\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-03T06:28:38Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/f1a71a40096b83225407b858aa7f4b3f1adab7b8"
        },
        "date": 1789374085272,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 849,
            "range": "±2.68%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "1755e91279751331a4306ccb73291278c685132a",
          "message": "build(deps): bump react-router\n\nBumps the npm-security group with 1 update in the / directory: [react-router](https://github.com/remix-run/react-router/tree/HEAD/packages/react-router).\n\nUpdates `react-router` from 6.30.4 to 6.30.6\n- [Release notes](https://github.com/remix-run/react-router/releases)\n- [Changelog](https://github.com/remix-run/react-router/blob/react-router@6.30.6/packages/react-router/CHANGELOG.md)\n- [Commits](https://github.com/remix-run/react-router/commits/react-router@6.30.6/packages/react-router)\n\n---\nupdated-dependencies:\n- dependency-name: react-router\n  dependency-version: 6.30.6\n  dependency-type: indirect\n  dependency-group: npm-security\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-08-31T22:43:50Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/1755e91279751331a4306ccb73291278c685132a"
        },
        "date": 1789632952280,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 819,
            "range": "±2.95%",
            "unit": "ops/sec",
            "extra": "175 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 813,
            "range": "±1.88%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "1755e91279751331a4306ccb73291278c685132a",
          "message": "build(deps): bump react-router\n\nBumps the npm-security group with 1 update in the / directory: [react-router](https://github.com/remix-run/react-router/tree/HEAD/packages/react-router).\n\nUpdates `react-router` from 6.30.4 to 6.30.6\n- [Release notes](https://github.com/remix-run/react-router/releases)\n- [Changelog](https://github.com/remix-run/react-router/blob/react-router@6.30.6/packages/react-router/CHANGELOG.md)\n- [Commits](https://github.com/remix-run/react-router/commits/react-router@6.30.6/packages/react-router)\n\n---\nupdated-dependencies:\n- dependency-name: react-router\n  dependency-version: 6.30.6\n  dependency-type: indirect\n  dependency-group: npm-security\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-08-31T22:43:50Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/1755e91279751331a4306ccb73291278c685132a"
        },
        "date": 1789633264219,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 910,
            "range": "±2.75%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "1755e91279751331a4306ccb73291278c685132a",
          "message": "build(deps): bump react-router\n\nBumps the npm-security group with 1 update in the / directory: [react-router](https://github.com/remix-run/react-router/tree/HEAD/packages/react-router).\n\nUpdates `react-router` from 6.30.4 to 6.30.6\n- [Release notes](https://github.com/remix-run/react-router/releases)\n- [Changelog](https://github.com/remix-run/react-router/blob/react-router@6.30.6/packages/react-router/CHANGELOG.md)\n- [Commits](https://github.com/remix-run/react-router/commits/react-router@6.30.6/packages/react-router)\n\n---\nupdated-dependencies:\n- dependency-name: react-router\n  dependency-version: 6.30.6\n  dependency-type: indirect\n  dependency-group: npm-security\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-08-31T22:43:50Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/1755e91279751331a4306ccb73291278c685132a"
        },
        "date": 1789978566145,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 697,
            "range": "±3.16%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 807,
            "range": "±2.63%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "1755e91279751331a4306ccb73291278c685132a",
          "message": "build(deps): bump react-router\n\nBumps the npm-security group with 1 update in the / directory: [react-router](https://github.com/remix-run/react-router/tree/HEAD/packages/react-router).\n\nUpdates `react-router` from 6.30.4 to 6.30.6\n- [Release notes](https://github.com/remix-run/react-router/releases)\n- [Changelog](https://github.com/remix-run/react-router/blob/react-router@6.30.6/packages/react-router/CHANGELOG.md)\n- [Commits](https://github.com/remix-run/react-router/commits/react-router@6.30.6/packages/react-router)\n\n---\nupdated-dependencies:\n- dependency-name: react-router\n  dependency-version: 6.30.6\n  dependency-type: indirect\n  dependency-group: npm-security\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-08-31T22:43:50Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/1755e91279751331a4306ccb73291278c685132a"
        },
        "date": 1789978927144,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 859,
            "range": "±3.65%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "d43374ba5df98f979f35d58a40bce47762c8d9bc",
          "message": "docs(validation): fix audience path guidance\n\nAddresses #4596\n\nCorrect contributor, developer, and operator guidance found during validation.\n\nUpdate stale commands, links, and SATP deployment configuration.\n\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-21T04:24:21Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/d43374ba5df98f979f35d58a40bce47762c8d9bc"
        },
        "date": 1790237643950,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 1035,
            "range": "±4.24%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 1159,
            "range": "±3.24%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "d43374ba5df98f979f35d58a40bce47762c8d9bc",
          "message": "docs(validation): fix audience path guidance\n\nAddresses #4596\n\nCorrect contributor, developer, and operator guidance found during validation.\n\nUpdate stale commands, links, and SATP deployment configuration.\n\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-21T04:24:21Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/d43374ba5df98f979f35d58a40bce47762c8d9bc"
        },
        "date": 1790238061601,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 855,
            "range": "±3.06%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "d43374ba5df98f979f35d58a40bce47762c8d9bc",
          "message": "docs(validation): fix audience path guidance\n\nAddresses #4596\n\nCorrect contributor, developer, and operator guidance found during validation.\n\nUpdate stale commands, links, and SATP deployment configuration.\n\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-21T04:24:21Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/d43374ba5df98f979f35d58a40bce47762c8d9bc"
        },
        "date": 1790583763695,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 654,
            "range": "±3.33%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 659,
            "range": "±3.80%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "d43374ba5df98f979f35d58a40bce47762c8d9bc",
          "message": "docs(validation): fix audience path guidance\n\nAddresses #4596\n\nCorrect contributor, developer, and operator guidance found during validation.\n\nUpdate stale commands, links, and SATP deployment configuration.\n\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-09-21T04:24:21Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/d43374ba5df98f979f35d58a40bce47762c8d9bc"
        },
        "date": 1790584063890,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 900,
            "range": "±3.54%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Agrim",
            "username": "AgrimTawani",
            "email": "agrimtawani139@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ba5c8750545bc7e57c25c40354e9c6f0522870ba",
          "message": "test(test-tooling): add Canton LocalNet test ledger\n\nAddresses #4700\n\nSigned-off-by: Agrim <agrimtawani139@gmail.com>",
          "timestamp": "2026-09-22T16:56:33Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ba5c8750545bc7e57c25c40354e9c6f0522870ba"
        },
        "date": 1790842544999,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 612,
            "range": "±4.16%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 623,
            "range": "±1.92%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Agrim",
            "username": "AgrimTawani",
            "email": "agrimtawani139@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ba5c8750545bc7e57c25c40354e9c6f0522870ba",
          "message": "test(test-tooling): add Canton LocalNet test ledger\n\nAddresses #4700\n\nSigned-off-by: Agrim <agrimtawani139@gmail.com>",
          "timestamp": "2026-09-22T16:56:33Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ba5c8750545bc7e57c25c40354e9c6f0522870ba"
        },
        "date": 1790842943960,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 879,
            "range": "±3.25%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Agrim",
            "username": "AgrimTawani",
            "email": "agrimtawani139@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ba5c8750545bc7e57c25c40354e9c6f0522870ba",
          "message": "test(test-tooling): add Canton LocalNet test ledger\n\nAddresses #4700\n\nSigned-off-by: Agrim <agrimtawani139@gmail.com>",
          "timestamp": "2026-09-22T16:56:33Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ba5c8750545bc7e57c25c40354e9c6f0522870ba"
        },
        "date": 1791188675008,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 650,
            "range": "±3.04%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 668,
            "range": "±1.94%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Agrim",
            "username": "AgrimTawani",
            "email": "agrimtawani139@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ba5c8750545bc7e57c25c40354e9c6f0522870ba",
          "message": "test(test-tooling): add Canton LocalNet test ledger\n\nAddresses #4700\n\nSigned-off-by: Agrim <agrimtawani139@gmail.com>",
          "timestamp": "2026-09-22T16:56:33Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ba5c8750545bc7e57c25c40354e9c6f0522870ba"
        },
        "date": 1791188821578,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 1833,
            "range": "±3.53%",
            "unit": "ops/sec",
            "extra": "177 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "rafael.belchior@tecnico.ulisboa.pt"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "aa389d7d8e3e3059482e80fc765f6ae57e23923d",
          "message": "fix(satp-hermes): re-enable fabric integration suites\n\nThree verified defects kept the fabric suites skipped, caused the\nintermittent ENDORSEMENT_POLICY_FAILURE of #3978, and broke the AIO\nboot on CI:\n\n1. The fabric2 AIO image is not hermetic. It freezes Fabric 2.5.6\n   images at build time, but the fabric-samples compose files inside\n   it reference hyperledger/fabric-{peer,orderer,ca}:latest, so the\n   embedded compose ignores the frozen images and pulls whatever\n   \"latest\" means on Docker Hub that day (Fabric 3.1.5 / CA 1.5.22\n   as of 2026-09-30) and runs it against the 2.5.6 CLI binaries\n   baked into the image. Fabric 3.x becoming latest in mid-2025 is\n   what started breaking CI (#3978, Sep 2025) and later the AIO boot\n   outright (the channel-join retry loop, amplified by supervisord\n   restarting the boot script over surviving child containers).\n   FabricTestLedgerV1's container entrypoint now retags the frozen\n   pinned images as :latest the moment docker load finishes, and\n   the Dockerfile pins the compose tags at build time.\n\n2. The AIO boot races its embedded docker daemon:\n   run-fabric-network.sh pipes image tarballs into \"docker load\"\n   before /var/run/docker.sock exists, so on loaded CI runners the\n   script dies via set -e and supervisord moves it to a fatal state -\n   the network never boots. The entrypoint injects a wait-for-daemon\n   loop into the script, and the copy in tools/docker gains the same\n   wait for future image builds.\n\n3. The SATP and oracle test chaincodes were deployed without an\n   explicit endorsement policy, committing with the Fabric default\n   for a 2-org channel: MAJORITY - both orgs must endorse every\n   transaction. Under CI load one peer's endorsement lags, the\n   transaction is submitted with an incomplete endorsement set and\n   fails with ENDORSEMENT_POLICY_FAILURE, matching the issue's own\n   correlation with container count and load. Deploy them with an\n   explicit OR('Org1MSP.member','Org2MSP.member') signature policy -\n   the same loose policy the AIO itself uses for its sample chaincode\n   (CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP).\n\nThe SATP fabric environment pins the v3.0.1 fabric2 AIO image\nlocally (the shared FABRIC_25_LTS_AIO_IMAGE_VERSION default used by\nother packages' fabric tests stays at v2.1.0), and the CI pre-pull\nis moved to the same v3.0.1 so it actually warms the image the\ntests instantiate (it previously pre-pulled v3.0.0, which never\nmatched). Fabric ledger setup is restored in the beforeAll blocks\nit had been removed from and all fabric describes/its in the\ngateway, docker, bridge and oracle suites are active again. The\nobsolete docs/fabric-tests-to-fix.md known-limitation tracker is\nremoved.\n\nFixes #3978\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\nSigned by zai:GLM-5.3 on behalf of Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>",
          "timestamp": "2026-10-01T05:43:52Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/aa389d7d8e3e3059482e80fc765f6ae57e23923d"
        },
        "date": 1791447563506,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 578,
            "range": "±3.18%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 649,
            "range": "±2.41%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "rafael.belchior@tecnico.ulisboa.pt"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "aa389d7d8e3e3059482e80fc765f6ae57e23923d",
          "message": "fix(satp-hermes): re-enable fabric integration suites\n\nThree verified defects kept the fabric suites skipped, caused the\nintermittent ENDORSEMENT_POLICY_FAILURE of #3978, and broke the AIO\nboot on CI:\n\n1. The fabric2 AIO image is not hermetic. It freezes Fabric 2.5.6\n   images at build time, but the fabric-samples compose files inside\n   it reference hyperledger/fabric-{peer,orderer,ca}:latest, so the\n   embedded compose ignores the frozen images and pulls whatever\n   \"latest\" means on Docker Hub that day (Fabric 3.1.5 / CA 1.5.22\n   as of 2026-09-30) and runs it against the 2.5.6 CLI binaries\n   baked into the image. Fabric 3.x becoming latest in mid-2025 is\n   what started breaking CI (#3978, Sep 2025) and later the AIO boot\n   outright (the channel-join retry loop, amplified by supervisord\n   restarting the boot script over surviving child containers).\n   FabricTestLedgerV1's container entrypoint now retags the frozen\n   pinned images as :latest the moment docker load finishes, and\n   the Dockerfile pins the compose tags at build time.\n\n2. The AIO boot races its embedded docker daemon:\n   run-fabric-network.sh pipes image tarballs into \"docker load\"\n   before /var/run/docker.sock exists, so on loaded CI runners the\n   script dies via set -e and supervisord moves it to a fatal state -\n   the network never boots. The entrypoint injects a wait-for-daemon\n   loop into the script, and the copy in tools/docker gains the same\n   wait for future image builds.\n\n3. The SATP and oracle test chaincodes were deployed without an\n   explicit endorsement policy, committing with the Fabric default\n   for a 2-org channel: MAJORITY - both orgs must endorse every\n   transaction. Under CI load one peer's endorsement lags, the\n   transaction is submitted with an incomplete endorsement set and\n   fails with ENDORSEMENT_POLICY_FAILURE, matching the issue's own\n   correlation with container count and load. Deploy them with an\n   explicit OR('Org1MSP.member','Org2MSP.member') signature policy -\n   the same loose policy the AIO itself uses for its sample chaincode\n   (CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP).\n\nThe SATP fabric environment pins the v3.0.1 fabric2 AIO image\nlocally (the shared FABRIC_25_LTS_AIO_IMAGE_VERSION default used by\nother packages' fabric tests stays at v2.1.0), and the CI pre-pull\nis moved to the same v3.0.1 so it actually warms the image the\ntests instantiate (it previously pre-pulled v3.0.0, which never\nmatched). Fabric ledger setup is restored in the beforeAll blocks\nit had been removed from and all fabric describes/its in the\ngateway, docker, bridge and oracle suites are active again. The\nobsolete docs/fabric-tests-to-fix.md known-limitation tracker is\nremoved.\n\nFixes #3978\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\nSigned by zai:GLM-5.3 on behalf of Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>",
          "timestamp": "2026-10-01T05:43:52Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/aa389d7d8e3e3059482e80fc765f6ae57e23923d"
        },
        "date": 1791447639089,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 1794,
            "range": "±4.07%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "rafael.belchior@tecnico.ulisboa.pt"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "aa389d7d8e3e3059482e80fc765f6ae57e23923d",
          "message": "fix(satp-hermes): re-enable fabric integration suites\n\nThree verified defects kept the fabric suites skipped, caused the\nintermittent ENDORSEMENT_POLICY_FAILURE of #3978, and broke the AIO\nboot on CI:\n\n1. The fabric2 AIO image is not hermetic. It freezes Fabric 2.5.6\n   images at build time, but the fabric-samples compose files inside\n   it reference hyperledger/fabric-{peer,orderer,ca}:latest, so the\n   embedded compose ignores the frozen images and pulls whatever\n   \"latest\" means on Docker Hub that day (Fabric 3.1.5 / CA 1.5.22\n   as of 2026-09-30) and runs it against the 2.5.6 CLI binaries\n   baked into the image. Fabric 3.x becoming latest in mid-2025 is\n   what started breaking CI (#3978, Sep 2025) and later the AIO boot\n   outright (the channel-join retry loop, amplified by supervisord\n   restarting the boot script over surviving child containers).\n   FabricTestLedgerV1's container entrypoint now retags the frozen\n   pinned images as :latest the moment docker load finishes, and\n   the Dockerfile pins the compose tags at build time.\n\n2. The AIO boot races its embedded docker daemon:\n   run-fabric-network.sh pipes image tarballs into \"docker load\"\n   before /var/run/docker.sock exists, so on loaded CI runners the\n   script dies via set -e and supervisord moves it to a fatal state -\n   the network never boots. The entrypoint injects a wait-for-daemon\n   loop into the script, and the copy in tools/docker gains the same\n   wait for future image builds.\n\n3. The SATP and oracle test chaincodes were deployed without an\n   explicit endorsement policy, committing with the Fabric default\n   for a 2-org channel: MAJORITY - both orgs must endorse every\n   transaction. Under CI load one peer's endorsement lags, the\n   transaction is submitted with an incomplete endorsement set and\n   fails with ENDORSEMENT_POLICY_FAILURE, matching the issue's own\n   correlation with container count and load. Deploy them with an\n   explicit OR('Org1MSP.member','Org2MSP.member') signature policy -\n   the same loose policy the AIO itself uses for its sample chaincode\n   (CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP).\n\nThe SATP fabric environment pins the v3.0.1 fabric2 AIO image\nlocally (the shared FABRIC_25_LTS_AIO_IMAGE_VERSION default used by\nother packages' fabric tests stays at v2.1.0), and the CI pre-pull\nis moved to the same v3.0.1 so it actually warms the image the\ntests instantiate (it previously pre-pulled v3.0.0, which never\nmatched). Fabric ledger setup is restored in the beforeAll blocks\nit had been removed from and all fabric describes/its in the\ngateway, docker, bridge and oracle suites are active again. The\nobsolete docs/fabric-tests-to-fix.md known-limitation tracker is\nremoved.\n\nFixes #3978\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\nSigned by zai:GLM-5.3 on behalf of Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>",
          "timestamp": "2026-10-01T05:43:52Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/aa389d7d8e3e3059482e80fc765f6ae57e23923d"
        },
        "date": 1791793885116,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 638,
            "range": "±3.28%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 649,
            "range": "±1.98%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "rafael.belchior@tecnico.ulisboa.pt"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "aa389d7d8e3e3059482e80fc765f6ae57e23923d",
          "message": "fix(satp-hermes): re-enable fabric integration suites\n\nThree verified defects kept the fabric suites skipped, caused the\nintermittent ENDORSEMENT_POLICY_FAILURE of #3978, and broke the AIO\nboot on CI:\n\n1. The fabric2 AIO image is not hermetic. It freezes Fabric 2.5.6\n   images at build time, but the fabric-samples compose files inside\n   it reference hyperledger/fabric-{peer,orderer,ca}:latest, so the\n   embedded compose ignores the frozen images and pulls whatever\n   \"latest\" means on Docker Hub that day (Fabric 3.1.5 / CA 1.5.22\n   as of 2026-09-30) and runs it against the 2.5.6 CLI binaries\n   baked into the image. Fabric 3.x becoming latest in mid-2025 is\n   what started breaking CI (#3978, Sep 2025) and later the AIO boot\n   outright (the channel-join retry loop, amplified by supervisord\n   restarting the boot script over surviving child containers).\n   FabricTestLedgerV1's container entrypoint now retags the frozen\n   pinned images as :latest the moment docker load finishes, and\n   the Dockerfile pins the compose tags at build time.\n\n2. The AIO boot races its embedded docker daemon:\n   run-fabric-network.sh pipes image tarballs into \"docker load\"\n   before /var/run/docker.sock exists, so on loaded CI runners the\n   script dies via set -e and supervisord moves it to a fatal state -\n   the network never boots. The entrypoint injects a wait-for-daemon\n   loop into the script, and the copy in tools/docker gains the same\n   wait for future image builds.\n\n3. The SATP and oracle test chaincodes were deployed without an\n   explicit endorsement policy, committing with the Fabric default\n   for a 2-org channel: MAJORITY - both orgs must endorse every\n   transaction. Under CI load one peer's endorsement lags, the\n   transaction is submitted with an incomplete endorsement set and\n   fails with ENDORSEMENT_POLICY_FAILURE, matching the issue's own\n   correlation with container count and load. Deploy them with an\n   explicit OR('Org1MSP.member','Org2MSP.member') signature policy -\n   the same loose policy the AIO itself uses for its sample chaincode\n   (CACTUS_FABRIC_TEST_LOOSE_MEMBERSHIP).\n\nThe SATP fabric environment pins the v3.0.1 fabric2 AIO image\nlocally (the shared FABRIC_25_LTS_AIO_IMAGE_VERSION default used by\nother packages' fabric tests stays at v2.1.0), and the CI pre-pull\nis moved to the same v3.0.1 so it actually warms the image the\ntests instantiate (it previously pre-pulled v3.0.0, which never\nmatched). Fabric ledger setup is restored in the beforeAll blocks\nit had been removed from and all fabric describes/its in the\ngateway, docker, bridge and oracle suites are active again. The\nobsolete docs/fabric-tests-to-fix.md known-limitation tracker is\nremoved.\n\nFixes #3978\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\nSigned by zai:GLM-5.3 on behalf of Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>",
          "timestamp": "2026-10-01T05:43:52Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/aa389d7d8e3e3059482e80fc765f6ae57e23923d"
        },
        "date": 1791793994255,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 1524,
            "range": "±4.95%",
            "unit": "ops/sec",
            "extra": "175 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "10252f1e1f2ac094636269a8c675cefbd0721d0c",
          "message": "docs(docker): add container image description labels\n\nAddresses #1657\n\nAdd org.opencontainers.image.description to 15 Dockerfiles covering\ndevelopment ledgers, the API server, connectors, SATP Hermes, and Weaver.\n\nPlace descriptions in the final image stage and preserve existing\nbuild instructions, runtime configuration, and metadata.\n\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-10-05T13:06:16Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/10252f1e1f2ac094636269a8c675cefbd0721d0c"
        },
        "date": 1792052047662,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 1120,
            "range": "±3.58%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 1195,
            "range": "±2.55%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Parth Singh",
            "username": "ParthSinghPS",
            "email": "posiedon.1721@gmail.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "10252f1e1f2ac094636269a8c675cefbd0721d0c",
          "message": "docs(docker): add container image description labels\n\nAddresses #1657\n\nAdd org.opencontainers.image.description to 15 Dockerfiles covering\ndevelopment ledgers, the API server, connectors, SATP Hermes, and Weaver.\n\nPlace descriptions in the final image stage and preserve existing\nbuild instructions, runtime configuration, and metadata.\n\nSigned-off-by: Parth Singh <posiedon.1721@gmail.com>",
          "timestamp": "2026-10-05T13:06:16Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/10252f1e1f2ac094636269a8c675cefbd0721d0c"
        },
        "date": 1792052433167,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 948,
            "range": "±3.30%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ff50264a1973f0b9e4414db50fe1d6001ee2ff4a",
          "message": "build(deps): patch all critical/high npm alerts\n\nFix every open critical/high severity npm advisory that has a patched\nrelease, via direct version bumps plus yarn resolutions, following the\nestablished security-triage pattern (precedent 474861b79).\n\nDirect dependency bumps (23 manifests, prod-runtime unless noted):\n- axios 1.18.1 -> 1.20.0 (13 open advisories, incl. redirect-SSRF with\n  maxRedirects:0 ignored and HTTP/2 DNS/proxy bypass; runtime path of\n  every generated typescript-axios client incl. the SATP gateway-client)\n- @grpc/grpc-js 1.14.4 -> 1.14.5 (getAuthContext marking unauthorized\n  client certs as authorized; gateway transport auth trust model)\n- joi 17.13.4 -> 17.13.7, js-yaml 3.15.1 -> 3.15.2\n- fastify 5.8.5 -> 5.12.2 (4 advisories), multer 2.2.0 -> 2.3.0\n- one-line grpc bump in weaver/sdks/fabric/interoperation-node-sdk:\n  required by the version-consistency custom check, same edit as\n  Dependabot PR #4751\n\nRoot resolutions, new: proxy-addr 2.0.8 (critical, IPv4-mapped-IPv6\nspoofing directly under the SATP gateway's express 4.21.0), simple-git\n4.0.1 + @simple-git/argv-parser 2.0.1 + shell-quote >=1.11.0 (criticals),\ncompression 1.8.2, toml >=4.2.0, nanoid 3.3.18, source-map-js 1.2.2,\nbasic-ftp 6.2.1, @graphql-tools/utils 12.0.1, browserslist >=4.28.7,\nengine.io >=6.6.10, multer >=2.3.0.\nRaised: undici 6.28.1 / 7.29.1 / 8.10.2, brace-expansion 1.1.20 / 2.1.6\n/ 5.0.11, handlebars >=4.7.10 (2 criticals), http-cache-semantics >=4.3.0,\nfast-uri >=3.1.7, adm-zip >=0.6.1, decompress alias -> 11.1.4.\nSimple-git is consumed only by repo tooling (tools/*.ts); root devDep\nrange raised to 4.0.1 and compiles.\n\naxios ships a yarn type-patch (.yarn/patches/axios-npm-1.20.0) exporting\nthe axiosResponseDefault unique symbol: 1.20.0 is the only version\nclearing all 13 advisories, but its unexported symbol broke declaration\nemit in every generated typescript-axios client (TS2527 x8). The patch\nis types-only; runtime code is stock 1.20.0.\n\nSATP satp-contract chaincode lockfile regenerated with scoped floors\n(@grpc/grpc-js 1.14.5, brace-expansion 1.1.20/5.0.11, js-yaml 3.15.2/\n4.3.2, nanoid 3.3.18, browserslist >=4.28.7); fabric-contract-api and\nfabric-shim stay at 2.4.1. The satp-wrapper chaincode lockfile has no\nvulnerable entries and is untouched.\n\nVerified: yarn npm audit --recursive --all --environment production\nleaves only braces 3.0.3 and node-forge 1.4.0, both with no patched\nrelease in existence (dismissal rationales audited separately);\nyarn tsc 0 errors; yarn custom-checks all pass; yarn lint clean;\nyarn lint:actions exit 0; SATP Hermes unit suite 648/648 pass; chaincode\ntsc pass. Dockerized SATP e2e suites remain CI-gated (axios 1.20\nredirect/proxy enforcement changed behavior surface).\n\nSupersedes Dependabot PRs #4750/#4751/#4752/#4755, whose build-dev\nchecks fail at install on an angular peer-range conflict.\n\nAssisted-by: zai:glm-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): upgrade deps and openapi-generator to 7.26.0\n\nComplete the critical/high advisory sweep from 808073ae6 and move the\nOpenAPI toolchain off the end-of-life generator 6.6.0.\n\nDependency changes (root package.json + yarn.lock):\n- axios pinned to stock 1.20.0; the types-only yarn patch from the\n  previous commit is removed because the generator upgrade eliminates\n  the TS2527 declaration-emit break it worked around\n- joi 17.13.7, js-yaml 3.15.2/4.3.2, grpc 1.14.5, simple-git 4.0.1 and\n  the resolution floors from 808073ae6 remain; no new version changes\n\nGenerator toolchain:\n- openapi-generator-cli 6.6.0 -> 7.26.0 everywhere: root codegen scripts\n  now fetch the jar from Maven Central into the CLI versions directory\n  and write openapitools.json via tools/write-openapitools-config.cjs\n  (the file is gitignored and consumed at run time)\n- all 18 per-package openapitools.json pins bumped to 7.26.0\n\nTemplate fixes required by 7.26.0 (protobuf-schema custom templates):\n- imports: 7.x emits \"models/x_pb.proto\" relative names, so the old\n  \"{{{modelPackage}}}/\" prefixes double up to the non-existent\n  models/models/ path; drop the prefix in copm-core, besu connector,\n  keychain-memory and cmd-api-server template copies\n- api.mustache: add the supportMultipleResponses oneof block that stock\n  7.x emits for empty-response operations (NoopV1 et al otherwise\n  reference a never-emitted message)\n\nHand-written code migrated to the new generated surface (regenerated\nclients land in the follow-up commit):\n- enum keys: 6.6.0 truncated generated enum keys (Fungible,\n  Nonfungible, Local, Install, Instantiate, Authority, Stake, Work,\n  Send, Call, Sendprivate, _0); 7.26.0 derives full keys from the spec\n  x- names. All consumers updated, including aliased/re-exported forms\n  (TokenType.Fungible, StatusResponseStageEnum._0)\n- protobuf field casing: request/response fields renamed V1PB -> V1Pb\n  in copm validators and keychain-memory crpc services\n- fabric connector: generated params type is now Array<string|null>\n  (spec items nullable:true), so null entries are filtered at the\n  three pass-through sites before handing arrays to fabric-gateway\n- copm: response wrapper types (PledgeAssetV1Response et al) exported\n  from the copm-core barrel; copm-corda service implementation and\n  copm-test integration tests updated to the connect-rpc oneof shape\n- satp-hermes leaves: getView now stringifies a definitely-present\n  view object (safeStableStringify(...) ?? \"\") to satisfy the\n  tightened optional-field typing\n\nVerified: yarn tsc 0 errors; yarn custom-checks all pass; yarn lint\nclean; production audit leaves only braces 3.0.3\nand node-forge 1.4.0, both without a patched release in existence;\nSATP Hermes unit suite 643/643 tests pass (dev-mode suite failure is\npre-existing on the base commit and unrelated).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild: regenerate openapi clients with openapi-generator 7.26.0\n\nPure regeneration output from `yarn codegen` with the generator\nupgraded in the previous commit; no hand edits.\n\n- typescript-axios clients x16: axios typing annotations updated by\n  the 7.x template (returned closures now annotated Promise<R>, which\n  removes the TS2527 inaccessible-unique-symbol declaration-emit\n  break and makes the axios yarn type patch unnecessary); enum keys\n  now derived from spec x- names\n- go clients, kotlin clients, corda kotlin-spring server stubs:\n  regenerated in place\n- protobuf-schema outputs (copm-core, keychain-memory, besu, fabric,\n  cmd-api-server, cacti-copm): model imports now single-prefix\n  models/ paths, response messages emitted via oneof wrappers\n- protoc-gen-ts / connect outputs regenerated from the new protos\n\nAll consumers of these artifacts were adapted in the preceding\ncommit; this commit contains only machine-generated files.\n\nVerified with the same gates as the previous commit (tsc,\ncustom-checks, lint, production audit, SATP unit suite).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): patch npm advisories and upgrade openapi-generator\n\nNote: this tip commit exists so the PR headline matches the PR title\n(pr-structural-checks requires exact equality). Its content is the\ndev-mode test-loader fix described below.\n\nThe dev-mode unit suite failed to load because it imported\nresolveDevMode from plugin-satp-hermes-gateway-cli.ts, whose leading\nwrapped for CommonJS - jest-runtime then fails the whole suite with\n\"SyntaxError: Invalid or unexpected token\" before any test runs.\n\nExtract the function into\nservices/validation/config-validating-functions/resolve-dev-mode.ts\n(its natural home, next to the TLS-devMode validation it feeds), keep\na re-export on the CLI for the launch flow, and point the test at the\nnew module.\n\nVerified: dev-mode suite 5/5 pass; yarn tsc 0 errors; eslint clean on\nthe touched files.\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>",
          "timestamp": "2026-10-12T14:23:16Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ff50264a1973f0b9e4414db50fe1d6001ee2ff4a"
        },
        "date": 1792397864313,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 1086,
            "range": "±3.51%",
            "unit": "ops/sec",
            "extra": "175 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 1362,
            "range": "±5.89%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ff50264a1973f0b9e4414db50fe1d6001ee2ff4a",
          "message": "build(deps): patch all critical/high npm alerts\n\nFix every open critical/high severity npm advisory that has a patched\nrelease, via direct version bumps plus yarn resolutions, following the\nestablished security-triage pattern (precedent 474861b79).\n\nDirect dependency bumps (23 manifests, prod-runtime unless noted):\n- axios 1.18.1 -> 1.20.0 (13 open advisories, incl. redirect-SSRF with\n  maxRedirects:0 ignored and HTTP/2 DNS/proxy bypass; runtime path of\n  every generated typescript-axios client incl. the SATP gateway-client)\n- @grpc/grpc-js 1.14.4 -> 1.14.5 (getAuthContext marking unauthorized\n  client certs as authorized; gateway transport auth trust model)\n- joi 17.13.4 -> 17.13.7, js-yaml 3.15.1 -> 3.15.2\n- fastify 5.8.5 -> 5.12.2 (4 advisories), multer 2.2.0 -> 2.3.0\n- one-line grpc bump in weaver/sdks/fabric/interoperation-node-sdk:\n  required by the version-consistency custom check, same edit as\n  Dependabot PR #4751\n\nRoot resolutions, new: proxy-addr 2.0.8 (critical, IPv4-mapped-IPv6\nspoofing directly under the SATP gateway's express 4.21.0), simple-git\n4.0.1 + @simple-git/argv-parser 2.0.1 + shell-quote >=1.11.0 (criticals),\ncompression 1.8.2, toml >=4.2.0, nanoid 3.3.18, source-map-js 1.2.2,\nbasic-ftp 6.2.1, @graphql-tools/utils 12.0.1, browserslist >=4.28.7,\nengine.io >=6.6.10, multer >=2.3.0.\nRaised: undici 6.28.1 / 7.29.1 / 8.10.2, brace-expansion 1.1.20 / 2.1.6\n/ 5.0.11, handlebars >=4.7.10 (2 criticals), http-cache-semantics >=4.3.0,\nfast-uri >=3.1.7, adm-zip >=0.6.1, decompress alias -> 11.1.4.\nSimple-git is consumed only by repo tooling (tools/*.ts); root devDep\nrange raised to 4.0.1 and compiles.\n\naxios ships a yarn type-patch (.yarn/patches/axios-npm-1.20.0) exporting\nthe axiosResponseDefault unique symbol: 1.20.0 is the only version\nclearing all 13 advisories, but its unexported symbol broke declaration\nemit in every generated typescript-axios client (TS2527 x8). The patch\nis types-only; runtime code is stock 1.20.0.\n\nSATP satp-contract chaincode lockfile regenerated with scoped floors\n(@grpc/grpc-js 1.14.5, brace-expansion 1.1.20/5.0.11, js-yaml 3.15.2/\n4.3.2, nanoid 3.3.18, browserslist >=4.28.7); fabric-contract-api and\nfabric-shim stay at 2.4.1. The satp-wrapper chaincode lockfile has no\nvulnerable entries and is untouched.\n\nVerified: yarn npm audit --recursive --all --environment production\nleaves only braces 3.0.3 and node-forge 1.4.0, both with no patched\nrelease in existence (dismissal rationales audited separately);\nyarn tsc 0 errors; yarn custom-checks all pass; yarn lint clean;\nyarn lint:actions exit 0; SATP Hermes unit suite 648/648 pass; chaincode\ntsc pass. Dockerized SATP e2e suites remain CI-gated (axios 1.20\nredirect/proxy enforcement changed behavior surface).\n\nSupersedes Dependabot PRs #4750/#4751/#4752/#4755, whose build-dev\nchecks fail at install on an angular peer-range conflict.\n\nAssisted-by: zai:glm-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): upgrade deps and openapi-generator to 7.26.0\n\nComplete the critical/high advisory sweep from 808073ae6 and move the\nOpenAPI toolchain off the end-of-life generator 6.6.0.\n\nDependency changes (root package.json + yarn.lock):\n- axios pinned to stock 1.20.0; the types-only yarn patch from the\n  previous commit is removed because the generator upgrade eliminates\n  the TS2527 declaration-emit break it worked around\n- joi 17.13.7, js-yaml 3.15.2/4.3.2, grpc 1.14.5, simple-git 4.0.1 and\n  the resolution floors from 808073ae6 remain; no new version changes\n\nGenerator toolchain:\n- openapi-generator-cli 6.6.0 -> 7.26.0 everywhere: root codegen scripts\n  now fetch the jar from Maven Central into the CLI versions directory\n  and write openapitools.json via tools/write-openapitools-config.cjs\n  (the file is gitignored and consumed at run time)\n- all 18 per-package openapitools.json pins bumped to 7.26.0\n\nTemplate fixes required by 7.26.0 (protobuf-schema custom templates):\n- imports: 7.x emits \"models/x_pb.proto\" relative names, so the old\n  \"{{{modelPackage}}}/\" prefixes double up to the non-existent\n  models/models/ path; drop the prefix in copm-core, besu connector,\n  keychain-memory and cmd-api-server template copies\n- api.mustache: add the supportMultipleResponses oneof block that stock\n  7.x emits for empty-response operations (NoopV1 et al otherwise\n  reference a never-emitted message)\n\nHand-written code migrated to the new generated surface (regenerated\nclients land in the follow-up commit):\n- enum keys: 6.6.0 truncated generated enum keys (Fungible,\n  Nonfungible, Local, Install, Instantiate, Authority, Stake, Work,\n  Send, Call, Sendprivate, _0); 7.26.0 derives full keys from the spec\n  x- names. All consumers updated, including aliased/re-exported forms\n  (TokenType.Fungible, StatusResponseStageEnum._0)\n- protobuf field casing: request/response fields renamed V1PB -> V1Pb\n  in copm validators and keychain-memory crpc services\n- fabric connector: generated params type is now Array<string|null>\n  (spec items nullable:true), so null entries are filtered at the\n  three pass-through sites before handing arrays to fabric-gateway\n- copm: response wrapper types (PledgeAssetV1Response et al) exported\n  from the copm-core barrel; copm-corda service implementation and\n  copm-test integration tests updated to the connect-rpc oneof shape\n- satp-hermes leaves: getView now stringifies a definitely-present\n  view object (safeStableStringify(...) ?? \"\") to satisfy the\n  tightened optional-field typing\n\nVerified: yarn tsc 0 errors; yarn custom-checks all pass; yarn lint\nclean; production audit leaves only braces 3.0.3\nand node-forge 1.4.0, both without a patched release in existence;\nSATP Hermes unit suite 643/643 tests pass (dev-mode suite failure is\npre-existing on the base commit and unrelated).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild: regenerate openapi clients with openapi-generator 7.26.0\n\nPure regeneration output from `yarn codegen` with the generator\nupgraded in the previous commit; no hand edits.\n\n- typescript-axios clients x16: axios typing annotations updated by\n  the 7.x template (returned closures now annotated Promise<R>, which\n  removes the TS2527 inaccessible-unique-symbol declaration-emit\n  break and makes the axios yarn type patch unnecessary); enum keys\n  now derived from spec x- names\n- go clients, kotlin clients, corda kotlin-spring server stubs:\n  regenerated in place\n- protobuf-schema outputs (copm-core, keychain-memory, besu, fabric,\n  cmd-api-server, cacti-copm): model imports now single-prefix\n  models/ paths, response messages emitted via oneof wrappers\n- protoc-gen-ts / connect outputs regenerated from the new protos\n\nAll consumers of these artifacts were adapted in the preceding\ncommit; this commit contains only machine-generated files.\n\nVerified with the same gates as the previous commit (tsc,\ncustom-checks, lint, production audit, SATP unit suite).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): patch npm advisories and upgrade openapi-generator\n\nNote: this tip commit exists so the PR headline matches the PR title\n(pr-structural-checks requires exact equality). Its content is the\ndev-mode test-loader fix described below.\n\nThe dev-mode unit suite failed to load because it imported\nresolveDevMode from plugin-satp-hermes-gateway-cli.ts, whose leading\nwrapped for CommonJS - jest-runtime then fails the whole suite with\n\"SyntaxError: Invalid or unexpected token\" before any test runs.\n\nExtract the function into\nservices/validation/config-validating-functions/resolve-dev-mode.ts\n(its natural home, next to the TLS-devMode validation it feeds), keep\na re-export on the CLI for the launch flow, and point the test at the\nnew module.\n\nVerified: dev-mode suite 5/5 pass; yarn tsc 0 errors; eslint clean on\nthe touched files.\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>",
          "timestamp": "2026-10-12T14:23:16Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ff50264a1973f0b9e4414db50fe1d6001ee2ff4a"
        },
        "date": 1792398380416,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 791,
            "range": "±3.80%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ff50264a1973f0b9e4414db50fe1d6001ee2ff4a",
          "message": "build(deps): patch all critical/high npm alerts\n\nFix every open critical/high severity npm advisory that has a patched\nrelease, via direct version bumps plus yarn resolutions, following the\nestablished security-triage pattern (precedent 474861b79).\n\nDirect dependency bumps (23 manifests, prod-runtime unless noted):\n- axios 1.18.1 -> 1.20.0 (13 open advisories, incl. redirect-SSRF with\n  maxRedirects:0 ignored and HTTP/2 DNS/proxy bypass; runtime path of\n  every generated typescript-axios client incl. the SATP gateway-client)\n- @grpc/grpc-js 1.14.4 -> 1.14.5 (getAuthContext marking unauthorized\n  client certs as authorized; gateway transport auth trust model)\n- joi 17.13.4 -> 17.13.7, js-yaml 3.15.1 -> 3.15.2\n- fastify 5.8.5 -> 5.12.2 (4 advisories), multer 2.2.0 -> 2.3.0\n- one-line grpc bump in weaver/sdks/fabric/interoperation-node-sdk:\n  required by the version-consistency custom check, same edit as\n  Dependabot PR #4751\n\nRoot resolutions, new: proxy-addr 2.0.8 (critical, IPv4-mapped-IPv6\nspoofing directly under the SATP gateway's express 4.21.0), simple-git\n4.0.1 + @simple-git/argv-parser 2.0.1 + shell-quote >=1.11.0 (criticals),\ncompression 1.8.2, toml >=4.2.0, nanoid 3.3.18, source-map-js 1.2.2,\nbasic-ftp 6.2.1, @graphql-tools/utils 12.0.1, browserslist >=4.28.7,\nengine.io >=6.6.10, multer >=2.3.0.\nRaised: undici 6.28.1 / 7.29.1 / 8.10.2, brace-expansion 1.1.20 / 2.1.6\n/ 5.0.11, handlebars >=4.7.10 (2 criticals), http-cache-semantics >=4.3.0,\nfast-uri >=3.1.7, adm-zip >=0.6.1, decompress alias -> 11.1.4.\nSimple-git is consumed only by repo tooling (tools/*.ts); root devDep\nrange raised to 4.0.1 and compiles.\n\naxios ships a yarn type-patch (.yarn/patches/axios-npm-1.20.0) exporting\nthe axiosResponseDefault unique symbol: 1.20.0 is the only version\nclearing all 13 advisories, but its unexported symbol broke declaration\nemit in every generated typescript-axios client (TS2527 x8). The patch\nis types-only; runtime code is stock 1.20.0.\n\nSATP satp-contract chaincode lockfile regenerated with scoped floors\n(@grpc/grpc-js 1.14.5, brace-expansion 1.1.20/5.0.11, js-yaml 3.15.2/\n4.3.2, nanoid 3.3.18, browserslist >=4.28.7); fabric-contract-api and\nfabric-shim stay at 2.4.1. The satp-wrapper chaincode lockfile has no\nvulnerable entries and is untouched.\n\nVerified: yarn npm audit --recursive --all --environment production\nleaves only braces 3.0.3 and node-forge 1.4.0, both with no patched\nrelease in existence (dismissal rationales audited separately);\nyarn tsc 0 errors; yarn custom-checks all pass; yarn lint clean;\nyarn lint:actions exit 0; SATP Hermes unit suite 648/648 pass; chaincode\ntsc pass. Dockerized SATP e2e suites remain CI-gated (axios 1.20\nredirect/proxy enforcement changed behavior surface).\n\nSupersedes Dependabot PRs #4750/#4751/#4752/#4755, whose build-dev\nchecks fail at install on an angular peer-range conflict.\n\nAssisted-by: zai:glm-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): upgrade deps and openapi-generator to 7.26.0\n\nComplete the critical/high advisory sweep from 808073ae6 and move the\nOpenAPI toolchain off the end-of-life generator 6.6.0.\n\nDependency changes (root package.json + yarn.lock):\n- axios pinned to stock 1.20.0; the types-only yarn patch from the\n  previous commit is removed because the generator upgrade eliminates\n  the TS2527 declaration-emit break it worked around\n- joi 17.13.7, js-yaml 3.15.2/4.3.2, grpc 1.14.5, simple-git 4.0.1 and\n  the resolution floors from 808073ae6 remain; no new version changes\n\nGenerator toolchain:\n- openapi-generator-cli 6.6.0 -> 7.26.0 everywhere: root codegen scripts\n  now fetch the jar from Maven Central into the CLI versions directory\n  and write openapitools.json via tools/write-openapitools-config.cjs\n  (the file is gitignored and consumed at run time)\n- all 18 per-package openapitools.json pins bumped to 7.26.0\n\nTemplate fixes required by 7.26.0 (protobuf-schema custom templates):\n- imports: 7.x emits \"models/x_pb.proto\" relative names, so the old\n  \"{{{modelPackage}}}/\" prefixes double up to the non-existent\n  models/models/ path; drop the prefix in copm-core, besu connector,\n  keychain-memory and cmd-api-server template copies\n- api.mustache: add the supportMultipleResponses oneof block that stock\n  7.x emits for empty-response operations (NoopV1 et al otherwise\n  reference a never-emitted message)\n\nHand-written code migrated to the new generated surface (regenerated\nclients land in the follow-up commit):\n- enum keys: 6.6.0 truncated generated enum keys (Fungible,\n  Nonfungible, Local, Install, Instantiate, Authority, Stake, Work,\n  Send, Call, Sendprivate, _0); 7.26.0 derives full keys from the spec\n  x- names. All consumers updated, including aliased/re-exported forms\n  (TokenType.Fungible, StatusResponseStageEnum._0)\n- protobuf field casing: request/response fields renamed V1PB -> V1Pb\n  in copm validators and keychain-memory crpc services\n- fabric connector: generated params type is now Array<string|null>\n  (spec items nullable:true), so null entries are filtered at the\n  three pass-through sites before handing arrays to fabric-gateway\n- copm: response wrapper types (PledgeAssetV1Response et al) exported\n  from the copm-core barrel; copm-corda service implementation and\n  copm-test integration tests updated to the connect-rpc oneof shape\n- satp-hermes leaves: getView now stringifies a definitely-present\n  view object (safeStableStringify(...) ?? \"\") to satisfy the\n  tightened optional-field typing\n\nVerified: yarn tsc 0 errors; yarn custom-checks all pass; yarn lint\nclean; production audit leaves only braces 3.0.3\nand node-forge 1.4.0, both without a patched release in existence;\nSATP Hermes unit suite 643/643 tests pass (dev-mode suite failure is\npre-existing on the base commit and unrelated).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild: regenerate openapi clients with openapi-generator 7.26.0\n\nPure regeneration output from `yarn codegen` with the generator\nupgraded in the previous commit; no hand edits.\n\n- typescript-axios clients x16: axios typing annotations updated by\n  the 7.x template (returned closures now annotated Promise<R>, which\n  removes the TS2527 inaccessible-unique-symbol declaration-emit\n  break and makes the axios yarn type patch unnecessary); enum keys\n  now derived from spec x- names\n- go clients, kotlin clients, corda kotlin-spring server stubs:\n  regenerated in place\n- protobuf-schema outputs (copm-core, keychain-memory, besu, fabric,\n  cmd-api-server, cacti-copm): model imports now single-prefix\n  models/ paths, response messages emitted via oneof wrappers\n- protoc-gen-ts / connect outputs regenerated from the new protos\n\nAll consumers of these artifacts were adapted in the preceding\ncommit; this commit contains only machine-generated files.\n\nVerified with the same gates as the previous commit (tsc,\ncustom-checks, lint, production audit, SATP unit suite).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): patch npm advisories and upgrade openapi-generator\n\nNote: this tip commit exists so the PR headline matches the PR title\n(pr-structural-checks requires exact equality). Its content is the\ndev-mode test-loader fix described below.\n\nThe dev-mode unit suite failed to load because it imported\nresolveDevMode from plugin-satp-hermes-gateway-cli.ts, whose leading\nwrapped for CommonJS - jest-runtime then fails the whole suite with\n\"SyntaxError: Invalid or unexpected token\" before any test runs.\n\nExtract the function into\nservices/validation/config-validating-functions/resolve-dev-mode.ts\n(its natural home, next to the TLS-devMode validation it feeds), keep\na re-export on the CLI for the launch flow, and point the test at the\nnew module.\n\nVerified: dev-mode suite 5/5 pass; yarn tsc 0 errors; eslint clean on\nthe touched files.\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>",
          "timestamp": "2026-10-12T14:23:16Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ff50264a1973f0b9e4414db50fe1d6001ee2ff4a"
        },
        "date": 1792656894824,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 1064,
            "range": "±3.58%",
            "unit": "ops/sec",
            "extra": "180 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 1322,
            "range": "±3.40%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "ff50264a1973f0b9e4414db50fe1d6001ee2ff4a",
          "message": "build(deps): patch all critical/high npm alerts\n\nFix every open critical/high severity npm advisory that has a patched\nrelease, via direct version bumps plus yarn resolutions, following the\nestablished security-triage pattern (precedent 474861b79).\n\nDirect dependency bumps (23 manifests, prod-runtime unless noted):\n- axios 1.18.1 -> 1.20.0 (13 open advisories, incl. redirect-SSRF with\n  maxRedirects:0 ignored and HTTP/2 DNS/proxy bypass; runtime path of\n  every generated typescript-axios client incl. the SATP gateway-client)\n- @grpc/grpc-js 1.14.4 -> 1.14.5 (getAuthContext marking unauthorized\n  client certs as authorized; gateway transport auth trust model)\n- joi 17.13.4 -> 17.13.7, js-yaml 3.15.1 -> 3.15.2\n- fastify 5.8.5 -> 5.12.2 (4 advisories), multer 2.2.0 -> 2.3.0\n- one-line grpc bump in weaver/sdks/fabric/interoperation-node-sdk:\n  required by the version-consistency custom check, same edit as\n  Dependabot PR #4751\n\nRoot resolutions, new: proxy-addr 2.0.8 (critical, IPv4-mapped-IPv6\nspoofing directly under the SATP gateway's express 4.21.0), simple-git\n4.0.1 + @simple-git/argv-parser 2.0.1 + shell-quote >=1.11.0 (criticals),\ncompression 1.8.2, toml >=4.2.0, nanoid 3.3.18, source-map-js 1.2.2,\nbasic-ftp 6.2.1, @graphql-tools/utils 12.0.1, browserslist >=4.28.7,\nengine.io >=6.6.10, multer >=2.3.0.\nRaised: undici 6.28.1 / 7.29.1 / 8.10.2, brace-expansion 1.1.20 / 2.1.6\n/ 5.0.11, handlebars >=4.7.10 (2 criticals), http-cache-semantics >=4.3.0,\nfast-uri >=3.1.7, adm-zip >=0.6.1, decompress alias -> 11.1.4.\nSimple-git is consumed only by repo tooling (tools/*.ts); root devDep\nrange raised to 4.0.1 and compiles.\n\naxios ships a yarn type-patch (.yarn/patches/axios-npm-1.20.0) exporting\nthe axiosResponseDefault unique symbol: 1.20.0 is the only version\nclearing all 13 advisories, but its unexported symbol broke declaration\nemit in every generated typescript-axios client (TS2527 x8). The patch\nis types-only; runtime code is stock 1.20.0.\n\nSATP satp-contract chaincode lockfile regenerated with scoped floors\n(@grpc/grpc-js 1.14.5, brace-expansion 1.1.20/5.0.11, js-yaml 3.15.2/\n4.3.2, nanoid 3.3.18, browserslist >=4.28.7); fabric-contract-api and\nfabric-shim stay at 2.4.1. The satp-wrapper chaincode lockfile has no\nvulnerable entries and is untouched.\n\nVerified: yarn npm audit --recursive --all --environment production\nleaves only braces 3.0.3 and node-forge 1.4.0, both with no patched\nrelease in existence (dismissal rationales audited separately);\nyarn tsc 0 errors; yarn custom-checks all pass; yarn lint clean;\nyarn lint:actions exit 0; SATP Hermes unit suite 648/648 pass; chaincode\ntsc pass. Dockerized SATP e2e suites remain CI-gated (axios 1.20\nredirect/proxy enforcement changed behavior surface).\n\nSupersedes Dependabot PRs #4750/#4751/#4752/#4755, whose build-dev\nchecks fail at install on an angular peer-range conflict.\n\nAssisted-by: zai:glm-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): upgrade deps and openapi-generator to 7.26.0\n\nComplete the critical/high advisory sweep from 808073ae6 and move the\nOpenAPI toolchain off the end-of-life generator 6.6.0.\n\nDependency changes (root package.json + yarn.lock):\n- axios pinned to stock 1.20.0; the types-only yarn patch from the\n  previous commit is removed because the generator upgrade eliminates\n  the TS2527 declaration-emit break it worked around\n- joi 17.13.7, js-yaml 3.15.2/4.3.2, grpc 1.14.5, simple-git 4.0.1 and\n  the resolution floors from 808073ae6 remain; no new version changes\n\nGenerator toolchain:\n- openapi-generator-cli 6.6.0 -> 7.26.0 everywhere: root codegen scripts\n  now fetch the jar from Maven Central into the CLI versions directory\n  and write openapitools.json via tools/write-openapitools-config.cjs\n  (the file is gitignored and consumed at run time)\n- all 18 per-package openapitools.json pins bumped to 7.26.0\n\nTemplate fixes required by 7.26.0 (protobuf-schema custom templates):\n- imports: 7.x emits \"models/x_pb.proto\" relative names, so the old\n  \"{{{modelPackage}}}/\" prefixes double up to the non-existent\n  models/models/ path; drop the prefix in copm-core, besu connector,\n  keychain-memory and cmd-api-server template copies\n- api.mustache: add the supportMultipleResponses oneof block that stock\n  7.x emits for empty-response operations (NoopV1 et al otherwise\n  reference a never-emitted message)\n\nHand-written code migrated to the new generated surface (regenerated\nclients land in the follow-up commit):\n- enum keys: 6.6.0 truncated generated enum keys (Fungible,\n  Nonfungible, Local, Install, Instantiate, Authority, Stake, Work,\n  Send, Call, Sendprivate, _0); 7.26.0 derives full keys from the spec\n  x- names. All consumers updated, including aliased/re-exported forms\n  (TokenType.Fungible, StatusResponseStageEnum._0)\n- protobuf field casing: request/response fields renamed V1PB -> V1Pb\n  in copm validators and keychain-memory crpc services\n- fabric connector: generated params type is now Array<string|null>\n  (spec items nullable:true), so null entries are filtered at the\n  three pass-through sites before handing arrays to fabric-gateway\n- copm: response wrapper types (PledgeAssetV1Response et al) exported\n  from the copm-core barrel; copm-corda service implementation and\n  copm-test integration tests updated to the connect-rpc oneof shape\n- satp-hermes leaves: getView now stringifies a definitely-present\n  view object (safeStableStringify(...) ?? \"\") to satisfy the\n  tightened optional-field typing\n\nVerified: yarn tsc 0 errors; yarn custom-checks all pass; yarn lint\nclean; production audit leaves only braces 3.0.3\nand node-forge 1.4.0, both without a patched release in existence;\nSATP Hermes unit suite 643/643 tests pass (dev-mode suite failure is\npre-existing on the base commit and unrelated).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild: regenerate openapi clients with openapi-generator 7.26.0\n\nPure regeneration output from `yarn codegen` with the generator\nupgraded in the previous commit; no hand edits.\n\n- typescript-axios clients x16: axios typing annotations updated by\n  the 7.x template (returned closures now annotated Promise<R>, which\n  removes the TS2527 inaccessible-unique-symbol declaration-emit\n  break and makes the axios yarn type patch unnecessary); enum keys\n  now derived from spec x- names\n- go clients, kotlin clients, corda kotlin-spring server stubs:\n  regenerated in place\n- protobuf-schema outputs (copm-core, keychain-memory, besu, fabric,\n  cmd-api-server, cacti-copm): model imports now single-prefix\n  models/ paths, response messages emitted via oneof wrappers\n- protoc-gen-ts / connect outputs regenerated from the new protos\n\nAll consumers of these artifacts were adapted in the preceding\ncommit; this commit contains only machine-generated files.\n\nVerified with the same gates as the previous commit (tsc,\ncustom-checks, lint, production audit, SATP unit suite).\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>\n\nbuild(deps): patch npm advisories and upgrade openapi-generator\n\nNote: this tip commit exists so the PR headline matches the PR title\n(pr-structural-checks requires exact equality). Its content is the\ndev-mode test-loader fix described below.\n\nThe dev-mode unit suite failed to load because it imported\nresolveDevMode from plugin-satp-hermes-gateway-cli.ts, whose leading\nwrapped for CommonJS - jest-runtime then fails the whole suite with\n\"SyntaxError: Invalid or unexpected token\" before any test runs.\n\nExtract the function into\nservices/validation/config-validating-functions/resolve-dev-mode.ts\n(its natural home, next to the TLS-devMode validation it feeds), keep\na re-export on the CLI for the launch flow, and point the test at the\nnew module.\n\nVerified: dev-mode suite 5/5 pass; yarn tsc 0 errors; eslint clean on\nthe touched files.\n\nAssisted-by: zai:GLM-5.3\nSigned-off-by: Rafael Belchior <RafaelAPB@users.noreply.github.com>",
          "timestamp": "2026-10-12T14:23:16Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ff50264a1973f0b9e4414db50fe1d6001ee2ff4a"
        },
        "date": 1792657280704,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 915,
            "range": "±3.39%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Ujjwal Verma",
            "username": "ujjwalv01",
            "email": "ujjwalverma010305@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "a29f1f0d8834dbca47a98f9a27872a980c337541",
          "message": "docs(mkdocs): apply Cacti design system to documentation site\n\nAdd a token stylesheet and a Material mapping stylesheet, Barlow\ndisplay headings, custom light and dark palettes, and re-skinned\nadmonitions, code blocks, badges, header and tabs. Add a Design\nSystem page under Reference.\n\nApply the same tokens to the SATP Hermes TypeDoc theme and use a\ndark highlight theme so code blocks stay readable on the ink canvas.\n\nRefs #4712\n\nSigned-off-by: Ujjwal Verma <ujjwalverma010305@gmail.com>",
          "timestamp": "2026-10-05T14:18:03Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/a29f1f0d8834dbca47a98f9a27872a980c337541"
        },
        "date": 1793002941292,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 599,
            "range": "±3.12%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 672,
            "range": "±3.18%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Ujjwal Verma",
            "username": "ujjwalv01",
            "email": "ujjwalverma010305@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "a29f1f0d8834dbca47a98f9a27872a980c337541",
          "message": "docs(mkdocs): apply Cacti design system to documentation site\n\nAdd a token stylesheet and a Material mapping stylesheet, Barlow\ndisplay headings, custom light and dark palettes, and re-skinned\nadmonitions, code blocks, badges, header and tabs. Add a Design\nSystem page under Reference.\n\nApply the same tokens to the SATP Hermes TypeDoc theme and use a\ndark highlight theme so code blocks stay readable on the ink canvas.\n\nRefs #4712\n\nSigned-off-by: Ujjwal Verma <ujjwalverma010305@gmail.com>",
          "timestamp": "2026-10-05T14:18:03Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/a29f1f0d8834dbca47a98f9a27872a980c337541"
        },
        "date": 1793003303726,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 826,
            "range": "±3.20%",
            "unit": "ops/sec",
            "extra": "178 samples"
          }
        ]
      }
    ]
  }
}