<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Corda Views

- RFC: 03-004
- Authors: Allison Irvin, Nick Waywood
- Status: Proposed
- Since: 13-Aug-2020

## Addressing a Corda View

Unlike most distributed ledgers, Corda does not use a broadcast model but
instead shares transactions and state only with parties that need to know. This
peer-to-peer model means that addressing state in a Corda ledger needs to be
more fine-grained than in other DLTs. Instead of addressing a channel (as in
Fabric), the party or parties that are participants of the state need to be
specified. The participants also need a way of deterministically finding the
requested state. This can be done by using Corda's vault query API.

### Identifying the participant list

Requirements are:

-   The destination network knows the required endorsers of the state by the
    identities included in their certificates.
-   All the participants who are listed on the state need to return a state proof.
-   The relay driver needs to know the RPC address of the node(s) to forward the request on to.

There are several potential approaches for doing this.

1. a) The requesting network lists the RPC addresses of the nodes in the view
   address and the relay driver uses these addresses to directly query the
   nodes. Endorsement policy in the request is optional. The relay driver sends
   the request out to all nodes individually and collates the responses. This
   approach is unlikely to be used in practise because the destination network
   should not need to know the RPC address of the Corda nodes.

    b) The requesting network lists all the identities of the nodes in the
    address and the relay driver uses a local database or config to lookup the
    RPC address of the nodes. Endorsement policy in the request is optional. The
    relay driver sends the request out to all nodes individually and collates the
    responses. If the list of participants for a view is long, this approach may
    not be ideal as the address field may grow quite large.

    c) The requesting network includes an alias for a group of nodes in the
    address and the relay driver uses a local database or config to lookup the
    RPC address of the nodes corresponding to that alias. Endorsement policy in
    the request is optional. This approach may be better suited for scenarios
    when the list of participants for a view is long.

2. The requesting network lists the identities of the nodes in the endorsement
   policy and the relay driver uses a local database or config to lookup the RPC
   address of the nodes. The relay driver sends the request out to all nodes
   individually and collates the responses.

3. The requesting network lists one of the node identities in the address and
   the relay driver uses a local database or config to lookup the RPC address of
   the node. Endorsement policy is optional. The relay driver sends the request
   out to just that node and the node looks up the state and forwards the
   request on to all other participants and collates the responses before
   sending back to the relay driver.

We propose that approach 1a is supported by the interoperation protocol in the
initial implementation.

### Locating the view.

Corda provides an API for querying state from the vault - the Vault Query API.
The Vault Query API can be used directly by flows, and therefore CorDapps can
define flows that perform a particular vault query. Corda applications can
provide a flow name and set of required parameters (either as a template or
with known values) as an address for a view. This approach has the benefit of
providing a mechanism for not only addressing a single state as a view, but also
collections of states, or even computing derived state.

The first point of contact with the Corda network from the relay driver is the
interoperation CorDapp that is installed on all nodes that wish to interoperate
with external networks. The relay driver forwards the request from the external
network to the interoperation CorDapp which first checks that the requesting
party has the required access control permission for the view address based on
flow name. It then attempts to call the corresponding flow that must also be
installed on the node. The node will run the query and return the view to the
initiating flow. Additional access control checks may need to be performed at
this point (for example, if access control was defined on a per-state level).
The initiating flow will then coordinate the signing of the response and
assembly of the view proof to be sent back to the relay driver.

If the approach taken in the addressing of nodes required to endorse the view
was for the requesting network to specify complete list, the interoperation
CorDapp will return the view and proof to the relay driver. The relay driver
will assemble responses from all nodes and return the set of responses back to
the requesting relay.

If the approach for addressing required endorsing nodes was for just one
participating node to be specified, the interoperation CorDapp must determine
the list of required endorsers from the response returned from the application
CorDapp flow. For example, if a single state was returned, the interoperation
CorDapp will create a flow session for each participant listed in the state and
trigger the interoperation CorDapp flow in these nodes. The interoperation flow
in each node will perform the same steps as listed above (access control checks
for the flow, calling the application CorDapp flow, performing additional access
control checks on the returned view, assembling the view proof) and return the
view and proof response. The initiating interoperation flow will assemble the
responses from each node and return the set back to the relay driver.

Part of view proof verification by the requesting network requires checking that
all views between endorsing nodes are consistent. This means that the view
returned from each node must be identical and deterministic. When a view is a
single state this is relatively trivial as all nodes should have the same
internal view of the state. However, careful consideration needs to be given when
querying aggregate or derived state. For example, if an external network wishes
to receive proof of total value of a set of assets held by a group of nodes, the
query must be addressed in such a way that all nodes will compute the result on
exactly the same set of assets.

## Corda View Address

Given the above considerations, the proposed structure of the Corda view address
is as follows:

