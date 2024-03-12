window.BENCHMARK_DATA = {
  "lastUpdate": 1710228604461,
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
          "id": "f3974d2b18b997c77d2e3cfc913a785c294d5c4c",
          "message": "build(rust-compiler): retire the container image and the test cases\n\n1. This started off with me trying to fix the CVEs in the rust-compiler image.\n2. I was able to get rid of most of them by changing the base image to ubuntu-24.04\n3. The remaining high and critical ones were due to wasm-pack so went to see\nif we could upgrade that but we are already on the latest which is 8 months old.\nThe vulnerabilities were reported on the wasm-pack repo 6 months ago along with\na pull request that fixes them, neither the issue nor the pull request fixing it\nreceived any attention from the wasm-pack maintainers which lead me to believe\nthat it is a liability to depend on it right now and we should instead look into\na different tooling where the maintenance happens to have a little more resources\ndedicated to it. Java/Kotlin might be the way to go.\n4. I've also looked into possible alternatives to wasm-pack but the only\nother tool I found that does the same thing is cargo-web which hasn't had\na new release for 4 years and counting and has even more CVEs plaguing it\nthan wasm-pack.\n5. The official web assembly site links to wasm-pack when it comes to\ncompiling to it from Rust so there's probably not a better maintained tool\nout there, but if someone finds something I'd love to start using it.\nIn the meantime I'll just archive/retire/delete the rust compiler image\nand the tests associated with it because it's a maintenance burden that\nwe don't need to carry.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-12T00:19:43-07:00",
          "tree_id": "6672f5d6da18e1396b88613313feae1b24439639",
          "url": "https://github.com/hyperledger/cacti/commit/f3974d2b18b997c77d2e3cfc913a785c294d5c4c"
        },
        "date": 1710228602141,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 593,
            "range": "±1.93%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 353,
            "range": "±1.25%",
            "unit": "ops/sec",
            "extra": "180 samples"
          }
        ]
      }
    ]
  }
}