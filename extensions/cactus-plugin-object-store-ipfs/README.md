# `@hyperledger-cacti/cactus-plugin-object-store-ipfs`

## Overview

This plugin provides Cacti with an IPFS-backed implementation of the object
store plugin interface. It can:

- Insert objects in the IPFS network.
- Retrieve objects from the IPFS network.
- Check existence of an object in the IPFS network.

The plugin namespaces stored objects under a configured parent directory and
accepts either Kubo RPC client options or an initialized compatible client.

**Target Audience:**

- [x] Developers
- [x] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-plugin-object-store-ipfs
```

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

From the repository root, install dependencies and build the project:

```sh
yarn run configure
```

### Compiling

Compile the TypeScript project from the repository root:

```sh
yarn run tsc
```

## Architecture

The plugin implements `IPluginObjectStore` and uses `kubo-rpc-client` to
communicate with an IPFS node. The `parentDir` option provides a namespace for
all keys handled by a plugin instance. Web service endpoints delegate to the
same `get`, `has`, and `set` operations exposed by the plugin class.

## Configuration

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `instanceId` | Yes | None | Unique identifier for the plugin instance. |
| `parentDir` | Yes | None | IPFS directory used to namespace object keys. |
| `ipfsClientOrOptions` | Yes | None | Kubo RPC client options or a compatible initialized client. |
| `logLevel` | No | `"INFO"` | Plugin log level. |

## API Summary

### API Endpoints

The plugin defines OpenAPI endpoints for the three supported object-store
operations: `get`, `has`, and `set`. See the
[OpenAPI specification][package-doc-src-main-json-openapi-json] for request and response
schemas.

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

## Testing

From the repository root, run the tracked package tests with:

```sh
yarn test:jest:all extensions/cactus-plugin-object-store-ipfs/src/test/typescript
```

## Contributing

See [CONTRIBUTING.md][package-doc-contributing-md] for contribution requirements.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE][package-doc-license] file.

## Acknowledgments

[package-doc-src-main-json-openapi-json]: ./src/main/json/openapi.json
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
