<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Proof Representation

- RFC: 01-002
- Authors: Ant Targett, Nick Waywood
- Status: Proosed
- Since: 01-Dec-2020

## Summary

Many of the messages defined in various protocols in this repository require an associated proof (for example, [data sharing](../../protocols/data-sharing/generic.md)). This associated proof ensures that the guarantees a single ledger provides are still preserved in a multi-network interoperability scenario. This protocol defines what the proof message looks like and how it behaves. The proof required can differ between networks depending on supported proofs, the types of proofs that would be supported are  Zero-Knowledge proof, proof by computation, SPV Proof, NiPoPow proof and Proof by notarisation.

## Motivation

To provide a standardised proof format across blockchains as well as providing guarantees around data and network identity. One of the primary reasons why blockchain interoperability is difficult is due to the correctness guarantees that blockchains provide and the need for the guarantees to be preserved across networks. For example, within a network the nodes utilise a consensus algorithm and sign off on interactions with the ledger to verify and validate the interaction/transaction. Alongside verification of the data being sent, verification of the network sending the data is vital to ensuring the security of the flow. This verification process would be in the form of an identity certificate being provided and verified against existing crypto material (Dilly I need your input here). In a multi network scenario, where network A queries data from network B, network A requires a proof from network B that its nodes successfully reached a consensus to verify the data as well as proof that the identity of network B is as expected. 

## Key Concepts

The format of the proof provided by each network needs to be as generic as possible to allow other networks to easily consume and verify the proof. The types of proof that will be supported will depend on the network as well as potential protocol being used, the goal would be for the proof format to support Zero-Knowledge proof, proof by computation, SPV Proof, NiPoPow proof and Proof by notarisation. The current version supports just the proof by notarisation with the next iterations supporting more proof formats. The proof by notarisation support is achieved by representing  the proof as a 'signature' and identity certificate. These two cryptographic materials would be utilised to verify the network as well as the payload being sent.

## Messages

The structure of the message is network dependant. For the details on the message structure for fabric and corda, refer to their view documentation:

- [fabric](/formats/fabric.md)
- [corda](/formats/corda.md)

## Examples

For example, in the data sharing protocol, this message structure would be embedded in the [response message type](../../protocols/data-sharing/generic.md#response-message-type)
