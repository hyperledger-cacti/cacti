<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
 
# Design Choices for Asset Exchange - HTLC Protocol Units in Corda Networks

- RFC: 02-006
- Authors: Ermyas Abebe, Venkatraman Ramakrishna, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 21-Oct-2022

Here are few possible alternatives for implementing asset exchange using HTLC in a Weaver for a Corda network.

## Approach Using Validating Notary

Below we describe the approach for the implementation of asset exchange between Alice & Bob using HTLC that requires a validating notary.
- **Lock transaction**: Consumes an input *Asset State* and produces *HTLC State* as the output. Since the claim/unlock later happens in the same ledger, a reference to the consumed *Asset State* is maintained as a Corda *StaticPointer* instead of copying the entire *Asset State* object.
  - requires consent (signature) from both parties (Alice & Bob) for locking to complete
<img src="../../resources/images/asset-exchange-corda-lock.png" width=80%>
- **Claim transaction**: Consumes an input *HTLC State* and produces *Asset State* as the output. Checks the validity of the hash-preimage and timout as part of a Corda contract _command_. The Corda _flow_ that implements this transaction triggers a _subFlow_ to create asset object as per _StateAndRef_ with owner set to the party claiming (Bob).
  - The _subFlow_ will be part of the client CorDapp, but not part of the [interoperation CorDapp](../../models/infrastructure/interoperation-modules.md) of the Corda network.
<img src="../../resources/images/asset-exchange-corda-claim-unlock.png" width=100%>
- **Unlock transaction**: Carried out by Alice after expiry of the timeout. It is similar to Claim transaction except that the _owner_ of the _Asset State_ is set to a party who performed locking (Alice).

Claim/Unlock transactions are signed by the party that submits the transaction along with a validating notary service.
-  Validation by notary compromises the privacy of the transaction data

## Approach Using Encumbrance State

Corda has a number of mechanisms built in to the protocol that make implementing HTLCs conceptually straight forward: 1) a general mechanism for conditionally locking assets 2) a mechanism for constraining the validity of certain actions to a time windows 3) a mechanism for trigger actions based on time events 4) Composite keys as a way of flexibly specifying which combination of parties owns and manages a state.

### Background Concepts

#### Encumbrance
  In Corda, additional constraints can be associated to states by attaching an Encumbrance State to them. Such an encumbrance, would have its own validation contract that overlays additional checks that can be used to restrict actions on the state. An encumbrance is attached and detached from a state through transactions.

#### Time Window
Corda supports the ability to constrain transactions to a defined time window. In the context of HTLCs this capability can be employed to specify the time range in which coin redemptions can occur, and the time point after which a refund claim is valid.

#### Time Triggered Actions
Corda supports the ability to schedule specific actions in a state at a specified time. In the context of HTLCs, this could be used to automatically process refunds once the HTLC expires, if claims haven't been submitted up to that point.

### HTLCs in CordApp
To create a Hashed Time Lock Contract in Corda, we need a generalised encumbrance state that encodes parameters of the HTLC agreement (i.e. time window, secret hash and identities of parties), and an associated contract which encodes the relevant validation logic (i.e. a state can be claimed by a counter party with a pre-image within a time window or redeemed by its original owner after). Each of these is briefly discussed below:

#### Hash Lock Encumbrance State
A generalised state class that encodes the properties of the HTLC such as the image of the secret, the time window within which a counter party can redeem the asset, and the public key of all involved parties as well as a reference to the binding contract logic. This state will be attached to an asset as an encumbrance, to conditionally lock the underlying asset.
<img src="../../resources/images/asset-exchange-corda-encumbrance-lock.png" width=80%>

#### Hash Lock Encumbrance Validation Contract
The validation contract ensures that all attempts to spend the underlying asset is validated against the conditions of the hashed lock encumbrance state. That is, it ensures that only the owner or the designated counter party can make claims against the event, that the counter-party can only claim the state upon presentation of the pre-image of the stored secret within the specified validity window, and that the owner can only claim a refund of the asset if the specified time period has elapsed.

#### Process
The procedures for setting up an HTLC with one Corda network, which would need to be mirrored in the counter party network, involves the following:
- Party A and B agree on terms of the contract (i.e. secret, time window, asset amount etc.)
- Party A creates a transaction that takes its asset state as input and produces i) a hash lock encumbrance state and ii) the asset state with a reference to the encumbrance. Party A sends this transaction to Party B.
- **Claiming**: Party B submits a transaction to claim the locked asset with the pre-image of the secret. If the pre-image is valid and the transaction is within the defined time window (as validated by the encumbrance contract), the output of the transaction will be a new state representing the asset with Party B as its owner that no longer has the encumbrance state attached to it.
<img src="../../resources/images/asset-exchange-corda-encumbrance-claim.png" width=80%>
- **Refund**: Party A submits a transaction to claim back its locked asset. If this claim occurs after the defined window has elapsed, then a new state representing the state with Part A as the owner is output that no longer has the encumbrance state attached to it.

Both claiming and refunding transactions can be performed unilaterally because during the locking phase the asset is associated with a Composite key of the two parties.

![Corda HTLC](../../resources/images/cordapp-htlc.png)

### Generalisability
The hash lock encumbrance state and associated contract can be offered as reusable pieces as part of Weaver. These pieces are largely agnostic of the specifics of the application. They can further be instrumented to *emit* custom Weaver events making automation of the orchestration of cross-chain HTLCs possible.

**Note:** We've picked a third approach [using non-validating notary](corda-htlc.md) for our [current implementation in Weaver](../../../core/network/corda-interop-app) over the above described alternatives. The primary reasons behind choosing the non-validating notary approach are: [encumbrances are not fully functional](https://github.com/corda/corda/pull/4089#issuecomment-431571103) w.r.t. contract upgrades, etc. and validation by notary compromises the privacy of the transaction data.
