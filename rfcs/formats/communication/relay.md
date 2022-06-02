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
Whenever a client application needs to query a foreign network for a [ledger state view](../../models/ledger/views.md), it must wrap the query comprising of a [view address](../views/addressing.md), a [verification policy](../policies/proof-verification.md), and other metadata, into a DLT-neutral structure as follows for the [relays](../../models/infrastructure/relay.md) that will accept and route the request.

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
  bool confidential = 9;
}
```

* `policy`: specifies the [verification policy](../policies/proof-verification.md) to be used for this query.
* `address`: stores the view address. More on addressing [here](../views/addressing.md).
* `requesting_relay`: id for the local relay (Optional, by default is filled by the relay to which this message is sent). 
* `requesting_network`: id for the local network to which this client application belongs.
* `certificate`: X509 Certificate in PEM format of the requesting client (to authenticate membership of the client to the requesting network, and also used for access control).
* `requestor_signature`: Digital signature over concatenation of `address` and `nonce` by client, to ensure that the query has not been tampered with.
* `nonce`: used to avoid replay attacks by entities masquerading as an application.
* `requesting_org`: Organization id to which this client application belongs.
* `confidential`: indicating whether to enable [confidentiality](../../models/security/confidentiality.md) i.e. encrypt the payload using the above certificate.

**Examples:**

Testnet Demo (Corda):
```
NetworkQuery {
  policy: ["PartyA"],
  address: "localhost:9082/Corda_Network2/localhost:30006#com.cordaSimpleApplication.flow.GetStateByKey:H",
  requesting_relay: "",
  requesting_network: "Corda_Network",
  certificate: "-----BEGIN CERTIFICATE-----\nMIIByzCCAWegAwIBAgIQaqyrhCxlulMXQ2ERwrN5FjAUBggqhkjOPQQDAgYIKoZI\nzj0DAQcwLzELMAkGA1UEBhMCR0IxDzANBgNVBAcMBkxvbmRvbjEPMA0GA1UECgwG\nUGFydHlBMB4XDTIxMTAyMDAwMDAwMFoXDTI3MDUyMDAwMDAwMFowLzELMAkGA1UE\nBhMCR0IxDzANBgNVBAcMBkxvbmRvbjEPMA0GA1UECgwGUGFydHlBMCowBQYDK2Vw\nAyEAMaHQI58Jjpugv6uIZ1qej2YDAkYOd+8IngOkp1AXioCjgYkwgYYwHQYDVR0O\nBBYEFPI4LMY1d+hDVGJTXnDJuQviBQ59MA8GA1UdEwEB/wQFMAMBAf8wCwYDVR0P\nBAQDAgKEMBMGA1UdJQQMMAoGCCsGAQUFBwMCMB8GA1UdIwQYMBaAFM1cH1AsPx3G\nP0cFiOfCyk/ezevUMBEGCisGAQQBg4piAQEEAwIBBjAUBggqhkjOPQQDAgYIKoZI\nzj0DAQcDSAAwRQIgcKAtTPzmuGtwGHTx4Gq07K0R96lGFgQhFCycFNgxcj4CIQD2\nE1rZxLU2pKar/MC86c+LNF1F55ehf9egcDUzJO8Bjg==\n-----END CERTIFICATE-----",
  requestor_signature: "ZL0pLnAqPVIL4ZSfYAHFcO+D/oAz1+GTNrJTV4mppZVxkPdK3EbhpqN79CC2MbQ1Pz8z+8DwmpYP2kbbKKL7Aw==", nonce: "4ba140e3-3bc2-4d77-91f0-3ca16e604487",
  requesting_org: "PartyA",
  confidential: false
}
```

Trade Demo (Fabric):
```
NetworkQuery { 
  policy: ["CarrierMSP", "SellerMSP"], 
  address: "trade-logistics.com:9089/wtln/wtln-channel:wtlncc:GetBillOfLadingByPurchaseOrder:PO59133361", 
  requesting_relay: "", 
  requesting_network: "americantfn", 
  certificate: "-----BEGIN CERTIFICATE-----\nMIIB2zCCAXegAwIBAgIQfrI6AbTtEhuJa9XzLy1L/TAUBggqhkjOPQQDAgYIKoZI\nzj0DAQcwNzELMAkGA1UEBhMCR0IxDzANBgNVBAcMBkxvbmRvbjEXMBUGA1UECgwO\nU2VsbGVyQmFua05vZGUwHhcNMjIwMzIyMDAwMDAwWhcNMjcwNTIwMDAwMDAwWjA3\nMQswCQYDVQQGEwJHQjEPMA0GA1UEBwwGTG9uZG9uMRcwFQYDVQQKDA5TZWxsZXJC\nYW5rTm9kZTAqMAUGAytlcAMhAMkMVTNq8lr1I4o4ivrPUNLoeV2Ab4U9PsReYo+w\n6nEio4GJMIGGMB0GA1UdDgQWBBQaqL67Z4elSpuWHjc0wfShLEBPdDAPBgNVHRMB\nAf8EBTADAQH/MAsGA1UdDwQEAwIChDATBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNV\nHSMEGDAWgBSUmpz6AYRj0sgN5TPBwA1CSs34ZDARBgorBgEEAYOKYgEBBAMCAQYw\nFAYIKoZIzj0EAwIGCCqGSM49AwEHA0gAMEUCIQCnEpDO8MNL5vL5Uiig0+9iQHX4\nBLPJZXw591f3bB8xlQIgC5ieNFiV126RvjAmuq3R6bkl//3vECCcEOzDvK424y8=\n-----END CERTIFICATE-----", 
  requestor_signature: "c+5UYaA4bZB7AI4msFdo0DTZFMnEskhlPWhB8/2IFSzwJmOopz980kxcuC/KjF3T8GQyjgMNqadaLEnKtZm3Aw==",
  nonce: "f34bc09f-8ae1-439f-ab34-5414a289e1dd", 
  requesting_org: "SellerBankNode",
  confidential: false
}
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

For more details on the `RequestState`, `SendState`, and `SendDriverState` API functions, see the [relay model](../../models/infrastructure/relays.md#api-for-other-relays)

## Database

A relay should maintain a database to store remote queries and state of the local queries at different stages of the [data sharing](../../protocols/data-sharing/generic.md) protocol. There should be two instances of the database, one for local, and other for remote. The path to both databases should be configurable. Following two basic methods should be implemented for the database:
* set<T>(key: String, value: T): stores the <key, value> pair, where key is the index. Value can be any type T which should be written into the database after being serialised to bytes array.
* get<T>(key: String): returns value stored at the key after being deserialized to type T.

The local database should be used to store the state of the query i.e. [RequestState](../views/request.md#requeststate) payload with key as `request_id`. This `request_id` is a unique ID, which is generated for each query. The same `request_id` is used for all communications regarding this particular query request.

The remote database should be used to store the request [Query]((../views/request.md#query)) from remote (destination) relay (i.e. for which this relay is the source relay) to track the requests recieved from remote relay and then sent to the intended driver. In future, the remote database can be replaced with a task queue, where the requests coming from remote relay can be queued, before sending to the driver.

