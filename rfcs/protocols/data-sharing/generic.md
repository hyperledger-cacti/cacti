<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Data Sharing Protocol

- RFC: 02-001
- Authors: Antony Targett, Nick Waywood, Sandeep Nishad
- Status: Proposed
- Since: 30-May-2022

## Summary

A protocol (request-response protocol) to request and receive data between two network relays. This specification details how one relay can formulate a request for data from another network's relay.

## Motivation

Data sharing (i.e. querying data) across ledgers is one of the fundamental features of interoperability.

## Name and Version

Data Sharing v0.1
data_sharing_v0.1

## Key Concepts

-   [Discovery protocol](../discovery/readme.md) - Before a data sharing can occur between two networks, the requesting network needs to be aware of other networks. The discovery protocol is responsible for this.
-   [Addressing](../../formats/addressing.md) - Addressing is how a network can
    specify the data it wants from another network. The [view](../../models/views.md)
    is also closely related to this concept.
-   Proofs - When data is sent from one network to another, the network that is sending the data also needs to send an associated proof with the data. [Proof representation](../../models/cryptographic-proofs.md) is responsible for this.

## Roles

There are two roles in the `data-sharing` protocol: `requester` and `responder`. The requester asks the responder for some data, and the responder answers. Each role uses a single message type.

## States

This is a classic two-step request~response interaction, so it uses the predefined state machines for any `requester` and `responder`:

<img src="../../resources/images/data-sharing-states.png" height="550" width="700">

\*\* Should this state diagram include validation of messages?


## Relay Flow

<img src="../../resources/images/relay-flow.png" width=100%>

The end-to-end flow is explained in figure above. The steps numbers from figure are illustrated below:

1. Client prepares `NetworkQuery` and sends it to Destination Relay via `RequestState` (Client App) API.
  * **1.1:** Destination relay (inside Client’s `RequestState`) generates unique `request_id` for the query and stores the `RequestState` message with current status as `PENDING_ACK` in local database at key `request_id`.
  * **1.2:** Destination relay (inside Client’s `RequestState`) prepares `Query` and spawns a thread to send the Query to source relay via `RequestState` (Relay Service) API. When destination relay will receive `Ack` from source relay, it will update the status of `RequestState` as `PENDING` in database at key `request_id`
  * **1.2a:** Destination relay (inside Client’s `RequestState`) returns Ack to the client at the end of this API (happens asynchronously with step **1.2**).
  * **1.3:** Source relay (inside Relay’s `RequestState`) upon receiving the `Query`, stores it in remote database at key `request_id`.
  * **1.4:** Source relay (inside Relay’s `RequestState`) then spawns a thread to send `Query` to the intended driver based on Query via `RequestDriverState` API exposed by the driver.
  * **1.4a:** Source relay (inside Relay’s `RequestState`) returns `Ack` back to the destination relay (happens asynchronously with step **1.4**).
  * **1.5:** Driver (inside `RequestDriverState`) based on `Query`, asynchronously spawns a thread that submits transaction to DLT network using [interoperation module](./interoperation-modules.md). The response payload from `interoperation module` is received by the driver, then it creates a `View` payload based on DLT platform (e.g. [Fabric View](../../formats/views/fabric.md), [Corda View](../../formats/views/corda.md) or [Besu View](../../formats/views/besu.md) ), and then encapsulate it to DLT-neutral [View](../../formats/views/definition.md) along with meta-data. 
  * **1.5a:** Driver returns `Ack` back to the source relay (happens asynchronously with step **1.5**).
  * **1.6:** Driver (inside `RequestDriverState`) and then prepares and sends the `ViewPayload` to the source relay via `SendDriverState` API.
  * **1.7:** Source relay (inside `SendDriverState`) then fetches the `Query` from remote database using `request_id` from `ViewPayload`.
  * **1.8:** Source relay (inside `SendDriverState`) spawns a thread to send the `ViewPayload` back to the destination relay via `SendState` API.
  * **1.8a:** Source relay (inside `SendDriverState`) returns `Ack` back to the driver (happens asynchronously with step **1.8**).
  * **1.9:** Destination relay (inside `SendState`) stores the `RequestState` message with updated `state` (storing view) and `status` as `COMPLETED`, in the local database at key `request_id`.
  * **1.10:** Destination relay (inside `SendState`) returns `Ack` back to the source relay.
2. Client polls for response from Destination Relay via `GetState` API, passing `GetStateMessage` containing `request_id`.
  * **2.1:** Destination relay fetches the `RequestState` message stored in local database at key `request_id`.
  * **2.2:** Destination relay returns the `RequestState` obtained in step **2.1** to the client.

## Messages

### `query` message type

A `data-sharing/query` message constructed by the requesting relay looks like this:

```protobuf
message Query {
  repeated string policy = 1;
  string address = 2;
  string requesting_relay = 3;
  string requesting_network = 4;
  string certificate = 5;
  string requestor_signature = 6;
  string nonce = 7;
  string request_id = 8;
  string requesting_org = 9;
}
```

-   `policy` The policy array outlines which orgs need to sign the payload.
-   `address` uniquely identifies the resource that the requesting network is
    querying. See [address concept](../../formats/addressing.md) for more details.
-   `requesting_relay` is the identity of the requesting relay
-   `requesting_network` is the identity of the requesting network
-   `certificate` is a valid identity certificate of the requesting entity. This
    is used by the responding network to authenticate the requestor.
-   `requestor_signature` is the signature of the requestor used by the responding
    network to verify that the request came from a party they trust. The signature
    is signed on the view address segment of the `address` field (refer to
    [addressing](../../formats/addressing.md)) concatenated with the `nonce` field. The
    signature is provided as a Base64-encoded string.
-   `nonce` is a unique number that is created on a per-request basis. It ensures
    that if a request is intercepted by a malicious party, the request cannot be
    reused in a replay attack.
-   `request_id` is the identifier given to the request to enable the requesting
    network and relays to track the request.
-   `requesting_org` is the org from the requesting network that initiated the request.

### Response message type

A `data-sharing/ViewPayload` messaged is returned to the requester and looks like this:

```protobuf
message ViewPayload {
  string request_id = 1;
  oneof state {
    View view = 2;
    string error = 3;
  };
}

message View {
  Meta meta = 1;
  bytes data = 2;
}

message Meta {
    enum Protocol {
        BITCOIN = 0;
        ETHEREUM = 1;
        FABRIC = 3;
        CORDA = 4;
    }
    Protocol protocol = 1;
    string timestamp = 2;
    string proof_type = 3;
    string serialization_format = 4;
}
```

`ViewPayload`

-   `request_id` the identifier of the original request.
-   `state` either contains a `view` if the request was succesful, or else
    `error`.
-   `view` contains the metadata and data associated with the requested view.
-   `error` contains a message about the cause of the error

`View`

-   `meta` contains metadata of the view.
-   `data` contains the requested data, including ledger data and the proof.

`Meta`

-   `protocol` specifies the network protocol of the responder network.
-   `timestamp` the timestamp of the response.
-   `proof_type` describes the type of proof, e.g. Notarization, SPV, ZKP, etc.
    Possibly will be an enum. See [proof
    representation](../../models/cryptographic-proofs.md) for more details.
-   `serialization_format` the data field's serialization format (e.g. JSON, XML, Protobuf).

## Example messages

### Sending a request

### Receiving a response
