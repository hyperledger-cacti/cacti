window.BENCHMARK_DATA = {
  "lastUpdate": 1789633268887,
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
      }
    ]
  }
}