```
operator = party1-rpc-address , [ ";" , { party2-rpc-address } ] , "#" , flow-name , [ ":" , { flow-arg1 } , [ ":" , { flow-arg2 } ]]
operator = party1-alias , [ ";" , { party2-alias } ] , "#" , flow-name , [ ":" , { flow-arg1 } , [ ":" , { flow-arg2 } ]]
operator = set-of-parties-alias , "#" , flow-name , [ ":" , { flow-arg1 } , [ ":" , { flow-arg2 } ]]
```

Examples

-   `localhost:10006;localhost:10008#QueryStateByKey:myKeyName`
-   `AliceNode;BobNode#QueryStateByKey:myKeyName`
-   `AliceBobConsortium#QueryStateByKey:myKeyName`

Where the relay driver holds a mapping of `AliceNode` and `BobNode` to
`localhost:10006` and `localhost:10007`, respectively. The relay driver also
knows how to map `AliceBobConsortium` to the RPC addresses of `AliceNode` and
`BobNode`.

## Discovery of View Addresses

Sharing a view address is a process done outside the interoperability protocol.
It is expected that either a fully qualified address is given to the requesting
network, e.g.

```
`AliceNode;BobNode#QueryStateByLinearId:b0b3e588-2569-403d-9209-abcb7a53814b`
```

Alternatively, the source network can provide a template and the destination
network can fill in the parameters from their own data. For example, the
provided template may be:

```
AliceNode;BobNode#QueryBillOfLadingByPurchaseOrderNumber:<purchase-order-number>
```

Then, the destination network would use data it holds to make the request:

```
AliceNode;BobNode#QueryBillOfLadingByPurchaseOrderNumber:PO12345678
```

## View Data Definition

The `view` returned from a Corda network in response to a request from an
external network is represented as metadata and data, as described in the [view
definition](/models/views.md#view-definition).

For the initial implementation of the interoperability CorDapp, the default proof
returned by the Corda network will be notarization, and the default
serialization format will be protobuf. The `data` field of the view will be a byte array of the following binary protobuf data:

```protobuf
message ViewData {
  message Notarization {
    string signature = 1;
    string certificate = 2;
    string id = 3;
  }
  repeated Notarization notarizations = 1;
  bytes payload = 2;
}
```

The `payload` field will have the following structure:

```protobuf
message InteropPayload {
  // The result returned from the corda flow
  bytes payload = 1;
  // The full address string (i.e. address  = location-segment , "/", ledger-segment "/" , view-segment)
  string address = 2;
}
```

-   `InteropPayload.payload` is the result that is returned from the application CorDapp flow that
    is queried. The data in this field is flexible, and can be anything from a
    single state, to an array of states or an arbitrary data type that is
    calculated from computing derived state. The external network application that
    receives the view will need to know how to parse this field and agreement on
    format of the field needs to be agreed out-of-band.
-   `Notarization.signature` is the signature of the node providing the view and proof. The
    signature is signed on the result encoded as a Base64 bytearray of the JSON
    stringified `data`. The signature is provided as a Base64 encoded string.
-   `Notarization.certificate` is the X509 certificate of the node that contains the public key
    corresponding to the private key that was used to sign the response. This is
    used by the requesting network to verify the signature and authenticate the
    identity of the signer based on the network's topology map. The certificate is
    provided in PEM format as a Base64 encoded string.
-   `Notarization.id` is the identity of the organisation that owns the node that did the signing
-   `notarizations` is the list of all of the signatures and certificates from all
    nodes that were required to endorse the request, as well as the id of the node that did the signing.

### Examples

`ViewData`

```
notarizations: [{
    signature: QbKxQqKlsLJH8MC6eOFhQ/ELful7lbkVrQTwm4Xmfg5xJXeNz8xtqv8any6H4jyXXskyFxYWLISosAfcUdd0BA==,
    certificate: MIIBwjCCAVgAwIBAgIIUJkQvmKm35YwFAYIKoZIzj0EAwIGCCqGSM49AwEHMC8xCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAeFw0yMDA3MjQwMDAwMDBaFw0yNzA1MjAwMDAwMDBaMC8xCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAqMAUGAytlcAMhAMMKaREKhcTgSBMMzK81oPUSPoVmG/fJMLXq/ujSmse9o4GJMIGGMB0GA1UdDgQWBBRMXtDsKFZzULdQ3c2DCUEx3T1CUDAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIChDATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBR4hwLuLgfIZMEWzG4n3AxwfgPbezARBgorBgEEAYOKYgEBBAMCAQYwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cAMEQCIC7J46SxDDz3LjDNrEPjjwP2prgMEMh7r/gJpouQHBk+AiA+KzXD0d5miI86D2mYK4C3tRli3X3VgnCe8COqfYyuQg==
  }]
payload: <binary of interop payload>
```
