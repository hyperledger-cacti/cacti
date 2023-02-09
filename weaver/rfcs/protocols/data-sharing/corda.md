<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Data Sharing Protocol Units in Corda Networks

- RFC: 02-003
- Authors: Sandeep Nishad, Venkatraman Ramakrishna, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 05-Jan-2023

## Summary

- This document specifies the Corda implementation of modules, and application adaptation guidelines, for the data sharing protocol.
- Within Weaver, the protocol units to request, share, and validte data will be implemented in the Interoperation CorDapp, which is the [interoperation module](../../models/infrastructure/interoperation-modules.md) for a Corda-based network.
- The protocol unit functions are meant to be called only by relay drivers with special RPC user credentials that are recognized by the Corda network at bootstrap.
- Within Weaver, the SDK will provide user agents (clients) the capability to trigger cross-ledger data sharing operations, fetching remote state using [view addresses](../../formats/views/addressing.md) and using the [proof-accompanied view data](../../formats/views/definition.md) in a local business workflow by invoking a Interoperation CorDapp workflow in the local network.

## Interoperation CorDapp

The following functions should be implemented in the Interoperation CorDapp as workflows:

- `HandleExternalRequest(val query: QueryOuterClass.Query) : FlowLogic<Either<Error, State.View>>()`: this FlowLogic takes the [Query](../../formats/views/request.md#query) structure as parameter. This structure contains both a [view address](../../formats/views/addressing.md) and a [verification policy](../../formats/policies/proof-verification.md). An [access control policy](../../formats/policies/access-control.md) corresponding to the view address should be looked up from the ledger and a check should be run against the requestor's identity (certificate) which is also embedded in the `Query` structure. If the check passes, an appropriate subflow should be invoked to call the appropriate flow (all details embedded in the `Query` structure). The result is directly embedded in an `InteropPayload` structure, if confidentiality is not desired (determined by a flag in the `Query` structure). Otherwise, the result is [encrypted using the public key in the requestor's certificate](../../models/security/confidentiality.md) and a serialized form of a `ConfidentialPayload` structure is embedded in an `InteropPayload` structure (to be implemented in future). The serialized form of this `InteropPayload` structure is then signed by the node. The serialized `InteropPayload` along with the signature is then packaged in the [Corda View](../../formats/views/corda.md) data structure. The serialized `Corda View` structure in `ByteArray` is then encapsulated in the [View](../../formats/views/definition.md) structure which is then returned from this function.
- `WriteExternalStateInitiator(val viewBase64String: String, val address: String, val viewContentsBase64: Array<String>): FlowLogic<Either<Error, UniqueIdentifier>>()`: this FlowLogic takes an serialized [View](../../formats/views/definition.md) structure in Base64 encoded string and the view address for the view. It must first validate the proof within the view, depending upon the `protocol` field in `meta` field of `view`. `viewContentsBase64`, an array of serialized `ViewContents` in Base64 encoded string, will be used if payload is encrypted to verify confidential payloads, which will contain decrypted payloads of each node (to be implemented in future). If the validation is successful, it creates a linear state called `ExternalState` corresponding to the `View` data structure. Then it creates a transaction to record this state in the vault. The `linearId` corresponding to the `ExternalState` is then returned which can be used by application to get the validated `ExternalState`.

## Corda Interoperation SDK

The Corda Weaver SDK should implement and offer the following function to serve the end-to-end purpose described in the [protocol's client API requirements](./generic.md#client-api-and-sdk). The given function signature is suggestive and in Kotlin syntax, but it can be modified or adapted as per need.

```kotlin
fun interopFlow (
    proxy: CordaRPCOps,
    localRelayEndpoint: String,
    externalStateAddress: String,
    networkName: String,
    confidential: Boolean = false,
    useTlsForRelay: Boolean = false,
    relayTlsTrustStorePath: String = "",
    relayTlsTrustStorePassword: String = "",
    tlsCACertPathsForRelay: String = ""
): Either<Error, String>
```

Some of the parameters are defined below:
- `proxy`: instance of `CordaRPCOps`, a connection to a Corda node using RPC credentials of the user who submitted the query, indicating which node to submit the remote data to.
- `localRelayEndpoint`: the local relay endpoint address of form `<HOSTNAME/IP>:<PORT>`.
- `externalStateAddress`: [View Address](../../formats/views/addressing.md) for the data sharing query.
- `confidential`: if this is set to `true`, the contents embedded within the returned views are expected to be encrypted using the public key embedded within the `keyCert` parameter (to be implemented in future).

This returns the `linearId` of the `ExternalState` if the complete protocol is successful, else return an error.