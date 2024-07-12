# `@hyperledger/cactus-plugin-ledger-connector-cdl`

This plugin provides `Cacti` a way to interact with Fujitsu CDL networks. Using this you can:

- Register new data trail.
- Get events.
- Search for events using header / global data fields as a query.

## Summary

- [`@hyperledger/cactus-plugin-ledger-connector-cdl`](#hyperledgercactus-plugin-ledger-connector-cdl)
  - [Summary](#summary)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
  - [Usage](#usage)
    - [Configuration](#configuration)
      - [Connector Setup](#connector-setup)
      - [Gateway Setup](#gateway-setup)
    - [Connector Methods](#connector-methods)
      - [Methods](#methods)
  - [ApiClient](#apiclient)
    - [REST Functions](#rest-functions)
  - [Running the tests](#running-the-tests)
    - [Manual Tests](#manual-tests)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:

```sh
npm run configure
```

## Usage

To use this plugin, import public-api, create new **PluginLedgerConnectorCDL** and initialize it.

```typescript
const connector = new PluginLedgerConnectorCDL({
  instanceId: uuidV4(),
  logLevel,
  cdlApiGateway: {
    url: cdlUrl,
  },
  cdlApiSubscriptionGateway: {
    url: cdlSubscriptionUrl,
  },
});

// Register endpoints
await connector.getOrCreateWebServices();
await connector.registerWebServices(expressApp);
```

### Configuration

#### Connector Setup

- `logLevel` - connector log level
- `cdlApiGateway` - configuration of regular CDL endpoint (use it if you want to use access token to authenticate)
- `cdlApiSubscriptionGateway` - configuration of CDL endpoint for applications (use it if you want to use subscriptionId to authenticate).

#### Gateway Setup

- `url`: Gateway URL
- `userAgent`: Value of User-Agent header sent to CDL (to identify this client).
- `skipCertCheck`: Set to true to ignore self-signed and other rejected certificates.
- `caPath`: CA of CDL API gateway server in PEM format to use.
- `serverName`: Overwrite server name from cdlApiGateway.url to match one specified in CA.

### Connector Methods

- Connector can be used directly through it's public methods.

#### Methods

```typescript
async registerHistoryData(args: RegisterHistoryDataRequestV1): Promise<RegisterHistoryDataV1Response>
async getLineage(args: GetLineageRequestV1): Promise<GetLineageResponseV1>
async searchLineageByHeader(args: SearchLineageRequestV1): Promise<SearchLineageResponseV1>
async searchLineageByGlobalData(args: SearchLineageRequestV1): Promise<SearchLineageResponseV1>
```

## ApiClient

All connector API endpoints are defined in [open-api specification](./src/main/json/openapi.json).
See [DefaultApi](./src/main/typescript/generated/openapi/typescript-axios/api.ts) for up-to-date listing of supported endpoints.

### REST Functions

- `registerHistoryDataV1`
- `getLineageV1`
- `searchLineageByHeaderV1`
- `searchLineageByGlobalDataV1`

## Running the tests

To check that all has been installed correctly and that the plugin has no errors run jest test suites.

- Run this command at the project's root:

```sh
npx jest cactus-plugin-ledger-connector-cdl
```

### Manual Tests

- There are no automatic tests for this plugin because there's no private instance of CDL available at a time.
- `./src/test/typescript/manual/cdl-connector-manual.test.ts` contains a Jest test script that will check every implemented operation on a running CDL service.
- **You need access to a running instance of CDL in order to run this script.**
  - You can check https://en-portal.research.global.fujitsu.com/ for free test access to a service.
  - Please note that rate limiting set on a service may cause some tests to fail.
- Before running the script you must update the following variables in it:
  - `authInfo` - either `accessToken` or `subscriptionKey` based configuration.
  - `cdlUrl / cdlSubscriptionUrl` - URL to CDL service (only base path)
- Script can be used as a quick reference for using this connector plugin.
- Since script is not part of project jest suite, to run in execute the following commands from a package dir:
  - `npx tsc`
  - `npx jest dist/lib/test/typescript/manual/cdl-connector-manual.test.js`

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments

```

```
