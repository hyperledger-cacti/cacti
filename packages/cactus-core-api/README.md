# @hyperledger/cactus-core-api

This package is meant to be depended on by most of the other packages for interface
definitions, abstract classes and generated code. All of which is to be kept with
as few dependencies as possible in order to reduce the potential for circular
dependencies.

From the above it also comes that the `core-api` package is rarely used by developers who are implementing projects with Hyperledger Cactus and instead it is mostly consumed by the framework's other packages internally (e.g. the Hyperledger Cactus contributors).

# Usage

## Installation

You can install the package via your favorite package manager.

Yarn: 

    yarn add --exact @hyperledger/cactus-core-api

npm: 

    npm install --save-exact=true @hyperledger/cactus-core-api

> We highly recommend using exact versions in general when managing your dependencies
> in order to achieve (or get closer to) [reproducible builds](https://reproducible-builds.org/) and to enhance your
> security posture against malicious package versions that might get pushed to the
> registries without the knowledge or consent or well intentioned maintainers.

## Import

```typescript
import {
  GetKeychainEntryRequestV1,
  isICactusPlugin,
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
```

## Check If POJO is a Cactus Plugin

```typescript
if (!isICactusPlugin(plugin)) {
    throw new Error(`PluginRegistry#add() plugin not an ICactusPlugin`);
}
```

# Development

## Weaver Protocol Buffers

To test the Rust build, you need to run either one of the following:

`yarn lerna run proto:protoc-gen-rust` (from the project root)

or a regular cargo build from the core-api package directory, e.g.:

```sh
cd packages/cactus-core-api/
cargo build
```

If you prefer to use `make` that also works from the package directory:

```sh
cd packages/cactus-core-api/
make
```

The protocol buffer to Rust compilation is not yet part of the project build by
default because we need some time to include the Rust toolchain in the project-wide
list of build dependencies for developers.