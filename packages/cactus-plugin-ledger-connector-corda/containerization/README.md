## Temporary Notes For Development

The upgrade of the `express-openapi-validator` dependency was just an attempt
at fixing a problem with circular schema references in the Corda connector's
OpenAPI json file. 
It did not work so the problem still persists and the likely workaround will be
to just disable the OpenAPI request validation for the proxied requests because
we have the validation in place on the JVM app side anyway.
The finalized way of dealing with this is to be defined as of right now.

## Usage

1. `DOCKER_BUILDKIT=1 docker build --build-arg NPM_PKG_VERSION=1.0.0 -f ./packages/cactus-cmd-api-server/Dockerfile . --tag cas:latest`
2. `cd packages/cactus-plugin-ledger-connector-corda/containerization`
3. `./run.sh`
4. Now you can send API requests through localhost:4000 or localhost:8080 (for now only localhost:8080 works)

## Debug Task for VSCode

```json
{
    "type": "node",
    "request": "launch",
    "name": "cmd-api-server-json",
    "cwd": "${workspaceFolder}",
    "args": [
    "${workspaceRoot}/packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js",
    "--config-file=./.config.json"
    ],
    "console": "integratedTerminal",
    "internalConsoleOptions": "neverOpen"
},
```