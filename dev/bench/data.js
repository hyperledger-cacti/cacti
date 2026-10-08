window.BENCHMARK_DATA = {
  "lastUpdate": 1791447568734,
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
      }
    ]
  }
}