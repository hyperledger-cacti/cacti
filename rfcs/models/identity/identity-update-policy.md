<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Network Identity Update Policies

- RFC: 01-015
- Authors: Bishakh Chandra Ghosh, Venkatraman Ramakrishna, Krishnasuri Narayanam, Ermyas Abebe
- Status: Proposed
- Since: 24-Sep-2021

## updatePolicy

The memberships in a blockchain network are not guaranteed to be static. Often existing participant members of a network leave while new participants join. As a result, the `verificationMethod` and `networkParticipants` of the *Network DID* must also be updated to capture the updated network structure.

Based on the different governance policies of different networks, they might want to enforce different policies that dictate which combination of existing participants of the network are allowed to introduce a new member or expel existing members (or acknowledge members who left the network). These policies can be encoded into the `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Network DID*.

`updatePolicy` defines a combination of participant units that can sign and authorize a Network DID updation request. This `updatePolicy` has the condition format as specified in [`verifiablecondition2021`](https://w3c.github.io/did-spec-registries/#verifiablecondition2021) verification method. It can be used to combine different verification methods together to create complex conditional expressions such as logical operations, thresholds, weighted thresholds, relationships and a delegation to external verification methods.


Example of `updatePolicy`. 
```json
{
  "id": "did:<iin_name>:<network_name>#updatepolicy",
  "controller": "did:<iin_name>:<network_name>",
  "type": "VerifiableCondition2021",
  "conditionAnd": [{
      "id": "did:<iin_name>:<network_name>#updatepolicy-1",
      "controller": "did:<iin_name>:<network_name>",
      "type": "VerifiableCondition2021",
      "conditionOr": ["did:<iin_name>:<network_participant_3>#key1",
        "did:<iin_name>:<network_participant_2>#key3"
      ]
    },
    "did:<iin_name>:<network_participant_1>#key1"
  ]
}
```

## Network DID updates

Any request to update the *Network DID* must be authenticated based on different policies for the different scenarios of (i) participants leaving the network, (ii) new participants joining the network, and (iii) other updates to the Network DID.

### Participants leaving the network

There can be two scenarios when an existing participant unit of a network leaves: (a) The participant itself willingly leaves the network. (b) Other participants of the network decide to expel that participant. Based on these two scenarios, any *Network DID* update request removing one participant from the `networkParticipants` property is authenticated as per the following conditions:

A. The *Network DID* update request is attested by the participant who is leaving the network, that is the participant whose DID is being excluded from the  `networkParticipants` property. This indicates voluntary exit from the network.

B. If condition A is not satisfied, then the DID update request must be attested satisfying the `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Network DID*. The update request may also contain a new `updatePolicy` which does not depend on the member that is being removed from the `networkParticipants`.

<!-- 
C. If condition A is not satisfied and there is no `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Network DID*, then the DID update request must be attested by strictly greater than half (`> N/2`) of the existing participants in the network indicated by `networkParticipants` property of the existing *Network DID* document.
-->


### Participants joining the network

For new network participants joining the network, the DID update request must be authenticated based on  `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Network DID*. The DID update request must also be attested by the participant which is being added to the `networkParticipants`.
<!-- 
B. If there is no `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Network DID*, then the DID update request must be attested by strictly greater than half (`> N/2`) of the existing participants in the network indicated by `networkParticipants` property of the existing *Network DID* document. The request must also be attested by the participant which is being added to the `networkParticipants` property.
 -->

### Other updates to the Network DID

For *Network DID* update requests, where the `networkParticipants` property is not altered, indicating that the participant list is unchanged, the requests are authenticated based on attestations satisfying `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod`.

<!-- If no `updatePolicy` is specified in the *Network DID*, then the update request has to be attested by strictly greater than half (`> N/2`) of the existing participants in the network indicated by `networkParticipants` property of the existing *Network DID* document. -->


# Choice of `updatePolicy`

The `updatePolicy` of a network is constructed through a consensus of different participants that need to attest any request to change the *Network DID* in future. The initial policy created for a Network DID creation requires unanimity, while subsequent policy updates are governed by existing policy. Situations might arrive due to a poor choice of `updatePolicy` which cannot be satisfied by network the participants, where the *Network DID* can no longer be controlled by the network. In those cases the members of the network have to form a separate *Network DID* (a new network in the identity plane), and advertise the new DID as the new network address for the same network.

During the creation of a *Network DID*, if no `updatePolicy` is set in the Network DID Document, then a default `updatePolicy` may be set by the IIN as a threshold condition requiring the attestation of `> N/2` network participants.

Example:

```json
{
  "id": "did:<iin_name>:<network_name>#updatepolicy",
  "controller": "did:<iin_name>:<network_name>",
  "type": "VerifiableCondition2021",
  "threshold": 4,
  "conditionThreshold": [
    "did:<iin_name>:<network_participant_1>#key1",
    "did:<iin_name>:<network_participant_2>#key3",
    "did:<iin_name>:<network_participant_3>#key2",
    "did:<iin_name>:<network_participant_4>#key1",
    "did:<iin_name>:<network_participant_5>#key1",
    "did:<iin_name>:<network_participant_6>#key1",
    "did:<iin_name>:<network_participant_7>#key1"
  ]
}
```

If the network members explicitly want to create a "static" network where the network members are not supposed to be changed, then the threshold is set to a value more than the number of participants in the network.

Example:

```json
{
  "id": "did:<iin_name>:<network_name>#updatepolicy",
  "controller": "did:<iin_name>:<network_name>",
  "type": "VerifiableCondition2021",
  "threshold": 8,
  "conditionThreshold": [
    "did:<iin_name>:<network_participant_1>#key1",
    "did:<iin_name>:<network_participant_2>#key3",
    "did:<iin_name>:<network_participant_3>#key2",
    "did:<iin_name>:<network_participant_4>#key1",
    "did:<iin_name>:<network_participant_5>#key1",
    "did:<iin_name>:<network_participant_6>#key1",
    "did:<iin_name>:<network_participant_7>#key1"
  ]
}
```
