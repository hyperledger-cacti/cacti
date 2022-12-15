# Modified Indy network docker image for IIN

This folder contains configurations for setting up a reference IIN implementation based on a modified version of [`indy-plenum`](https://github.com/hyperledger/indy-plenum).

The Interoperation Identity Network (IIN) is an essential component of the decentralized network-identity discovery and management infrastructure ([RFC: 01-011](../../../../rfcs/models/identity/network-identity-management.md)). Multiple IINs, along with trust anchors and IIN Agents provide the trust basis for identity interoperation ([RFC: 01-012](../../../../rfcs/models/identity/iin.md)).

An IIN contains a registry that is ideally decentralized, that supports registration of [DIDs](https://www.w3.org/TR/did-core/) to networks and their units, as well as resolution of network DID documents form their DID. The IIN registry also maintains other artifacts namely Verifiable Credential Schemas, Credential Definition, and
Revocation Registry.

The test IIN network configured in this folder uses a modified indy-plenum based Indy network which supports group controllers for DID Documents, implementing Security Domain DID ([https://github.com/ghoshbishakh/indy-plenum/tree/did_plugin](https://github.com/ghoshbishakh/indy-plenum/tree/did_plugin)). Security Domain DIDs support group control, so that the network members can jointly control the Security Domain DID Document ([RFC: 03-012](../../../../rfcs/formats/network/identity.md)). Such group control mechanism is not available in `hyperledger/indy-plenum` yet.

## Requirements

Docker-Compose: Version 1.29.2 or above

**May not be compatible with docker version >= 2** 

See https://github.com/docker/compose#about-update-and-backward-compatibility

## Starting a Test IIN network

The `docker` folder contains the test IIN docker image, along with scripts to start a test IIN network. 

```
cd docker
```


Build IIN docker image:
```
make image
```

Run sample IIN docker container running 4 Indy nodes:
```
make start
```

## Stopping a Test IIN network
```
make stop
```

Clean ledger data and generated artifacts.

```
make clean
```

## Configuring the Test IIN network

The Indy network is a public permissioned network where nodes having roles 'stewards' or 'trustees' can only perform transactions. The ledger can however be queried by any non-participating entity also.

You can configure how many nodes (stewards) run the Test IIN network through environment variables.

For running the Test IIN with 10 nodes and 10 clients:
```
INDYNODES=10 INDYCLIENTS=10 make start
```

Here, the first node uses the ports 9701 and 9702. The second node uses 9703 and 9704. And so on.

## Connecting to the network

Use the genesis block `indy_sandbox/pool_transactions_genesis` to connect to the network using `indy-sdk`.
