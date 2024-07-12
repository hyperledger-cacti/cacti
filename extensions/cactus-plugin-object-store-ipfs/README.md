# `@hyperledger/cactus-plugin-object-store-ipfs`

This plugin provides `Cactus` a way to interact with IPFS networks. Using this we can perform:
- Insert objects in the IPFS network.
- Retrieve objects from the IPFS network.
- Check existence of an object in the IPFS network.

## Summary

  - [Getting Started](#getting-started)
  - [Architecture](#architecture)
  - [Usage](#usage)
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

### Compiling

In the project root folder, run this command to compile the plugin and create the dist directory:
```sh
npm run tsc
```

## Architecture

>TODO
### API Endpoints
This plugin uses OpenAPI to generate the API paths. There are three endpoints defined for each operation supported (get, set, has).

## Usage

> **⚠️** When interacting with the API take in consideration that the values are expected to be in base64. Additionally, when retrieving data from the IPFS, it is necessary to decode from base64.

Firstly create an instance of the plugin.

```typescript
import { create } from "kubo-rpc-client";

const logLevel: LogLevelDesc = "TRACE";
const ipfsClientOrOptions = create();

const pluginIpfs = new PluginObjectStoreIpfs({
  parentDir: "/" + uuidv4(),
  logLevel: logLevel,
  instanceId: "",
  ipfsClientOrOptions: ipfsClientOrOptions,
});
```

You can make calls through the plugin to the IPFS API:

```typescript
async get(req: GetObjectRequestV1): Promise<GetObjectResponseV1>;
async has(req: HasObjectRequestV1): Promise<HasObjectResponseV1>;
async set(req: SetObjectRequestV1): Promise<SetObjectResponseV1>;
```

Call example to store an object:
```typescript
const dataBase64 = Buffer.from(data).toString("base64");

const response = await pluginIpfs.setObjectV1({
  key: uuidv4(),
  value: dataBase64,
});
```

Call example to get an object:
```typescript
const response = await pluginIpfs.getObjectV1({
  key: uuidv4(),
});

const originalData = Buffer.from(response.data.value, "base64").toString()
```

Call example to check existence of an object:
```typescript
const response = await pluginIpfs.hasObjectV1({
  key: uuidv4(),
});

const isPresent = response.data.isPresent;
const timestamp = response.data.checkedAt;
```

## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md "CONTRIBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.

## Acknowledgments
