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
operator = ledger-id , ":" , contract-name/address , ":" , func-name-with-signature , [ ":" , { argument } ] ;
```

`ledger-id` is empty in case of Besu.

Example:

-   ledger-id: _ (indicating empty)
-   Contract Name: SimpleState
-   Function Name: get(string)
-   Arguments: key

```
operator = _:SimpleState:get(string):key
```

## View Data Definition

1. Interop payload in bytes (_check_ if the requestor can directly obtain this from the output merkle-patricia-trie proof verification)
2. Header fields of block object (this also contains `receiptsRoot`).
3. [Merkle-Patricia Proof](https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/)
4. Index of receipt object of interest -> txRIndex.
5. LogIndex
6. Signatures of validators from extraData (we can obtain a validator's public key from its signature using `recover`)
