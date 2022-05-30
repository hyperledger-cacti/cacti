<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relay Messages

- RFC: 03-015
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Sandeep Nishad, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 30-May-2022

## Summary


## NetworkQuery

This message is created by client application to encapsulate the query for the relay.
Whenever a client application needs to query a foreign network for a [ledger state view](../../models/ledger/views.md), it must wrap the query comprising of a [view address](../views/addressing.md), a [verification policy](../policies/proofs-verification), and other metadata, into a DLT-neutral structure as follows for the [relays](../../models/infrastructure/relay.md) that will accept and route the request.

```protobuf
message NetworkQuery {
  repeated string policy = 1;
  string address = 2;
  string requesting_relay = 3;
  string requesting_network = 4;
  string certificate = 5;
  string requestor_signature = 6;
  string nonce = 7;
  string requesting_org = 8;
}
```

* `policy`: specifies the [verification policy](../policies/proofs-verification) to be used for this query.
* `address`: stores the view address. More on addressing [here](../views/addressing).
* `requesting_relay`: id for the local relay (Optional, by default is filled by the relay to which this message is sent). 
* `requesting_network`: id for the local network to which this client application belongs.
* `certificate`: X509 Certificate in PEM format of the requesting client (to authenticate membership of the client to the requesting network, and also used for access control).
* `requestor_signature`: Digital signature over concatenation of `address` and `nonce` by client, to ensure that the query has not been tampered with.
* `nonce`: used to avoid replay attacks by entities masquerading as an application.
* `requesting_org`: Organization id to which this client application belongs.

**Example:**

```
NetworkQuery { 
  policy: ["CarrierMSP", "SellerMSP"], 
  address: "bc-interop-wtln-test.sl.cloud9.ibm.com:9089/wtln/wtln-channel:wtlncc:GetBillOfLadingByPurchaseOrder:PO59133361", 
  requesting_relay: "", 
  requesting_network: "americantfn", 
  certificate: "-----BEGIN CERTIFICATE-----\nMIIB2zCCAXegAwIBAgIQfrI6AbTtEhuJa9XzLy1L/TAUBggqhkjOPQQDAgYIKoZI\nzj0DAQcwNzELMAkGA1UEBhMCR0IxDzANBgNVBAcMBkxvbmRvbjEXMBUGA1UECgwO\nU2VsbGVyQmFua05vZGUwHhcNMjIwMzIyMDAwMDAwWhcNMjcwNTIwMDAwMDAwWjA3\nMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMRcwFQYDVQQKDA5TZWxsZXJC\nYW5rTm9kZTAqMAUGAytlcAMhAMkMVTNq8lr1I4o4ivrPUNLoeV2Ab4U9PsReYo+w\n6nEio4GJMIGGMB0GA1UdDgQWBBQaqL67Z4elSpuWHjc0wfShLEBPdDAPBgNVHRMB\nAf8EBTADAQH/MAsGA1UdDwQEAwIChDATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNV\nHSMEGDAWgBSUmpz6AYRj0sgN5TPBwA1CSs34ZDARBgorBgEEAYOKYgEBBAMCAQYw\nFAYIKoZIzj0EAwIGCCqGSM49AwEHA0gAMEUCIQCnEpDO8MNL5vL5Uiig0+9iQHX4\nBLPJZXw591f3bB8xlQIgC5ieNFiV126RvjAmuq3R6bkl//3vECCcEOzDvK424y8=\n-----END CERTIFICATE-----", 
  requestor_signature: "c+5UYaA4bZB7AI4msFdo0DTZFMnEskhlPWhB8/2IFSzwJmOopz980kxcuC/KjF3T8GQyjgMNqadaLEnKtZm3Aw==",
  nonce: "f34bc09f-8ae1-439f-ab34-5414a289e1dd", 
  requesting_org: "SellerBankNode" }
```

## GetStateMessage

This payload is used by the client application to poll for the query response from the relay. It is the argument for [GetState](../../models/infrastructure/relays.md#api-for-application-client) API of the relay.

```protobuf
message GetStateMessage {
  string request_id = 1;
}
```

The `request_id` field should be the same id returned by the relay as part of [ACK](../views/request.md#ack) on the successful execution of [RequestState](../../models/infrastructure/relays.md#api-for-application-client) API. 

## GRPC Service APIs

```protobuf
// definitions of all messages used in the datatransfer protocol
service DataTransfer {
  // the requesting relay sends a RequestState request to the remote relay with a
  // query defining the data it wants to receive
  rpc RequestState(common.query.Query) returns (common.ack.Ack) {}
  // the remote relay asynchronously sends back the requested data with
  // SendState
  rpc SendState(common.state.ViewPayload) returns (common.ack.Ack) {}
  // Handling state sent from the driver.
  rpc SendDriverState(common.state.ViewPayload) returns (common.ack.Ack){}
}
```

`RequestState` and `SendState` APIs are explained in more details [here](../../models/infrastructure/relays.md#api-for-other-relays), while `SendDriverState` API is explained [here](../../models/infrastructure/relays.md#api-for-driver).
