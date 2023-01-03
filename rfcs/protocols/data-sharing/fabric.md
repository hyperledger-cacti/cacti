<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Data Sharing Protocol Units in Fabric Networks

- RFC: 02-002
- Authors: Venkatraman Ramakrishna, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 02-Jan-2023

## Summary

- This document specifies the Hyperledger Fabric implementation of modules, and application adaptation guidelines, for the data sharing protocol.
- Within Weaver, the protocol units to request, share, and validte data will be implemented in the Fabric Interoperation Chaincode, which is the [interoperation module](../../models/infrastructure/interoperation-modules.md) for a Fabric-based network.
- The protocol unit functions are meant to be called only by relay drivers with special wallet identities that are recognized by the Fabric Interoperation Chaincode at bootstrap.
- Within Weaver, the SDK will provide user agents (clients) the capability to trigger cross-ledger data sharing operations, fetching remote state using [view addresses](../../formats/views/addressing.md) and using the [proof-accompanied view data](../../formats/views/definition.md) in a local business workflow by invoking a chaincode in the local network.

## Fabric Interoperation Chaincode

The following functions should be implemented in the Fabric Interoperation Chaincode and exposed through the transaction API.

(Only designated relay drivers ought to be able to invoke these transactions, so appropriate security guards must be implemented within the chaincode. As a default, we recommend that the calling client's wallet identity certificate be parsed and checked to find if a special `relay` attribute exists within.)

- `func (s *SmartContract) HandleExternalRequest(ctx contractapi.TransactionContextInterface, b64QueryBytes string) (string, error)`: this function takes a Base64-encoded serialized form of the [Query](../../formats/views/request.md#query) structure as parameter. This structure contains both a [view address](../../formats/views/addressing.md) and a [verification policy](../../formats/policies/proof-verification.md). An [access control policy](../../formats/policies/access-control.md) corresponding to the view address should be looked up from the ledger and a check should be run against the requestor's identity (certificate) which is also embedded in the `Query` structure. If the check passes, an appropriate transaction should be invoked on an appropriate channel and chaincode (all details embedded in the `Query` structure). The result is directly embedded in an `InteropPayload` structure if confidentiality is not desired (determined either by (i) the Interop Chaincode's own bootstrapped state, or (ii) a flag in the `Query` structure). Otherwise, the result is [encrypted using the public key in the requestor's certificate](../../models/security/confidentiality.md) and a serialized form of a `ConfidentialPayload` structure is embedded in an `InteropPayload` structure. The serialized form of this `InteropPayload` structure must be returned by the function.
- `func (s *SmartContract) WriteExternalState(ctx contractapi.TransactionContextInterface, applicationID string, applicationChannel string, applicationFunction string, applicationArgs []string, argIndicesForSubstitution []int, addresses []string, b64ViewProtos []string, b64ViewContents [][]string) error`: this function takes an application chaincode transaction specification (channel, chaincode, function, and parameters) and a set of views, with optionally decrypted contents, to substitute particular parameters in that chaincode function call. It must first validate the proof within each view in the parameter list. If the validation is successful, the application chaincode function is called with the state information embedded within those views as parameters. Upon success, this function should return a blank, otherwise it should return an error message.

## Fabric Interoperation SDK

The Weaver SDK should implement and offer the following function to serve the end-to-end purpose described in the [protocol's client API requirements](./generic.md#client-api-and-sdk). The given function signature is suggestive and in TypeScript syntax, but it can be modified or adapted as per need.

```protobuf
const interopFlow = async (
    interopContract: Contract,
    networkID: string,
    invokeObject: InvocationSpec,
    org: string,
    localRelayEndpoint: string,
    interopArgIndices: Array<number>,
    interopJSONs: Array<InteropJSON>,
    keyCert: { key: ICryptoKey; cert: any },
    endorsingOrgs: Array<string> = [],
    returnWithoutLocalInvocation: boolean = false,
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
    confidential: boolean = false,
    gateway: Gateway = null,
): Promise<{ views: Array<any>; result: any }>
```

Some of the parameters are defined below:
- `interopJSONs`: an array of structures from which view addresses can be created. This is an array because a single local chaincode transaction might rely on multiple data items sourced from multiple foreign ledgers.
- `invokeObject`: this contains the specification (channel, chaincode, function, and parameters) of the local chaincode transaction that must be performed after views have been fetched.
- `keyCert`: this contains a `<certificate, private key>` pair corresponding to the client's wallet identity. This may optionally be left blank; if so, a default wallet identity will be looked up within the function.
- `returnWithoutLocalInvocation`: if this is set to `true`, the function terminates after views are fetched; a local chaincode transaction is not invoked in this case.
- `confidential`: if this is set to `true`, the contents embedded within the returned views are expected to be encrypted using the public key embedded within the `keyCert` parameter.
