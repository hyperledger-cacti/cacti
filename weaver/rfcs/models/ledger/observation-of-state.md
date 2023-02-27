<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Verifiable Observation of State

- RFC: 01-003
- Authors: Allison Irvin, Dileban Karunamoorthy, Ermyas Abebe, Venkatraman Ramakrishna
- Status: Draft
- Since: 13-Aug-2020

## Summary

* An observer, also called a remote agent or external client, is a non-participant of a ledger - they are external to a committee or community maintaining a ledger.
* Observers can however receive state that can be verified 
* The ability to observe and verify state on remote ledgers is the basis for desiging an interoperable protocol.

## Observers are Non-Participants


Neither run full nodes nor have a valid identity recognized by the maintainers of a ledger.
Observers differ from participants of a ledger, including those who don't run fulls nodes, in the following ways:
* Observers don't run full nodes
* Observers may not have complete knowledge of all maintainers of state.
* Observers may not have knowledge of policies governing the state. 
* Observers don't participate in the governance process. 
* Unlike internal participants, observers are not signatories to state.

### Required Further Discussion

* Internal client, in the following, implies that no member of the client's org maintains a full-node.
* Perhaps there is little use in drawing a distinction between observers and internal clients who don't run full nodes.
* If the ledger is public, the two are identitical.
* If the ledger is permissioned:
  * The maintainers of state control access and visibility of state to both internal clients and observers.
  * Observers have identities, just like the internal counterparts, just not issued by the maintainers.
  * Observers must be carefully vetted just like internal clients.
* Internal clients exist to transact on the network, i.e. they are signatories of state concerning them.
* State changes by observers are carried out by a participant, on behalf of the observer.
* The distinction gets blurry if networks are based entirely on an identity system such as SSI.


## "Destination" Networks are Observers

* TODO: We need a better term than "destination" (e.g. consumer/consuming network)
* Destination networks are observers with access to views projected by a ("source") network.
