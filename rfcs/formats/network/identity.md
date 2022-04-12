<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Identity Plane Data Formats

- RFC: 03-012
- Authors: Bishakh Chandra Ghosh, Venkatraman Ramakrishna, Krishnasuri Narayanam, Ermyas Abebe
- Status: Proposed
- Since: 24-Sep-2021


## Participant Unit Identity

Each network participant (Fabric organizations / Corda node owners) has its identity on the identity plane as *Participant Unit Identity*, in the form of a **DID**. We also refer to it as *Participant Unit DID*.
The participant DID Document must specify one verification method with [authentication](https://w3c.github.io/did-core/#authentication) verification relationship. The *Participant Unit DID* must be registered in some IIN registry which is public and openly accessible for DID and VC validations.

### Example:

```json
{
  "id": "did:exampleiin:org1",
  "verificationMethod": [{
    "id": "did:exampleiin:org1#key1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:exampleiin:org1",
    "publicKeyMultibase": "zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"
  }],

  "authentication": ["did:exampleiin:org1#key1"]
}
```


## Network Identity

The identity of a network as a single entity is represented by the *Network Identity* which is a DID called *Network DID*.

A permissioned blockchain network is formed by mutual agreement among its participants. Participants, whether they be in a Fabric, Corda, or Ethereum network, typically control one or more peers and act as identity providers for those peers and associated clients. In Fabric, the notion of a participant is formalized in the role of an *organization*. The blockchain network as an entity is thus not controlled by any single member but together by its participant units. But inspite of having multiple controllers, the network as an entity must have its own unitary identity, through which it can be discovered. In this specification, each permissioned blockchain network which needs to exchange its identity for interoperation has a Network DID and a corresponding Network DID Document, that we describe in this section.

A permissioned blockchain network has a Network DID that represents it.
The Network DID document conforms to the [did-core](https://www.w3.org/TR/did-core) specifications.

**id** - This property is mandatory which is the DID URI for the network. This id (DID) can be used to resolve the DID Document of the network from the IIN DID registry.

**verificationMethod** - One verification method property must be present in the Network DID document, and it must be able to support [Group Control](https://www.w3.org/TR/did-core/#group-control), so that the network participant units can jointly control the Network DID Document. Additionally, the verification method must specify who can update the DID in case the network changes as participant units leave and new ones join. This group controlled `verificationMethod` also lets the network participants jointly validate the network's composition.  We describe a multi-signature based `verificationMethod` type in the following sections.

For interoperation in the data plane, network specific identity credentials such as certificates (X.509 certificates in Hyperledger Fabric networks) are required to be configured.  For these data plane credentials, there can be optional `verificationMethods` in the Network DID document. For better privacy, without directly exposing the data plane credentials within the Network DID document, only their cryptographic hash may be included which will ensure no rogue network participant can produce tampered data plane credentials to deny/attack the interoperation. 


**authentication** - The authentication verification relationship must point to the group controlled verification method of the Network DID.

**networkParticipants** - This is not a core property of the DID specification. This is a special property required for Network DIDs that specify the members in the network. It is a list of DIDs of the individual members.

### Multi-signature based verificationMethod

A network DID must be controlled jointly by the network's participant units for operations such as creation of the DID, and its updation with changing network structure, and for other operations such as rotating/refreshing keys, updating verification methods, etc. To enable this group control, we introduce a `verificationMethod` that uses multi-signatures and associated policies.

The `verificationMethod` will have the following properties:

**id** - This will be the Network DID followed by a fragment forming a DID URI that points to this verification method. Eg: `did:<iin_name>:<network_name>#unique_verificationMethod_name`

**type** - `BlockchainNetworkMultiSig`

**controller** - Controller of this DID must be the network itself, and thus its value should be same as the Network DID.

**Verification Material for BlockchainNetworkMultiSig:**

**multisigKeys** - Map of participant DID to its verificationMethod. This contains one entry for each participant unit in `networkParticipants` list. The key is the participant unit's DID, and the value is a DID URI to the verification method of the participant DID.


Eg. If `network_participant_1` has a DID `did:<iin_name>:<network_participant_1>`, then `multisigKeys` will contain one verification method of the DID Document like `"did:<iin_name>:<network_participant_1>":"did:<iin_name>:<network_participant_1>#verificationMethod1"`


For creation of Network DID, the IIN registry must authenticate the DID creation request based on the `BlockchainNetworkMultiSig` verification method. This implies that the request must be authenticated based on each of the verificationMethods specified in  `multisigKeys`.


> NOTE on extensibility: The `networkParticipants`  lets any DID to be specified, with a verification method in `BlockchainNetworkMultiSig.multisigKeys`.  Thus another Network DID can also be represented as a participant unit of a network. This can be very useful in certain use cases where different blockchain networks may be stakeholders of a bigger network.



**updatePolicy** - Defines a combination of participant units that must sign and authenticate a Network DID updation request. The `updatePolicy` is discussed in detail [here](./../models/identity-update-policy.md).




### verificationMethod for dataplane credentials

Blockchain interoperation in the data plane by means of verifiable data sharing rely on verification of some format of proofs that comes associated with the data from another network in response to a query ([cryptographic-proofs](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/rfcs/models/cryptographic-proofs.md)). In proof by notarisation, and also most other proof formats, the foreign blockchain networks' members' cryptographic keys and certificates has to be known for validating the proofs. Therefore, to map these data plane cryptographic certificates to the identity plane, the Network DID may have a verifcation method that contains these directly, or provide pointers to them.
Depending on the blockchain platform being used by a network in the data plane, the type of the credentials may vary.

This verification policy will have the parameters:

**id** - DID URI pointing to this verification method.

**type** - `DataplaneCredentials`

**controller** - Network DID.

**[PLATFORM]Credentials** - Map of participant unit DID to Hash of dataplane platform specific credentials.

PLATFORM is the name of the dataplane platform such as Fabric/Corda/Burrow etc..

In this version we support X.509 certificates for Hyperledger Fabric's root and intermediate certificates.

In Fabric, each participant unit has a Membership Service Provider (MSP) that has a root certificate that can be used to validate proofs in the data plane. Publishing these root certificates in the Network DID directly may reveal the networks participants and thus a privacy concern. Instead, only including the cryptographic hash of the certificates in the Network DID ensures that no participant unit can provide its incorrect certificate towards denial of service attack , while still maintaining privacy.

Therefore for Fabric, `[PLATFORM]Credentials`  will be `FabricCredentials`: Map of participant unit DID to Hash of fabric root certificates of the participant.


### relayEndpoints

This is a special property required for Network DIDs that specify addresses of the [relays](../models/relays.md) in the data plane that can be used for interoperation. It is a list of relayEndpoint objects containing `hostname` and `port` of the relay.



### Example of Network DID format:

```json
{
  "id": "did:<iin_name>:<network_name>",
  "networkParticipants": [
    "did:<iin_name>:<network_participant_1>",
    "did:<iin_name>:<network_participant_2>",
    "did:<iin_name>:<network_participant_3>"
  ],
  "verificationMethod": [{
      "id": "did:<iin_name>:<network_name>#multisig",
      "type": "BlockchainNetworkMultiSig",
      "controller": "did:<iin_name>:<network_name>",
      "multisigKeys": [
        "did:<iin_name>:<network_participant_1>#key1",
        "did:<iin_name>:<network_participant_2>#key3",
        "did:<iin_name>:<network_participant_3>#key1"
      ],
      "updatePolicy": {
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
    },

    {
      "id": "did:<iin_name>:<network_name>#fabriccerts",
      "type": "DataplaneCredentials",
      "controller": "did:<iin_name>:<network_name>",
      "FabricCredentials": {
        "did:<iin_name>:<network_participant_1>": "Certificate3_Hash",
        "did:<iin_name>:<network_participant_2>": "Certificate2_Hash",
        "did:<iin_name>:<network_participant_3>": "Certificate3_Hash"
      }
    }
  ],
  "authentication": [
    "did:<iin_name>:<network_name>#multisig"
  ],
  "relayEndpoints": [
    {
      "hostname":"10.0.0.8",
      "port":"8888"
    },
    {
      "hostname":"10.0.0.9",
      "port":"8888"
    }

  ]
}
```
