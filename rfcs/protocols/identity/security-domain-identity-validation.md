<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Security Domain Identity Validation

- RFC: 02-017
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Bishakh Chandra Ghosh, Ermyas Abebe
- Status: Proposed
- Since: 27-Aug-2022

## Summary
When a security domain ("local security domain" from here on) tries to sync the identity and membership of another security domain ("foreign security domain" from here on) for interoperation, its members' IIN Agents must carry out the following steps: (i) Security Domain Discovery (ii) Security Domain Identity Validation.

Merely fetching the Security Domain DID Document in the [discovery step](../discovery/discovery.md) does not prove that the associated security domain is a genuine collective of organizational units.
Resolving a Security Domain DID maintained in an IIN registry only ensures that the entities specified as the group DID controllers in the `networkMembers` property of the DID document have attested it. However, these attestors' real worls identities are not known a priori to the local security domain's members. This is because DIDs are not (implicitly or explicitly) tied to any real world identity. Therefore, to validate the authenticity of the foreign security domain, a local security domain's member must rely on some trust basis. This specification provides three alternative security domain identity validation protocols. Which one is selected by a given security domain in a given scenario depends on pre-existing trust relationships between the networks as well as the desired level of decentralization.

The three security domain identity validation protocols, each built on a different kind of trust basis, are as follows:

> Note: The common assumption in all these protocols is that the IIN DID registry is not malicious. Given a DLT-based IIN which allows anyone to monitor the ledger, any IIN agent can validate the authenticity of a Security Domain DID by auditing DID create/updtate transactions recorded on the ledger.

## A. Well Known Security Domain DID

A Security Domain DID registered in an IIN DID registry (IIN ledger) is maintained by a group controller, with the members of the groups and their authentication methods specified  in the `networkMembers` and `BlockchainNetworkMultiSig` verification method attributes respectively. Thus, provided that the IIN registry is not compromised, the Security Domain DID document will remain under the control of its creators. Even if the network structure of the domain changes with members joining and leaving, the `updatePolicy` ensures that the network's members remain in control of the Security Domain DID. To interoperate with another security domain, all that domain needs to have is a reference to this Security Domain DID with embedded validation logic. No other external validation need be done on that DID document.

### Protocol:

Step 1.  Local security domain members obtain the foreign security domain's DID from a well-known or trusted source (e.g., a secure website or web service or database maintained by a public authority).

Step 2. Through the [discovery protocol](../discovery/doscovery.md), any of the local security domain's members' IIN agents obtains the Security Domain DID document.

### Assumptions:

- The source from which the Security Domain DID URI is obtained is well-known or trusted. Therefore, that source, or its reputation, is the trust basis.

### Possible Attacks:
- Since the IIN is open to accepting DID registrations from anyone, a genuine-looking Security Domain DID (i.e., a URI) can be created by attackers (masquerading as genuine network members). Therefore, using phishing attacks and compromising DID URI sources (like websites), the discovery process might lead to a fake Security Domain DID. In the absence of other validation of this DID, the local security domain will start to interoperate with the attacker's network.

### Limitations:

- For well-known networks, the reputation of the DID source itself is a sufficient trust basis. The discovery process should take the possibility of the source being attacked/compromised into account using standard network security mechanisms.
- For smaller or lesser-known networks, the IDD source may or may not require additional validation. We do not mandate this; it is left to the interoperating network to decide. As with a more well-known DID source, attack/compromise should be take into account.

## B. Security Domain Identity Verifiable Credential (VC)

The Security Domain DID document is not explicitly tied to any real world identity (nor implicitly in many DID registries, though Hyperledger Indy enables such an association when desired by the DID owners). Thus, after discovery, the obtained Security Domain DID document has to be validated using some trust basis. For this validation, the local security domain's members may rely on [trust anchors](../../models/identity/iin.md). These trust anchors attest the association of a Security Domain DID with a real world identity by issuing a VC to that DID. For example, for the DID `did:iin_indy:tradelensnetwork`, a trust anchor would attest to it belonging to the network named "TradeLens", and optionally provide additional information about the [TradeLens network](https://www.tradelens.com), like the names and addresses of the organizations that are its members.

