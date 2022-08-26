<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Security Domain Identity Update Policies

- RFC: 01-015
- Authors: Bishakh Chandra Ghosh, Venkatraman Ramakrishna, Krishnasuri Narayanam, Ermyas Abebe
- Status: Proposed
- Since: 25-Aug-2022

## updatePolicy

The memberships in a blockchain network are not guaranteed to be static. Often existing members of a network leave while new organizational units join as members. As a result, the `verificationMethod` and `networkMembers` of the *Security Domain DID* must also be updated to capture the updated network structure.

Based on the different governance policies of different networks, they might want to enforce different policies that dictate which combination of existing members of the network are allowed to introduce a new member or expel existing members (or acknowledge members who left the network). These policies can be encoded into the `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Security Domain DID*.

`updatePolicy` defines a combination of organizational units that can sign and authorize a Security Domain DID updation request. This `updatePolicy` has the condition format as specified in [`verifiablecondition2021`](https://w3c.github.io/did-spec-registries/#verifiablecondition2021) verification method. It can be used to combine different verification methods together to create complex conditional expressions such as logical operations, thresholds, weighted thresholds, relationships and a delegation to external verification methods.


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
      "conditionOr": ["did:<iin_name>:<network_member_3>#key1",
        "did:<iin_name>:<network_member_2>#key3"
      ]
    },
    "did:<iin_name>:<network_member_1>#key1"
  ]
}
```

## Security Domain DID updates

Any request to update the *Security Domain DID* must be authenticated based on different policies for the different scenarios of (i) members leaving the network, (ii) new organizational units joining the network, and (iii) other updates to the Security Domain DID.

### Members leaving the network

There can be two scenarios when an existing member of a network leaves: (a) The member itself willingly leaves the network. (b) Other members of the network decide to expel that member. Based on these two scenarios, any *Security Domain DID* update request removing one member from the `networkMembers` property is authenticated as per the following conditions:

A. The *Security Domain DID* update request is attested by the member who is leaving the network, that is the member whose DID is being excluded from the  `networkMembers` property. This indicates voluntary exit from the network.

B. If condition A is not satisfied, then the DID update request must be attested satisfying the `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Security Domain DID*. The update request may also contain a new `updatePolicy` which does not depend on the member that is being removed from the `networkMembers`.

<!-- 
C. If condition A is not satisfied and there is no `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Security Domain DID*, then the DID update request must be attested by strictly greater than half (`> N/2`) of the existing members in the network indicated by `networkMembers` property of the existing *Security Domain DID* document.
-->


### Organizational Units joining the network

For new network organizational units joining the network, the DID update request must be authenticated based on  `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Security Domain DID*. The DID update request must also be attested by the organizational unit which is being added to the `networkMembers`.
<!-- 
B. If there is no `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod` in the *Security Domain DID*, then the DID update request must be attested by strictly greater than half (`> N/2`) of the existing members in the network indicated by `networkMembers` property of the existing *Security Domain DID* document. The request must also be attested by the organizational unit which is being added to the `networkMembers` property.
 -->

### Other updates to the Security Domain DID

For *Security Domain DID* update requests, where the `networkMembers` property is not altered, indicating that the member list is unchanged, the requests are authenticated based on attestations satisfying `updatePolicy` property of the *BlockchainNetworkMultiSig* `verificationMethod`.

<!-- If no `updatePolicy` is specified in the *Security Domain DID*, then the update request has to be attested by strictly greater than half (`> N/2`) of the existing members in the network indicated by `networkMembers` property of the existing *Security Domain DID* document. -->


# Choice of `updatePolicy`

The `updatePolicy` of a network is constructed through a consensus of different members that need to attest any request to change the *Security Domain DID* in future. The initial policy created for a Security Domain DID creation requires unanimity, while subsequent policy updates are governed by existing policy. Situations might arrive due to a poor choice of `updatePolicy` which cannot be satisfied by network members, where the *Security Domain DID* can no longer be controlled by the network. In those cases the members of the network have to form a separate *Security Domain DID* (a new network in the identity plane), and advertise the new DID as the new network address for the same network.

During the creation of a *Security Domain DID*, if no `updatePolicy` is set in the Security Domain DID Document, then a default `updatePolicy` may be set by the IIN as a threshold condition requiring the attestation of `> N/2` network members.

Example:

```json
{
  "id": "did:<iin_name>:<network_name>#updatepolicy",
  "controller": "did:<iin_name>:<network_name>",
  "type": "VerifiableCondition2021",
  "threshold": 4,
  "conditionThreshold": [
    "did:<iin_name>:<network_member_1>#key1",
    "did:<iin_name>:<network_member_2>#key3",
    "did:<iin_name>:<network_member_3>#key2",
    "did:<iin_name>:<network_member_4>#key1",
    "did:<iin_name>:<network_member_5>#key1",
    "did:<iin_name>:<network_member_6>#key1",
    "did:<iin_name>:<network_member_7>#key1"
  ]
}
```

If the network members explicitly want to keep the network's membership "static" (i.e., unchanging), the threshold is set to a value larger than the total number of network members.

Example:

```json
{
  "id": "did:<iin_name>:<network_name>#updatepolicy",
  "controller": "did:<iin_name>:<network_name>",
  "type": "VerifiableCondition2021",
  "threshold": 8,
  "conditionThreshold": [
    "did:<iin_name>:<network_member_1>#key1",
    "did:<iin_name>:<network_member_2>#key3",
    "did:<iin_name>:<network_member_3>#key2",
    "did:<iin_name>:<network_member_4>#key1",
    "did:<iin_name>:<network_member_5>#key1",
    "did:<iin_name>:<network_member_6>#key1",
    "did:<iin_name>:<network_member_7>#key1"
  ]
}
```
