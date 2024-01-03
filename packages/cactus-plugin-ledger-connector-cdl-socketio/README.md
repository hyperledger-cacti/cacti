# `@hyperledger/cactus-plugin-ledger-connector-cdl-socketio`

This plugin provides `Cacti` a way to interact with Fujitsu CDL networks. Using this we can perform:

- `sendSyncRequest`: Send sync-typed requests to the API.
- `sendAsyncRequest`: Send async-typed requests to the API.

## Getting started

### Required software components

- OS: Linux (recommended Ubuntu20.04,18.04 or CentOS7)
- Docker (recommend: v17.06.2-ce or greater)
- node.js v12 (recommend: v12.20.2 or greater)

## Boot methods

### Common setup

1. Always run configure command first, from the project root directory:

   ```bash
   pushd ../..
   npm run configure
   popd
   ```

1. Copy default configuration

- **Remember to replace default CA and to adjust the `default.yaml` configuration on production deployments!**
  ```bash
  mkdir -p /etc/cactus/connector-cdl-socketio
  rm -r /etc/cactus/connector-cdl-socketio/*
  cp -rf ./sample-config/* /etc/cactus/connector-cdl-socketio/
  ```

#### Configuring CDL API Gateway Access

- Set the base URL of GW service in `cdlApiGateway.url` (when using JWT access token - DEFAULT) and/or `cdlApiSubscriptionGateway.url` (when using subscription-key)
  - Example: `"http://localhost:3000"`
- If the service certificate is signed with a known CA (node uses Mozilla DB), then you can skip the next steps.
- If the service is signed with unknown CA, you can specify the gateway certificate to trust manually:
  - Set `cdlApiGateway.caPath`/`cdlApiSubscriptionGateway.caPath` to path of API Gateway certificate (in PEM format). (example: `"/etc/cactus/connector-cdl-socketio/CA/cdl-api-gateway-ca.pem"`)
  - (optional) If server name in cert doesn't match the one in `url`, you can overwrite it in `cdlApiGateway.serverName`/`cdlApiSubscriptionGateway.serverName`
- (not recommended - only for development): To ignore certificate rejection (e.g. use self-signed certificate) set `cdlApiGateway.skipCertCheck`/`cdlApiSubscriptionGateway.skipCertCheck` to `true`.

### Docker

- Docker build process will use artifacts from the latest build. Make sure `./dist` contains the version you want to dockerize.

```
# Build
DOCKER_BUILDKIT=1 docker build ./packages/cactus-plugin-ledger-connector-cdl-socketio -t cactus-plugin-ledger-connector-cdl-socketio

# Run
docker run -v/etc/cactus/:/etc/cactus -p 5061:5061 cactus-plugin-ledger-connector-cdl-socketio
```

### Manual

```
npm run start
```

## Configuration

- Validator can be configured in `/etc/cactus/connector-cdl-socketio/default.yaml` (see [sample-config](./sample-config/default.yaml) for details).

## Manual Tests

- There are no automatic tests for this plugin because there's no private instance of CDL available at a time.
- `cdl-connector-manual.test` contains a Jest test script that will check every implemented operation on a running CDL service.
- **You need access to a running instance of CDL in order to run this script.**
- Before running the script you must update the following variables in it:
  - `authInfo` - either `accessToken` or `subscriptionKey` based configuration.
  - `VALIDATOR_KEY_PATH` - Path to validator public certificate.
- Script can be used as a quick reference for using this connector plugin.
- Since script is not part of project jest suite, to run in execute the following commands from a package dir:
  - `npm run build`
  - `npx jest dist/lib/test/typescript/integration/cdl-connector-manual.test.js`

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there's always plenty to do!

Please review [CONTIRBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.
