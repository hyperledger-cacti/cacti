window.BENCHMARK_DATA = {
  "lastUpdate": 1783330605404,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "rafael.belchior@tecnico.ulisboa.pt"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "a958b141de343b43917e53620593093cc93aef03",
          "message": "ci: fix multiple issues with workflows\n\nSquash of 43 commits from release/v3.0.0-staging-2 preparing the v3.0.0\nrelease. Spans SATP Hermes stabilisation, Weaver build overhaul,\nCI/CD hardening, dependency upgrades, security fixes, and a new Oracle\ndatabase feature.\n\nHighlights\n\nSATP Hermes package: packages/cactus-plugin-satp-hermes\n- Multiple rounds of unit, integration, and Docker-based test fixes;\n  removed race conditions and stabilised end-to-end flows.\n- Fixed SATP identity validation logic.\n- Fixed monitoring opt-in/opt-out behaviour.\n- Aligned Docker image references used by integration tests.\n- Restored SATP workflows after refactor churn.\n- feat: introduced Oracle database persistence for oracle data, gateway\n  wiring, repository implementation, and migrations.\n- Fixed Oracle issues surfaced by dependency bumps.\n\nWeaver packages: weaver and related npm packages\n- packages/weaver-besu-cli: added missing `bs58` dependency; removed\n  redundant `yarn format` and `yarn lint` calls from build.\n- packages/weaver-fabric-cli: fixed `yarn build`.\n- packages/weaver-sdk-fabric: normalised ECIES shared-secret padding.\n- Pinned `net` and `crypto` Go module versions without `replace`\n  directives.\n- Upgraded Node 16 -> 18 in Weaver Dockerfiles.\n\nBungee package: packages/cactus-plugin-bungee-hermes\n- Fixed bungee ports in tests.\n- Skipped Fabric tests in bungee where they are not exercisable in CI.\n\nOther packages\n- packages/cactus-plugin-ledger-connector-iroha2: archived the package.\n- packages/cactus-test-tooling: enforced `waitForHealthCheck` across\n  consumers.\n- Fixed issues in other cacti packages surfaced by the upgrade pass.\n\nCI: .github/workflows, build, tooling\n- Pinned GitHub Actions to specific SHAs and updated action versions.\n- Touched up webpack configuration for CI builds.\n- Removed code-quality dependency from the core-packages job.\n- Fixed COPM workflows.\n- Improved CodeQL job timeout and alert dismissal handling; resolved\n  outstanding CodeQL and security alerts.\n- use temurin for the java 11 installation\n\nDependencies and tooling: monorepo-wide\n- Bumped dependencies across the monorepo.\n- Upgraded Angular 17 -> 19.\n- Ran repo-wide `yarn lint`.\n\nTests / flakiness: SATP, Corda, and CI test suites\n- Skipped known flaky tests and remaining problematic Corda tests.\n- Applied targeted fixes for assorted flaky tests across packages.\n\nDocs package/path: repository docs\n- Added Confluence reference to documentation.\n\n---\n\nchore: fix weaver issues\n\n- use temurin for the java 11 installation\n- remove code quality dependency from core-packages\n- weaver-besu-cli: add bs58 dependency to fix CI module resolution error\n\nchore(yarn): add packageExtension for @ensdomains/ensjs\nto declare bs58 under pnpm linker\n\nSigned-off-by: Carlos Amaro <carlosrscamaro@tecnico.ulisboa.pt>\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nchore: upgrade angular 17 to 19\n\nchore: run yarn lint\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nci(copm): fix issues with copm workflows\n\n- use go1.20 for copm\n- freeze protoc-gen-go version to 1.34.2\n- fix JEST_TEST_PATTERN string with two file names\n- point to locally built iin-agent image\n- locally build fabric driver and use it\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nfix(weaver): pin the version of net and crypto of go modules without replace\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nfix: satp workflows\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix cacti packages\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix SATP tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore: add alert dismissal for codeql\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore: archive cacti supply chain example\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix fix satp tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore: remove supply chain example\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp race condition\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp integration tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ntest: skip problemmatic tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ntest: skip rest of corda\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ntest: fix satp docker image reference\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix(test-tooling): enforce waitForHealthCheck\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix(satp-hermes): fix monitoring opt in/out\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix bungee ports in test\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: skip flaky tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix(ci): fix besu tape brace pattern\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: skip Fabric tests in bungee\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore(ci): touch up webpack\n\nAssisted-by: claude-opus-4\nSigned-off-by: Ry Jones <ry@linux.com>\n\nchore(ci): update actions to recent versions and pin them\n\nAssisted-by: claude-fable-5\nSigned-off-by: Ry Jones <ry@linux.com>\n\nfix: bump dependencies and fix oracle\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix security alerts\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: improve codeql job and increate timeout\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ndocs: add confluence reference\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfeat: oracle database\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp identity validation\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp integration tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp docker and integraiton tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp docker and integraiton tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp docker and integraiton tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\n---\n\nAssisted-by: anthropic:claude-opus-4.6\nAssisted-by: anthropic:claude-opus-4.7\n\nCo-authored-by: Sandeep Nishad <sandeep.nishad1@ibm.com>\nCo-authored-by: Carlos Amaro <carlosrscamaro@tecnico.ulisboa.pt>\nCo-authored-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\nCo-authored-by: Ry Jones <ry@linux.com>\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>",
          "timestamp": "2026-06-18T06:49:15Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/a958b141de343b43917e53620593093cc93aef03"
        },
        "date": 1782123097165,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 634,
            "range": "±2.79%",
            "unit": "ops/sec",
            "extra": "174 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 627,
            "range": "±2.25%",
            "unit": "ops/sec",
            "extra": "183 samples"
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
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "a958b141de343b43917e53620593093cc93aef03",
          "message": "ci: fix multiple issues with workflows\n\nSquash of 43 commits from release/v3.0.0-staging-2 preparing the v3.0.0\nrelease. Spans SATP Hermes stabilisation, Weaver build overhaul,\nCI/CD hardening, dependency upgrades, security fixes, and a new Oracle\ndatabase feature.\n\nHighlights\n\nSATP Hermes package: packages/cactus-plugin-satp-hermes\n- Multiple rounds of unit, integration, and Docker-based test fixes;\n  removed race conditions and stabilised end-to-end flows.\n- Fixed SATP identity validation logic.\n- Fixed monitoring opt-in/opt-out behaviour.\n- Aligned Docker image references used by integration tests.\n- Restored SATP workflows after refactor churn.\n- feat: introduced Oracle database persistence for oracle data, gateway\n  wiring, repository implementation, and migrations.\n- Fixed Oracle issues surfaced by dependency bumps.\n\nWeaver packages: weaver and related npm packages\n- packages/weaver-besu-cli: added missing `bs58` dependency; removed\n  redundant `yarn format` and `yarn lint` calls from build.\n- packages/weaver-fabric-cli: fixed `yarn build`.\n- packages/weaver-sdk-fabric: normalised ECIES shared-secret padding.\n- Pinned `net` and `crypto` Go module versions without `replace`\n  directives.\n- Upgraded Node 16 -> 18 in Weaver Dockerfiles.\n\nBungee package: packages/cactus-plugin-bungee-hermes\n- Fixed bungee ports in tests.\n- Skipped Fabric tests in bungee where they are not exercisable in CI.\n\nOther packages\n- packages/cactus-plugin-ledger-connector-iroha2: archived the package.\n- packages/cactus-test-tooling: enforced `waitForHealthCheck` across\n  consumers.\n- Fixed issues in other cacti packages surfaced by the upgrade pass.\n\nCI: .github/workflows, build, tooling\n- Pinned GitHub Actions to specific SHAs and updated action versions.\n- Touched up webpack configuration for CI builds.\n- Removed code-quality dependency from the core-packages job.\n- Fixed COPM workflows.\n- Improved CodeQL job timeout and alert dismissal handling; resolved\n  outstanding CodeQL and security alerts.\n- use temurin for the java 11 installation\n\nDependencies and tooling: monorepo-wide\n- Bumped dependencies across the monorepo.\n- Upgraded Angular 17 -> 19.\n- Ran repo-wide `yarn lint`.\n\nTests / flakiness: SATP, Corda, and CI test suites\n- Skipped known flaky tests and remaining problematic Corda tests.\n- Applied targeted fixes for assorted flaky tests across packages.\n\nDocs package/path: repository docs\n- Added Confluence reference to documentation.\n\n---\n\nchore: fix weaver issues\n\n- use temurin for the java 11 installation\n- remove code quality dependency from core-packages\n- weaver-besu-cli: add bs58 dependency to fix CI module resolution error\n\nchore(yarn): add packageExtension for @ensdomains/ensjs\nto declare bs58 under pnpm linker\n\nSigned-off-by: Carlos Amaro <carlosrscamaro@tecnico.ulisboa.pt>\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nchore: upgrade angular 17 to 19\n\nchore: run yarn lint\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nci(copm): fix issues with copm workflows\n\n- use go1.20 for copm\n- freeze protoc-gen-go version to 1.34.2\n- fix JEST_TEST_PATTERN string with two file names\n- point to locally built iin-agent image\n- locally build fabric driver and use it\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nfix(weaver): pin the version of net and crypto of go modules without replace\n\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>\n\nfix: satp workflows\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix cacti packages\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix SATP tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore: add alert dismissal for codeql\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore: archive cacti supply chain example\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix fix satp tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore: remove supply chain example\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp race condition\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp integration tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ntest: skip problemmatic tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ntest: skip rest of corda\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ntest: fix satp docker image reference\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix(test-tooling): enforce waitForHealthCheck\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix(satp-hermes): fix monitoring opt in/out\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix bungee ports in test\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: skip flaky tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix(ci): fix besu tape brace pattern\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: skip Fabric tests in bungee\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nchore(ci): touch up webpack\n\nAssisted-by: claude-opus-4\nSigned-off-by: Ry Jones <ry@linux.com>\n\nchore(ci): update actions to recent versions and pin them\n\nAssisted-by: claude-fable-5\nSigned-off-by: Ry Jones <ry@linux.com>\n\nfix: bump dependencies and fix oracle\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix security alerts\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: improve codeql job and increate timeout\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\ndocs: add confluence reference\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfeat: oracle database\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp identity validation\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp integration tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp docker and integraiton tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp docker and integraiton tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\nfix: fix satp docker and integraiton tests\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\n\n---\n\nAssisted-by: anthropic:claude-opus-4.6\nAssisted-by: anthropic:claude-opus-4.7\n\nCo-authored-by: Sandeep Nishad <sandeep.nishad1@ibm.com>\nCo-authored-by: Carlos Amaro <carlosrscamaro@tecnico.ulisboa.pt>\nCo-authored-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>\nCo-authored-by: Ry Jones <ry@linux.com>\n\nSigned-off-by: Rafael Belchior <rafael.belchior@tecnico.ulisboa.pt>",
          "timestamp": "2026-06-18T06:49:15Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/a958b141de343b43917e53620593093cc93aef03"
        },
        "date": 1782123419337,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 926,
            "range": "±3.39%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "25e0fd3169dee9414fabe773b30557e5d08d9c03",
          "message": "ci: validate PR type and verify PR title matches commit message\n\nAssisted-by: Google:Gemini\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-05-18T08:26:42Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/25e0fd3169dee9414fabe773b30557e5d08d9c03"
        },
        "date": 1782378856207,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 638,
            "range": "±2.71%",
            "unit": "ops/sec",
            "extra": "175 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 666,
            "range": "±1.88%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "25e0fd3169dee9414fabe773b30557e5d08d9c03",
          "message": "ci: validate PR type and verify PR title matches commit message\n\nAssisted-by: Google:Gemini\nSigned-off-by: Sandeep Nishad <sandeepn.official@gmail.com>",
          "timestamp": "2026-05-18T08:26:42Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/25e0fd3169dee9414fabe773b30557e5d08d9c03"
        },
        "date": 1782379245273,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 865,
            "range": "±3.60%",
            "unit": "ops/sec",
            "extra": "179 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Mustafa Sayyed",
            "username": "mustafa-sayyed",
            "email": "mustafasayyed2429@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "e9803814046525539f03cdc046105ccde86ca141",
          "message": "docs: fix image path in Build.md\n\nSigned-off-by: Mustafa Sayyed <mustafasayyed2429@gmail.com>",
          "timestamp": "2026-05-10T18:45:51Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/e9803814046525539f03cdc046105ccde86ca141"
        },
        "date": 1782726302749,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 622,
            "range": "±3.06%",
            "unit": "ops/sec",
            "extra": "175 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 636,
            "range": "±2.04%",
            "unit": "ops/sec",
            "extra": "183 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Mustafa Sayyed",
            "username": "mustafa-sayyed",
            "email": "mustafasayyed2429@gmail.com"
          },
          "committer": {
            "name": "Sandeep Nishad",
            "username": "sandeepnRES",
            "email": "sandeepn.official@gmail.com"
          },
          "id": "e9803814046525539f03cdc046105ccde86ca141",
          "message": "docs: fix image path in Build.md\n\nSigned-off-by: Mustafa Sayyed <mustafasayyed2429@gmail.com>",
          "timestamp": "2026-05-10T18:45:51Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/e9803814046525539f03cdc046105ccde86ca141"
        },
        "date": 1782726568356,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 936,
            "range": "±3.00%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Abhayraj Jaiswal",
            "username": "abhayrajjais01",
            "email": "abhayraj916146@gmail.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "42a45fe4e1ba3c85715624bd350b94eddd81d91f",
          "message": "fix(cmd-api-server): make gRPC bind host configurable (#4311)\n\nSigned-off-by: abhayrajjais01 <abhayraj916146@gmail.com>",
          "timestamp": "2026-07-01T16:15:38Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/42a45fe4e1ba3c85715624bd350b94eddd81d91f"
        },
        "date": 1782983621074,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 653,
            "range": "±2.95%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 654,
            "range": "±2.08%",
            "unit": "ops/sec",
            "extra": "184 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Abhayraj Jaiswal",
            "username": "abhayrajjais01",
            "email": "abhayraj916146@gmail.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "42a45fe4e1ba3c85715624bd350b94eddd81d91f",
          "message": "fix(cmd-api-server): make gRPC bind host configurable (#4311)\n\nSigned-off-by: abhayrajjais01 <abhayraj916146@gmail.com>",
          "timestamp": "2026-07-01T16:15:38Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/42a45fe4e1ba3c85715624bd350b94eddd81d91f"
        },
        "date": 1782983966824,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 925,
            "range": "±3.63%",
            "unit": "ops/sec",
            "extra": "182 samples"
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
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "07f22920cc65244d89114b750787859fd0381baf",
          "message": "ci(satp-hermes): stop publishing to npmjs; GPR-only + idempotent\n\nThe satp npm workflow published to npmjs.org with a legacy NPM_TOKEN that now\n401s. npm moved to OIDC trusted publishing, but a package may have only one\ntrusted publisher and npm matches it against the top-level workflow, not a\nreusable child. The repo-wide publish-npm.yaml already is that single trusted\npublisher and publishes every non-private package (satp included) on v* tags.\n\nSo this pipeline can neither reuse nor duplicate that publisher for npmjs.\nRemove the npmjs publish job entirely: npmjs is owned by publish-npm.yaml on\nreleases, and this workflow now publishes dev/release builds only to the GitHub\nPackage Registry (GITHUB_TOKEN). No npm tokens anywhere.\n\nAlso add an idempotency guard to the GitHub Packages publish: dev versions are\nkeyed on the short SHA, so re-running the pipeline on an unchanged commit\nrepublishes an identical version and the registry 409s. Skip when the exact\nversion already exists.\n\nDrop the now-unused id-token: write from this workflow and the caller pipeline.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nSigned-off-by: Ry Jones <ry@linux.com>",
          "timestamp": "2026-07-03T17:02:55Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/07f22920cc65244d89114b750787859fd0381baf"
        },
        "date": 1783330288666,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 646,
            "range": "±3.48%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 663,
            "range": "±1.90%",
            "unit": "ops/sec",
            "extra": "184 samples"
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
            "name": "Rafael Belchior",
            "username": "RafaelAPB",
            "email": "RafaelAPB@users.noreply.github.com"
          },
          "id": "07f22920cc65244d89114b750787859fd0381baf",
          "message": "ci(satp-hermes): stop publishing to npmjs; GPR-only + idempotent\n\nThe satp npm workflow published to npmjs.org with a legacy NPM_TOKEN that now\n401s. npm moved to OIDC trusted publishing, but a package may have only one\ntrusted publisher and npm matches it against the top-level workflow, not a\nreusable child. The repo-wide publish-npm.yaml already is that single trusted\npublisher and publishes every non-private package (satp included) on v* tags.\n\nSo this pipeline can neither reuse nor duplicate that publisher for npmjs.\nRemove the npmjs publish job entirely: npmjs is owned by publish-npm.yaml on\nreleases, and this workflow now publishes dev/release builds only to the GitHub\nPackage Registry (GITHUB_TOKEN). No npm tokens anywhere.\n\nAlso add an idempotency guard to the GitHub Packages publish: dev versions are\nkeyed on the short SHA, so re-running the pipeline on an unchanged commit\nrepublishes an identical version and the registry 409s. Skip when the exact\nversion already exists.\n\nDrop the now-unused id-token: write from this workflow and the caller pipeline.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nSigned-off-by: Ry Jones <ry@linux.com>",
          "timestamp": "2026-07-03T17:02:55Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/07f22920cc65244d89114b750787859fd0381baf"
        },
        "date": 1783330602689,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "plugin-ledger-connector-besu_HTTP_GET_getOpenApiSpecV1",
            "value": 908,
            "range": "±3.30%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}