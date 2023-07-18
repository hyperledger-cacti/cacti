<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Data Sharing Protocol Units in Besu Networks

- RFC: 02-003
- Authors: Sandeep Nishad, Dhinakaran Vinayagamurthy, Venkatraman Ramakrishna,  Krishnasuri Narayanam
- Status: Draft
- Since: 05-Jan-2023

## Summary

- This document specifies the Hyperledger Besu implementation of modules, and application adaptation guidelines, for the data sharing protocol.

### Configuration:
- Source Driver:
    - Source Driver can maintain a map of contract names to contract addresses
    - Interop contract JSON

### Bootstrapping

Certain artifacts are required for data sharing, typically to be recorded on the ledger before operations commence. They are:

- `Membership`: An array of public keys of all the validator nodes in the network.
- `Access Control Policy`: Defined [here](../../formats/policies/access-control.md), same can be used as it is, with `principalType` to be set as `public-key`.
- `Verification Policy`: Number of validator nodes whose signature/seal is required.

### End to End steps:

At the requesting network:
1. Application at the requesting network provides:
    - **View address** which looks like:
    `<source-relay-address>/<driver-address>/<ledger-id?>:<contract-name/address>:<fun-name-with-signature>:<colon-separated-args>`
    E.g.: `localhost:9084/besu-network1/_:SimpleState:get(string):a`
    - **Verification policy** [set of nodes]: The initial implementation will provide the signatures of the nodes which endorsed the block of interest (according to the source network's consensus policy). If the input set of nodes is a subset of the endorsers, then only that subset is provided.
2. Requesting relay forwards the request to the source relay, according to `<source-relay-address>` in view address.

At the source network:
1. Source Relay: Forwards the request to the source besu driver, based on the `<driver-address>` in the view address.
2. Source Besu Driver: 
    1. Parses the view address to obtain contract segment, function name and the arguments.
    2. If contract segment is address, use it as it is, else get the address from the map using value in contract segment as the key, and use it as app contract address.
    3. Driver then calls besu interop contract with the query, app contract address, and encoded function name with signature and args.
3. `HandleExternalRequest` in Besu Interop Contract:
    1. Checks the validity of query signature.
    2. Checks that the certificate of the requester is valid according to the network's Membership.
    3. Checks the access control policy for the requester and view address is met.
    4. Performs a contract to contract call to the application contract, according to the view address (either verify the encoded value passed from driver, or generate the encoded value from the view address here).
    5. Packages the response in InteropPayload and emit it as event `Cacti_Data_Sharing`. Make sure there is only one event defined with the name `Cacti_Data_Sharing` in Besu interop contract.
4. Source Besu Driver:
    1. Get transaction Hash (txHash) and block hash from response of interop contract call.
    2. Get transactionReceipt object from txHash (`web3.eth.getTransactionReceipt`) -> txRcpt.
    3. Get Interop Payload:
        1. Get logs of response object, and get the `logIndex` (or `id`) of the log whose address is interop contract and the event name is `Cacti_Data_Sharing`.
        2. Parse the txRcpt object to obtain the logs[logIndex] (check if `id` matches) and then get the payload by `logs[logIndex].data`, which needs to be abi decoded. (Or parse the response object to obtain `logs[logIndex].args.interop_payload`)
    4. Generate Proof: 
         1. Get Block Object from `blockHash`.
         2. Obtain the `receiptsRoot` in the Block Object.
         3. Generate the Merkle-Patricia proof for the Transaction Receipt Object of interest linking it to receiptsRoot.
             1. Get all transaction hashes in Block Object using `block.transactions`.
             2. Get all transaction receipt objects using the hashes in above step.
             3. Using `merkle-patricia-trie` library, create the trie by inserting the transaction receipt objects  (assuming the order is same in besu receipts trie).
             4. Get the merkle-patricia proof from the trie, and the index of receipt object of interest.
         4. Extract validator addresses and their signatures from extraData field in the block object.
         5. Extract header fields from Block object (used to obtain block hash), and compose the proof.
    5. Package Besu View:
        1. Interop payload (obtained in 4.iii) in bytes (check if the requestor can directly obtain this from the output merkle-patricia-trie proof verification)
        2. Header fields of block object (this also contains `receiptsRoot`).
        3. Merkle-Patricia Proof
        4. Index of receipt object of interest -> txRIndex.
        5. LogIndex
        6. Signatures of validators from extraData (we can obtain a validator's public key from its signature using `recover`)
    6. Return to source relay.
5. Source relay: sends the view to requesting relay.

At the requesting network:
1. Requesting relay obtains the view and updates database.
2. Application then queries the view, and submits it to interop contract for proof verification and writing the payload to the ledger.
3. `WriteExternalState` in Besu interop contract at requesting network:
    1. Verifies proof:
        1. Using [Merkle-Patrcia Proof, txRIndex, receiptsRoot (from block header)], verify proof and if valid obtain the tx receipt object in RLP encoded form.
        2. RLP Decode the tx receipt
        3. Parse tx receipt to obtain the log object of interest using `LogIndex` from array of logs.
        4. ABI decode `log.data` to get interop payload.
        5. Verify if interop payload is same as in View (check if this is required), and if the view address is same as requested.
        6. Compute hash of the block header fields to obtain block hash.
        7. Use `recover` to obtain public keys of the validators from the signatures (in the View) and block hash.
        8. Extract the validator addresses from the block header fields and validate the recovered public keys if they correspond to the extracted validator addresses. Abort if not valid.
        9. Verify the validator addresses from the Membership of the source network recorded in the contract at the requesting network. Abort if not valid.
        10. Verify if the validator addresses correspond to the requested verification policy.
    2. Submits a contract to contract call to write the payload to the ledger.