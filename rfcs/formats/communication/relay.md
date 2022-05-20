<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relay Messages

- RFC: 03-015
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Sandeep Nishad, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 02-Apr-2022

## Summary


## NetworkQuery

This message is created by client application to encapsulate the query for the relay.

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

`policy` field specifies the [verification policy](../policies/proofs-verification) to be used for this query.
`address` stores the view address. More on addressing [here](../views/addressing).
Rest fields are self explanatory.

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

This payload defines fields to identify a relay query.

```protobuf
message GetStateMessage {
  string request_id = 1;
}
```
Currently it has only one field `request_id`.


