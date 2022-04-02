<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Network Identity Validation

- RFC: 02-012-appendix-a
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Bishakh Chandra Ghosh, Ermyas Abebe
- Status: Proposed
- Since: 24-Sep-2021

## Summary
When a network ("local network" from here on) tries to configure the idetntity of another network ("foreign network" from here on) for interoperation, the broad steps involved are (i) Network Discovery (ii) Network Identity Validation. Both these steps are carried out by the IIN agent of the participants of the local network.

Whether each participant needs to carry out the discovery and validation, or a subset of participants will do it depends entirely on the trust basis of the network. This is explained in [*Data Plane Identity Configuration*](./identity-syncing.md).

Merely fetching the Network DID Document in the [discovery step](../discovery/readme.md) does not prove the identity of the network or the genuinity of the Network DID Document.
Resolving a Network DID from the IIN only ensures that the the DID controllers in `networkParticipants` property of the DID document attested the network DID. However, these attestor's physical identity are not known up front to the local network participants. This is because, DIDs are not implicitely tied to any physical identity. Therefore, to validate the authenticty of the network, a local network participant must use some trust basis. This specification provides three network identity validation protocol levels, from which one or more can be carried out depending on the availability of different trust basis, and the level of decentralization desired.

The three network identity validation protocols, each using a different type trust basis are as follows:

> Note: The common assumption across all the protocols is the IIN DID registry is not malicious. Given a DLT based IIN which allows anyone to monitor the ledger, any IIN agent can validate the authenticity of a Network DID by validating the Network DID creation/updation requests from the ledger.

## A. Well Known Network DID

A Network DID registered in an IIN DID registry (IIN ledger) is controlled by the group controller specified by the `networkParticipants` and `BlockchainNetworkMultiSig` verification method. Thus, provided that the IIN registry is not compromised, the Network DID document will remain under the control of its creators. Even if the network structure changes with members joining and leaving, the `updatePolicy` ensures that the stakeholders of the network remain in control of the Network DID. Therefore, given that the local network knows the Network DID of the foreign network it wants to interoperate with, there is no need for explicit validation of the Network DID document.

### Protocol:

Step 1.  Local network participants obtain the foreign network's Network DID from some trusted source. The trusted source of the Network DID may be offline physical interaction directly with the foreign network, or some well known webpage for the network, or something else.

Step 2. Through the [discovery protocol](../discovery/readme.md), the local network participant's IIN agent obtains the Network DID document.

### Assumptions:

 - The source from which the Network DID URI is obtained is trusted. This source is the trust basis.

### Possible Attacks:
- Since the IIN is open to accepting DID registrations from anyone, a Network DID can be created by with similar URIs by attackers. Therefore, through phishing attacks and compromising the DID URI sources such as websites, the original Network DID might be replaced with a malicious one. Without further validations, the local network starts interoperation with the attacker's network. 

### Limitations:

- The source of the Network DID itself can be considered as a trust basis only for well known networks. Moreover, the security of the source such as a webpage is also a factor in the security of this protocol. For smaller networks whose webpage or some other well known source of obtaining the Network DID is not available, relying to this level of validation only is enough.




## B. Network Identity VC

The Network DID document is implicitely not tied to any physical identity. Thus after discovery, the obtained Network DID document has to be validated based on some trust basis. For this validation the local network participants may rely on some [trust anchors](../../models/identity/iin.md). These trust anchors attest the physical identity of a Network DID by issuing VC. For example, for the DID `did:iin_indy:tradelensnetwork`, a trust anchor would attest that the DID is the Network DID for the network named "TradeLens", and optionally provide additional information like the name and address of the organizations involving the network.

### Protocol:

Step 1. Trust anchor issues a verifiable credential to the Network DID. This VC attests the identity of the network as a whole, called `Network Identity VC`.

Step 2. From the Network DID document, local network participant obtains the service endpoint for requesting VCs ([DIDcomm](https://w3c.github.io/did-spec-registries/#didcommmessaging)).

Step 3. Local netowrk participant requests `Network Identity VC`

Step 4. The verifiable presentation obtained in response from the network service endoint is validated.

### Assumptions:

Atleast one trust anchor exists that issues the `Network Identity VC` to the foreign network DID, which is also trusted by the local network participants.

The trust anchor is not malicious.

### Possible Attacks:

If the DID URI is incorrect as well as the trust anchor (s) used to validate `Network Identity VC` are malicous then the local network might configure a malicious network instead of the network it intended to interoperate with.

### Limitations:

For issuing a VC for a DID, as well as requisting VPs for a credential, service endpoints are required. Since the Network DID represents a blockchain network with a group controller of its participants, having a single service endpoint can lead to centralization in control of the credentials.

In order to attest identity of a network, the trust anchor must validate the structure of the network as well as the identity of each of its participants. As a result, the availability of such trust anchors might be limited since such validation will often require physical verification of the agreements between the participants forming the network. 

## C. Participant Identity VC

Without relying on the DID URI, in the unavailability of any trust basis attesting the identity of a foreign network directly, the identity of the individual network participants can be used to  validate the Network DID.

A Network DID must have attestations from all participants during creation, and each update must satisfy the update policy  (see Network DID creation protocol). Therefore, a Network DID implies the agreement on network formation by the participants, and validating the participant identities is enough to validate the identity of the network as a whole.

### Protocol:

- Trust anchors issue `Identity VC`  to the individual network participants.

- For each foreign network participant specified in `networkParticipants` of the Network DID, validate its identity thorugh `Identity VC` issued to them by trust anchor through the following steps:

   - Resolve the participant DID document from the DID.
   - Get address of the participant's IIN agent from service endpoints in the DID document. ([DIDcomm](https://w3c.github.io/did-spec-registries/#didcommmessaging) service endpoint)
   - [Optional] negotiate a trust anchor.
   - Request `Identity VC`.
   - Validate `Identity VC`


### Limitations:

The protocol can only complete successfully if there are trust anchors available to validate the identity of the foreign network participants. Even after that, this protocol only ensures the validation of network formation by these participants. Therefore, an attack is possible by the subset of network participants of a larger network.


### Possible Attacks:

Consider a hypothetical foreign network named "Supernet", with `N` participants. The Network DID of Supernet is `did:iin_indy:supernet`. A subset of `f < N` participants of Supernet are maliscious, and they create a Network DID with URI almost similar to "Supernet": `did:iin_indy:supernetwork`. Then, if the local network wanting to interoperate with Supernet somehow gets the wrong Network DID (for example through phishing), then the discovered Network DID document would be of the maliscious network. Here, validation through the identity validaiton of the particpants will also succeed. If none of `N-f` the non-maliscious participants of Supernet are known to the local network validators then the attack would be successful.
