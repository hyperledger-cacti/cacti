window.BENCHMARK_DATA = {
  "lastUpdate": 1720108484858,
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
          "id": "9eefa66446a193c7ca164c876f8ed6d5cc56549b",
          "message": "fix(cmd-api-server): use ncc bundle in container image - CVE-2024-29415\n\nFixes the CVE mentioned and also improves our response time to future CVEs\nby a very wide margin. Details below.\n\n1. Fixing the mentioned vulnerability in the API server and doing so in\na way so that in the future our dependency upgrades automatically propagate\nto the container builds as well.\n2. The way we are achieving this is by making the container image build\nuse the pre-built bundle instead of pulling the package contents from npm.\n3. This has the advantage of breaking the chicken egg problem with releases\nto npm and container images, so from now on if we are adding a fix to the\nAPI server in the code, the built container image will automatically contain\nthat fix when building on the CI for the pull request.\n4. This is also a new pattern for how to create our container images that\nhas a couple more improvements to it:\n4.1. The .dockerignore file is now specific to the particular package's\ncontainer image instead of the global one in the project root being used.\nThis was needed because we are copying files from the ./dist/ folder of the\npackage to the container image at build time but this was not possible while\nthe root dir .dockerignore file was in effect because it blanket ignores\nthe ./dist/ folders overall and so the image building was failing with errors\nthat it couldn't locate the bundle (which is inside the ./dist/ directory)\n4.2. The healthcheck of the container is now 100% self-contained and needs\nno external dependencies of any kind (neither npm nor operating system level ones)\nThis is beneficial because it reduces the attack-surface of the image and also\nreduce the size of the image by at least a 100 MB.\n4.3. With the introduction of the usage of the bundled version of the code\nwe have **dramatically** reduced the image size overall. The image built from\nthis revision of the code is 221 MB while the previous image versions were\nhovering closer to a 0.5 GB.\n5. Also updated the README of the package so that all the examples pertaining\nto the container image are now fully functional once again.\n6. Simplified the container image's definition: the custom docker entrypoint\nscript and the healthcheck bash script are no longer necessary.\n7. Renamed the container image definition file from `Dockerfile` to\n`cmd-api-server.Dockerfile` because this is mandated by Docker when building\nimages with custom .dockerignore files (it needs the custom filename to\ndisambiguate the .dockerignore files based on it)\n8. Refactored how the CI executes the Trivy scan to reduce resource usage:\n8.1. There is no separate image build job now. This was necessary because\nwith the new image definition we have to have the project compiled first\n(since we no longer install directly from npm) so it would've been a lot of\nduplicated compute time to recompile the project in yet another CI job for the\nimage build.\n\nThe image built from this revision is also published on the official repository\nwith the canary tag of:\n`ghcr.io/hyperledger/cactus-cmd-api-server:2024-07-03T19-32-51-dev-3f5e97893`\n\nSigned-off-by: Peter Somogyvari <peter.somogyvari@accenture.com>",
          "timestamp": "2024-07-04T08:37:54-07:00",
          "tree_id": "f082e87388e9283e652d4fd284fd94d73d86d040",
          "url": "https://github.com/hyperledger/cacti/commit/9eefa66446a193c7ca164c876f8ed6d5cc56549b"
        },
        "date": 1720108482212,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 575,
            "range": "±1.69%",
            "unit": "ops/sec",
            "extra": "177 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 346,
            "range": "±1.37%",
            "unit": "ops/sec",
            "extra": "181 samples"
          }
        ]
      }
    ]
  }
}