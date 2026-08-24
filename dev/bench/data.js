window.BENCHMARK_DATA = {
  "lastUpdate": 1787559828171,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Ry Jones",
            "username": "ryjones",
            "email": "ry@linux.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "340729e31d962533778a80631c65f8ead1c0ba2b",
          "message": "chore: add Dependabot version updates cooldown\n\nSet `cooldown` on all five ecosystems (npm, github-actions, docker,\ngomod, cargo) so a newly published version is not proposed until it has\nbeen on its registry for 30 days. That is the window in which a\ncompromised or typosquatted release is typically yanked, so waiting it\nout mitigates supply chain attacks that ride a malicious release.\n\n`cooldown` applies to version updates only -- security updates driven by\na published advisory are never delayed by it, so vulnerability fixes\nstill land immediately. A dependency still inside its cooldown is left\nout of that run's group PR and picked up once eligible, leaving the\none-PR-per-ecosystem grouping intact.\n\nThe semver-major/minor/patch-days keys are set only on npm, gomod, and\ncargo; the other ecosystems do not use semantic versioning and accept\ndefault-days alone.\n\nCo-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>\nSigned-off-by: Ry Jones <ry@linux.com>",
          "timestamp": "2026-08-22T12:07:43Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/340729e31d962533778a80631c65f8ead1c0ba2b"
        },
        "date": 1787559825449,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 585,
            "range": "±3.70%",
            "unit": "ops/sec",
            "extra": "174 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 666,
            "range": "±2.76%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}