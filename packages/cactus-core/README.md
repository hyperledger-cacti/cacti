# `@hyperledger/cactus-core`

This module is responsible for providing the backbone for the rest of the packages
when it comes to the features of Cactus.

The main difference between this and the `cactus-common` package is that this one
does not guarantee it's features to work in the browser.

The main difference from the `cactus-core-api` package is that this is meant to
contain actual implementations while `cactus-core-api` is meant to be strictly
about defining interfaces. Based on that latter constraint we may move the
`PluginRegistry` out of that package and into this one in the near future.

## Usage

```
// TODO: DEMONSTRATE API
```
