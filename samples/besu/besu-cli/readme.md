# besu-cli CLI

A CLI for besu-cli.

## Asset exchange between two Besu networks
Here are the steps to exercise asset exchange using the besu-cli tool.

1) Start two Besu test networks following the steps in https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/main/tests/network-setups/besu.
2) Install the interop and token contracts by following the steps in https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/main/samples/besu/simpleasset. This will install the interop contract for exchanging ERC20 tokens in both the networks and the sample token contracts, `AliceERC20` and `BobERC20`, in `network1` and `network2` respectively.
3) If a `config.json` doesn't exist, create one by making a copy of `config.template.json`. In that file, set the `interopContract` and `tokenContract` fields for the two networks. The fields will correspond to the relative path of the truffle compiled json files for these contracts with respect to the root folder of besu-cli.
4) When running the exchange command, also set the `senderAccountIndex` and the `recipientAccountIndex` for the two networks.

## Customizing your CLI

Check out the documentation at https://github.com/infinitered/gluegun/tree/master/docs.

## Publishing to NPM

To package your CLI up for NPM, do this:

```shell
$ npm login
$ npm whoami
$ npm lint
$ npm test
(if typescript, run `npm run build` here)
$ npm publish
```

# Commands
- asset init
- asset get-balance
- asset lock
- asset claim
- asset unlock
- asset is-locked
- asset exchange


# License

MIT - see LICENSE

