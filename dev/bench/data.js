window.BENCHMARK_DATA = {
  "lastUpdate": 1787830106326,
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
      },
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
        "date": 1787560146055,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 900,
            "range": "±3.16%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Maciej Skrzypkowski",
            "username": "mskrzypkows",
            "email": "mskr@gmx.com"
          },
          "committer": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "56ee7616bfe111c1d849ea07c20868fe46a4a359",
          "message": "fix(satp-hermes): fix caching, ClaimFormat check, network config\n\n    BesuLeaf passed wrapperContractAddress as contractName in lockAsset(),\n    unlockAsset(), and runTransaction(), causing an ABI cache miss on every\n    call. Fixed to use wrapperContractName, and added a regression test\n    covering this case.\n\n    ConnectorOptionsError in EthereumLeaf's constructor said \"FabricLeaf\" —\n    corrected to \"EthereumLeaf\".\n\n    OracleEVM used EthereumLeaf.CLASS_NAME for its `this.id` assignment and\n    in a NoSigningCredentialError message. Both replaced with\n    OracleEVM.CLASS_NAME, and the now-unused EthereumLeaf import was removed.\n\n    SATPBridgeExecutionLayerImpl and OracleExecutionLayer used the `in`\n    operator to check supported claim formats, which checks array indices\n    (0, 1, 2...) rather than values. Since ClaimFormat.DEFAULT=1, `1 in [1]`\n    evaluated to false, causing every transfer to throw ClaimFormatError.\n    Both now use Array.prototype.includes(). Added unit tests covering:\n    supported format accepts, DEFAULT fallback, unsupported format throws,\n    and empty supported list throws. Also corrected the oracle's error\n    message to reference \"the oracle\" instead of \"the bridge\".\n\n    Exported IEthereumNetworkConfig, the configuration interface consumers\n    need to connect gateways to Ethereum networks.\n\n    Assisted-by: anthropic:claude-sonnet-4.6\n\nSigned-off-by: Maciej Skrzypkowski <mskr@gmx.com>",
          "timestamp": "2026-08-17T07:06:07Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/56ee7616bfe111c1d849ea07c20868fe46a4a359"
        },
        "date": 1787830103756,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 641,
            "range": "±3.01%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 663,
            "range": "±1.98%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      }
    ]
  }
}