window.BENCHMARK_DATA = {
  "lastUpdate": 1710883597763,
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
          "id": "154ea7d64c24b09796f83fdcfd2a356c9fc38d7a",
          "message": "build(deps): upgrade @grpc/grpc-js to v1.10.3\n\n1. This is a pre-requisite for a bigger change that is adding gRPC\nendpoint support to the plugins.\n2. We've had gRPC support in the API server for a long time, but the\nplugins are not yet able to register their own gRPC services as of now.\n3. The reason we need the newer version is because some types are not\nexported by the older version that we'll be using to implement the\ngRPC support for plugins.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-19T02:09:01-07:00",
          "tree_id": "71d477df8fff97acd17aa728f927387b51ac17c1",
          "url": "https://github.com/hyperledger/cacti/commit/154ea7d64c24b09796f83fdcfd2a356c9fc38d7a"
        },
        "date": 1710840277204,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 598,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 370,
            "range": "±1.31%",
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
          "id": "1eacf7e2a33349de794d486a47cc6bd62d93311a",
          "message": "fix(plugin-keychain-vault): fix CVE-2024-0553 in vault server image\n\n1. The solution here was to migrate the image from Debian to Ubuntu\nbecause it seems to not have the same vulnerabilities as the lastest\nstable Debian image does, so the change itself is to move to Ubuntu 24.04\nLTS.\n2. Also upgraded the Rust toolchain to the current latest which mandated\na couple of small code changes that are also added in this commit.\n\nThe original security report from Trivy that we've discoverd on the CI:\n\n┌─────────────┬───────────────┬──────────┬───────────────────┐\n│   Library   │ Vulnerability │ Severity │ Installed Version │\n├─────────────┼───────────────┼──────────┼───────────────────┤\n│ libgnutls30 │ CVE-2024-0553 │ HIGH     │ 3.6.7-4+deb10u11  │\n│             │               │          │                   │\n└─────────────┴───────────────┴──────────┴───────────────────┘\n...\n┬──────────────────┬───────────────────────────────────────────┐\n│  Fixed Version   │                   Title                   │\n┼──────────────────┼───────────────────────────────────────────┤\n│ 3.6.7-4+deb10u12 │ gnutls: incomplete fix for CVE-2023-5981  │\n│                  │ https://avd.aquasec.com/nvd/cve-2024-0553 │\n┴──────────────────┴───────────────────────────────────────────┘\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-19T14:16:45-07:00",
          "tree_id": "029bcca022f2a0bf18102d3cb17caeeb8fb6a033",
          "url": "https://github.com/hyperledger/cacti/commit/1eacf7e2a33349de794d486a47cc6bd62d93311a"
        },
        "date": 1710883595211,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 588,
            "range": "±1.61%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 365,
            "range": "±1.23%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}