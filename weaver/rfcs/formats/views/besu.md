<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Besu Views

- RFC: 03-005
- Authors: Sandeep Nishad, Dhinakaran Vinayagamurthy, Venkatraman Ramakrishna, Krishnasuri Narayanam
- Status: Draft
- Since: 05-Jan-2023

## Summary

This document specifies the design of view address for remote query to Besu networks, and the structure of `Besu View` which is returned as response of the remote query.

## Addressing a Besu View

```
operator = network-id , ":" , contract-address , ":" , func-name-with-signature , [ ":" , { argument } ] ;
```

Example:

-   Network-id: 123
-   contract-address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
-   Function Name: get(string)
-   Arguments: key

```
operator = 123:0x5FbDB2315678afecb367f032d93F642f64180aa3:get(string):key
```

## View Data Definition
The view from a Besu network ledger is specified below. It consists of endorsed (i.e., signed) response to state requests made

1. Interop payload in bytes (_check_ if the requestor can directly obtain this from the output merkle-patricia-trie proof verification)
2. Header fields of block object (this also contains `receiptsRoot`).
3. [Merkle-Patricia Proof](https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/)
4. Index of receipt object of interest -> txRIndex.
5. LogIndex
6. Signatures of validators from extraData (we can obtain a validator's public key from its signature using `recover`)

Take a view at [Besu Block Header Fields](https://github.com/hyperledger/besu/blob/21.7.0/ethereum/core/src/main/java/org/hyperledger/besu/ethereum/core/BlockHeader.java#L199)

```protobuf
syntax = "proto3";

message BlockHeader {
  // Fields representing the header of a block object
  string parentHash = 1;
  string sha3Uncles = 2;
  string miner = 3;
  string stateRoot = 4;
  string transactionsRoot = 5;
  string receiptsRoot = 6;
  string logsBloom = 7;
  string difficulty = 8;
  string number = 9;
  string gasLimit = 10;
  string gasUsed = 11;
  string timestamp = 12;
  string extraData = 13;
  string mixHash = 14;
  string nonce = 15;
  // ...
}

message BesuView {
  bytes interop_payload = 1;
  BlockHeader block_header = 2;
  bytes merkle_proof = 3;
  uint32 receipt_index = 4;
  uint32 log_index = 5;
  repeated bytes validator_signatures = 6;
}
```

You can find the besu view_data.proto file [here](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/common/protos/besu/view_data.proto).
