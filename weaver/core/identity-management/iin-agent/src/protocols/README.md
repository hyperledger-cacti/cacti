<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Agent Protocols and Services

## Syncing External Network State from Foreign IIN Agents: `syncExternalState`

* Validate the arguments passed.
* Generate nonce for this sync.
* For all IIN agents in remote security domain (based on `dnsconfig.json`), call `requestIdentityConfiguration`.
* Set expected number of responses to be received in global variable.

## Serving Network Unit State Requests from Foreign IIN Agents: `requestIdentityConfiguration`

* Validates if arguments passed correspond to this IIN agent.
* Fetches the membership.
* Signs the membership with nonce passed in argument.
* Returns the packaged `AtttestedMembership`.

## Processing Network Unit States from Foreign IIN Agents: `sendIdentityConfiguration`

* On receiving `AttestedMembership`, checks the global variable if this agent was supposed to response for the given nonce.
* Stores the response in global variable.
* Updated the number of responses received for this nonce.
* If total number of responses received matches the expected number, package all the attestations as `AttestedMembershipSet`.
* Counter attest the `AttestedMembershipSet`, and create `CounterAttestedMembership`.
* If this IIN agent is initiator of sync, and request counter attestations from all local IIN agents, and set expected number of local agent responses in another global variable.
* If no counter attestations is required, record the counter attested membership in ledger.
* If this IIN agent was responder for counter attesting for other local IIN agent, and send back the counter attested membership to the requestor IIN agent.
* Store the received `AttestedMembership` for cache purpose.

## Serving Attestation Requests from Local IIN Agents: `requestAttestation`

_TODO_

## Processing Attestations from Local IIN Agents: `sendAttestation`

* On receiving `CounterAttestedMembership`, checks the global variable if this agent was supposed to response for the given nonce.
* Stores the response in global variable.
* Updated the number of responses received for this nonce.
* If total number of responses received matches the expected number, package all the attestations, and add it to list of attestations in `CounterAttestedMembership`.
* Record the counter attested membership in ledger.