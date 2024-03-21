# `@hyperledger/cactus-plugin-bungee-hermes`

The package provides `Hyperledger Cacti` a way to create blockchain snapshots and views for different distributed ledgers currently supported by Cacti. The implementation follows the paper [BUNGEE](https://dl.acm.org/doi/pdf/10.1145/3643689) (Blockchain UNifier view GEnErator).

The plugin will allow, as suggested in the paper, "new applications built on top
of dependable blockchain interoperability, such as stakeholder-centric snapshots for audits, cross-chain analysis, blockchain
migration, and combined on-chain-off-chain analytics".

## Summary

- [`@hyperledger/cactus-plugin-bungee-hermes`](#hyperledgercactus-plugin-bungee-hermes)
  - [Summary](#summary)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
  - [Architecture](#architecture)
    - [BUNGEE - Hermes API](#bungee---hermes-api)
  - [Running the tests](#running-the-tests)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)


## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:
```sh
npm run configure
```

Know how to use the following plugins of the project:

  - [cactus-plugin-ledger-connector-fabric](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-fabric)
  - [cactus-plugin-ledger-connector-besu](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-besu)


## Architecture

The plugin interacts with a cactus ledger connector, using strategies with custom logic for each different network.

Note that, so far, only strategies for Fabric and Besu networks were implemented. Smart-contracts in Fabric and Besu must implement the interface provided in the files ITraceableContract.ts and ITraceableContract.sol, in the test directory 

The plugin stands _behind_ a cacti-ledger-connector, which is used to fetch information from the ledger to create the snapshot.
```typescript
.......................................
.            Cacti Node               .
.                                     .
.                                     .
. ..........            ............. .          .........
. .        .            .   Cacti   . .          .       .
. . BUNGEE . ---------- . Connector . -----------. _DLT  . 
. .        .            ............. .          .       .
. ..........                          .          .........  
.                                     .
.                                     .
.                                     .
.......................................
```
The plugin can then serve multiple purposes, and thus serve also other plugins or apps in more complex deployment architectures (where we link bungee to other components).

### BUNGEE - Hermes API

This plugin uses OpenAPI to generate the API paths.
Endpoints exposed:

  - CreateViewV1
  - GetPublicKey
  - GetAvailableStrategies


## Running the tests
  - **besu-test-basic.test.ts**: A test using strategy-besu and a besu connector, testing creating views for different timeframes and states.
  - **fabric-test-basic.test.ts**: A test using strategy-fabric and a fabric connector, testing creating views for different timeframes and states.
  - **besu-test-pruning.test.ts**: A test using strategy-besu and a besu connector, testing creating views for specific timeframes.
  - **fabric-test-pruning.test.ts**: A test using strategy-fabric and a fabric connector, testing creating views for specific timeframes.
  - **bungee-api-test.test.ts**: A more complex test, using both besu and fabric strategies, fabric and besu connectors, and calls to bungee-hermes API. Tests bungee's API and functionality with multiple strategies. 

Tests developed using JEST testing framework.

## Usage
Lets imagine we want bungee-hermes to create views for a besu ledger.
Let us consider a besu ledger connector, exposing its API on URL: http://localhost:4000


Then we instantiate the plugin as follows:
```typescript
const pluginBungeeHermesOptions = {
    keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
    instanceId: uuidv4(),
    logLevel,
};
const bungee = new PluginBungeeHermes(pluginBungeeHermesOptions);
```

We add the desired strategies:

```typescript
bungee.addStrategy('BESU_STRATEGY', new StrategyBesu("INFO"));
```

Save network details for our target ledger:

```typescript
const besuNetworkDetails: BesuNetworkDetails = {
    signingCredential: besuSigningCredential,
    contractName: besuContractName,
    connectorApiPath: 'http://localhost:4000',
    keychainId: besuKeychainPlugin.getKeychainId(),
    contractAddress: besuContractAddress,
    participant: accountAddress,
  };
```

And we can request views, after exposing the api:
```typescript
const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  bungeeServer = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 3000,
    server: bungeeServer,
  };
const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
const { address, port } = addressInfo;

await bungee.getOrCreateWebServices();
await bungee.registerWebServices(expressApp);
const bungeePath = `http://${address}:${port}`;

const config = new Configuration({ basePath: bungeePath });
const bungeeApi = new BungeeApi(config);

const viewBesu = await bungeeApi.createViewV1({
    strategyId: 'BESU_STRATEGY',
    networkDetails: besuNetworkDetails,
    tI: undefined,          //default to 0 (UNIX timestamp seconds)
    tF: undefined,          //default to Number.MAX_SAFE_INTEGER.toString() (UNIX timestamp seconds)
    stateIds: undefined,    //default to capture all assets
    viewID: undefined,      //plugin generates the id, if not given
  } as CreateViewRequest);
```

Note that each strategy can be used to query different ledgers (ledgers of the same type, but on different locations), and BUNGEE also supports adding multiple strategies to each bungee-hermes-plugin instance.
Each strategy implements the logic to query information from each different ledger (i.e. capture set of asset states), while bungee-hermes plugin handles the snapshot and view creation.



## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md "CONTIRBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.