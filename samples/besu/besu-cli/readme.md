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
Here are the list of commands supported by the besu-cli. We also provide a sample for each command.
- asset issue: Issuance of tokens
```
besu-cli asset issue --network=network1 --account=1 --amount=10
```
- asset get-balance: Get account balance of tokens
```
besu-cli asset get-balance --network=network1 --account=1
```
- asset lock: Lock assets (fungible assets for now)
```
besu-cli asset lock --network=network1 --sender_account=1 --recipient_account=2 --amount=5 --timeout=1000
```
A random preimage and its corresponding hash will be generated and the preimage will be output, along with the lockContractID, to be used during Claim.
- asset claim: Claim assets (fungible assets for now)
```
besu-cli asset claim --network=network1 --lock_contract_id=lockContractID --recipient_account=2 --preimage=preimage
```
- asset unlock: Unlock and reclaim assets after timeout (fungible assets for now)
```
besu-cli asset unlock --network=network1 --lock_contract_id=lockContractID --sender_account=1
```
- asset is-locked: Check if a contract exists, which also checks if an asset is locked
```
besu-cli asset is-locked --network=network1 --lock_contract_id=lockContractID
```
- asset exchange: A complete cross-network exchange of assets (fungible assets for now)
besu-cli asset exchange --network1=network1 --network2=network2 --amount=5 --timeout=20

# License

MIT - see LICENSE

