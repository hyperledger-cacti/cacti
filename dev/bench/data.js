window.BENCHMARK_DATA = {
  "lastUpdate": 1789028254143,
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
      }
    ]
  }
}