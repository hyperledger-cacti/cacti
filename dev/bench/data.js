window.BENCHMARK_DATA = {
  "lastUpdate": 1711041785907,
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
          "id": "941dbad8fa5950b754dde97b02cc4c0ac0e9e0bb",
          "message": "feat(common): add isGrpcStatusObjectWithCode user-defined type guard\n\n1. User-defined Typescript type-guard function that asserts whether a value or\nobject is a `@grpc/grpc-js` {Partial<StatusObject>} or not.\nThe reason why it checks for {Partial} is because all of the properties of\nthe {StatusObject} are defined as optional for some reason, hence we cannot\nassume anything about those being present or not by default.\n2. Therefore this method will just check if the `code` property is set or not\nand return `true` or `false` based on that.\n3. The above is also the reason why the name of the function is slightly more\nverbose than your average user-defined type-guard that could be named just\n\"isGrpcStatusObject()\" but we wanted to make sure that more specific type-guards\ncan be added later that check for other optional properities or for the\npresence of all of them together.\n\nLink to the status builder within grpc-js:\nhttps://github.com/grpc/grpc-node/blob/master/packages/grpc-js/src/status-builder.ts\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-19T21:04:45-07:00",
          "tree_id": "31d57363ec0311b3921dc117045f26de55790256",
          "url": "https://github.com/hyperledger/cacti/commit/941dbad8fa5950b754dde97b02cc4c0ac0e9e0bb"
        },
        "date": 1710908389235,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 600,
            "range": "±1.74%",
            "unit": "ops/sec",
            "extra": "179 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 369,
            "range": "±1.56%",
            "unit": "ops/sec",
            "extra": "182 samples"
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
          "id": "e87e57791024824bb19830c66b9f3d2eaed6d629",
          "message": "feat(core-api): add IPluginGrpcService type & user-defined type guard\n\n1. This will be used by the upcoming functionality of the API server that\nallows all plugins to register their own gRPC services as part of the API\nserver's own gRPC service.\n2. The above mechanism will largely be the same conceptually as the one\nwe have for HTTP and SocketIO endpoints already.\n3. It is optional for plugins to implement gRPC services and therefore\nthe interface is a standalone one instead of being baked into the more\ngeneric IPluginWebService interface for example.\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-03-21T10:12:36-07:00",
          "tree_id": "297b3df27500cbf4b1dbe5b5c5d872665072a06f",
          "url": "https://github.com/hyperledger/cacti/commit/e87e57791024824bb19830c66b9f3d2eaed6d629"
        },
        "date": 1711041782723,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 590,
            "range": "±1.63%",
            "unit": "ops/sec",
            "extra": "178 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 365,
            "range": "±1.30%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}