### Protocol:

Step 1. Trust anchor issues a verifiable credential to the Security Domain DID. This VC attests the identity of the security domain as a whole, called `Security Domain Identity VC`.

Step 2. After a local security domain's member has discovered and fetched a foreign security domain's DID, it looks up a service endpoint from that DID document from which VCs can be requested (see the [DIDcomm](https://w3c.github.io/did-spec-registries/#didcommmessaging) mechanism for details).

Step 3. Local security domain member requests `Security Domain Identity VC`

Step 4. The verifiable presentation (VP) obtained in response from the security domain's network's service endoint is validated. This concludes the attestation and validation of a security domain (i.e., group of members).

### Assumptions:

At least one trust anchor exists that both:
1. Issues a `Security Domain Identity VC` to a foreign security domain's DID, and
2. Is trusted by the local security domain's members.

The trust anchor does not behave maliciously.

### Possible Attacks:

If the DID URI is incorrect (or fake) AND the trust anchor(s) used to request a `Security Domain Identity VC` from are malicouis, the local security domain will end up syncing the membership of a different (possibly fake) network instead of the network it intended to interoperate with.

### Limitations:

Every DID owner needs service endpoints to issue a VC against its DID and to serve VP requests for a given credential. Since the Security Domain DID represents a blockchain/DLT network with a group controller collectively maintained by its members, having a single service endpoint can lead to centralized control of credentials.

To attest the identity of a security domain, the trust anchor must do its due diligence by validating the structure of the domain's network as well as the identity of each of its members. Because this may involve physical and document verification (of the existence of a network's members and their agreement), few trust anchors of this kind may exist in the real world and the ones that exist may serve a limited clientele or offer limited availabiity.

## C. Security Domain Member Identity VC

A more decentralized way of attestation and validation of a security domain's DID and membership is possible by leveraging the identities of the domain's members. Here we do not rely on the knowledge of a DID URI nor a trust anchor who can issue a VC to a security domain as a whole.

For this method to work, a Security Domain DID must contain attestations from all the members of the domain during its creation, and every subsequent update must satisfy the update policy (see [Security Domain DID creation protocol](./identity-syncing.md#security-domain-identity-creation-as-security-domain-did)). Therefore, the existence of a Security Domain DID is proof that a network was formed through mutual agreement among its members; validating the members' identities is enough to validate the identity of the network (security domain) as a whole.

### Protocol:

- Trust anchors issue `Identity VC`s to the individual security domain members.
- A member of a local security domain validates the identity of each member of a foreign security domain specified in the `networkMembers` property of the latter's Security Domain DID, represented by an `Identity VC`. Thhe validation comprises of the following steps:
  * Resolve the foreign security domain's member's DID document from its DID URI.
  * Get address of the member's IIN agent by looking up the agent's service endpoint from the DID document. (See [DIDcomm](https://w3c.github.io/did-spec-registries/#didcommmessaging) mechanism for details.)
  * [Optional] determine a common trust anchor using some form of negotiation (this is beyond the scope of this spec).
  * Request member's `Identity VC`.
  * Validate member's `Identity VC` using standard mechanisms listed in the W3C DID recommendation.

### Limitations:

The protocol can only complete successfully if there are trust anchors available to validate the identity of the foreign security domain's members. Even after that, this protocol only confirms the validity of network formation by these members. A subset of members of a larger network may successfully mount an attack by masquerading as the sole members' list of that network.

### Possible Attacks:

Consider a hypothetical foreign security domain named "Supernet", with `N` members. The Security Domain DID of Supernet is `did:iin_indy:supernet`. A subset of members (of size `f < N`) of Supernet are malicious, and they create a fake Security Domain DID with URI almost similar to "Supernet": `did:iin_indy:supernetwork`. Then, if the local security domain that wishes to interoperate with Supernet somehow gets the fake Security Domain DID (e.g. using a phishing attack), then the discovered Security Domain DID document would belong to the fake network formed by the `f` malicious members. Individually, each member's Identity will be successfully validated (using their Identity VCs), so that procedure does not detect or prevent this attack. If none of `N-f` non-malicious members of Supernet are known to the local security domain's members, such an attack is likely to succeed.
