<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# DID Method for DLT Networks

- RFC: 03-020
- Authors: Bishakh Chandra Ghosh, Venkatraman Ramakrishna, Krishnasuri Narayanam, Ermyas Abebe
- Status: Proposed
- Since: 10-March-2022



## Introduction

An Interoperation Identity Network (IIN) is a system built on a distributed shared ledger that supports registration of DIDs representing networks (e.g. permissioned consortium networks) and their units, as well as resolution of network DID documents from their DID. An IIN is also associated with one or more reputed [trust anchors](https://hyperledger-indy.readthedocs.io/projects/sdk/en/latest/docs/getting-started/indy-walkthrough.html#step-1-getting-trust-anchor-credentials-for-faber-acme-thrift-and-government), which play the important role of certifying (or validating) the identity of owners of those DIDs, as well as their memberships in their respective networks, in effect creating roots of trust for cross-network interoperations. Thus, IINs provide a foundation to enable the discovery and validation of blockchain/DLT networks and their participants. The IIN DID Method specification conforms to the requirements specified in [Decentralized Identifiers (DIDs) v1.0](https://w3c.github.io/did-core/). The IIN as a system is detailed further [here](./iin.md).

## IIN Method Syntax

The IIN Method scheme MUST begin with the prefix `did:iin`, and is defined by the following ABNF based on the [DID Syntax](https://www.w3.org/TR/did-core/#did-syntax):

```
iin-did           = "did:iin" iin-name ":" iin-specific-id
iin-name          = 1*idchar
iin-specific-id   = *( *idchar ":" ) 1*idchar
idchar            = ALPHA / DIGIT / "." / "-" / "_" / pct-encoded
pct-encoded       = "%" HEXDIG HEXDIG
```
### DID Types

In an IIN, there can be two types of identifiers. 

- First, for individuals / organizations which may participate in a blockchain network, called *Participant Unit DID*. 

- Second, for blockchain networks (formed by a group of individuals / organizations / other networks), called *Network DID*.

A *Network DID* 's `iin-specific-id` *MUST* end with ".network".

### Examples:

```
did:iin:ibmiin:fastshippingcompany
did:iin:ibmiin:tradelens.network
did:iin:openiin:bankorg
```


## IIN Method Operations

### Create

For creating a new DID and a DID Document in the IIN, the DID method of the IIN must authenticate the DID controller who is creating a DID. For a Network DID, this authentication must be based on a `verificationMethod` of type `GroupMultiSig`. For other DIDs (individual / organizations), the authentication can be based on any [`verificationMethod`](https://w3c.github.io/did-spec-registries/#verification-method-types).


#### For Participant Unit DID

The DID registration ("create" method) request must contain the DID document, as well as a signature that can be verified against the `authentication` verification method specified in the DID document. This request is sent by a client associated with the participant, which, in the context of blockchain interoperability, can be an IIN Agent. The underlying protocol dictating how the DID registration request will be sent to the IIN depends on the implementation of the IIN registry.

Example DID registration request:
```json
{
  "DIDDocument": {
    "id": "did:exampleiin:org1",
    "verificationMethod": [{
      "id": "did:exampleiin:org1#key1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:exampleiin:org1",
      "publicKeyMultibase": "zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"
    }],

    "authentication": ["did:exampleiin:org1#key1"]
  },
  "signature": "..."
}
```

A DID registration request, or the DID "create" method of the IIN registry, must authenticate the request. This authentication is to be done by validating the signature in the request with the help of the authentication method present in the DID Document of the request.


#### For Network DID

A Network DID document *MUST* contain a `verificationMethod` of type `GroupMultiSig`, and `networkParticipants` property listing the DIDs of the participants. 
The `GroupMultiSig` verificationMethod defines the group controller of the Network DID.

Each participant in `networkParticipants` must already have a registered DID in some IIN registry.

The DID, that is the `id` property in the Network DID document can be chosen by the network. The chosen `id` *MUST* end with ".network" and *MUST*.

See  [Network DID Identity format](../../formats/identity.md) for details about Network DID format.


##### Preparing Network DID creation request

Creating a Network DID is only possible by the DID's controller. Therefore to create a Network DID for the first time, the request has to be authenticated by verifying attestations of all participants of the network. This is done while forming the Network DID creation request.

A Network DID creation request has a `NetworkDIDDocument` and `signatures`. `NetworkDIDDocument` contains the Network DID Document with the `networkParticipants` and a `GroupMultiSig` verificationMethod. The `signatures` is a set of signatures from all participants.

> Note: During NetworkDID creation, the `updatePolicy` of the `GroupMultiSig` verificationMethod is not used. Instead. the request has to be authenticated against all the participants in `networkParticipants` list.

Example NetworkDID creation request:

```json
{
  "NetworkDIDDocument": {
    "id": "did:iin:<iin_name>:<network_name>",
    "networkParticipants": [
      "did:iin:<iin_name>:<network_participant_1>",
      "did:iin:<iin_name>:<network_participant_2>",
      "did:iin:<iin_name>:<network_participant_3>"
    ],
    "verificationMethod": [{
        "id": "did:iin:<iin_name>:<network_name>#multisig",
        "type": "GroupMultiSig",
        "controller": "did:iin:<iin_name>:<network_name>",
        "multisigKeys": [
          "did:iin:<iin_name>:<network_participant_1>#key1",
          "did:iin:<iin_name>:<network_participant_2>#key3",
          "did:iin:<iin_name>:<network_participant_3>#key1"
        ],
        "updatePolicy": {
          "id": "did:iin:<iin_name>:<network_name>#updatepolicy",
          "controller": "did:iin:<iin_name>:<network_name>",
          "type": "VerifiableCondition2021",
          "conditionAnd": [{
              "id": "did:iin:<iin_name>:<network_name>#updatepolicy-1",
              "controller": "did:iin:<iin_name>:<network_name>",
              "type": "VerifiableCondition2021",
              "conditionOr": ["did:iin:<iin_name>:<network_participant_3>#key1",
                "did:iin:<iin_name>:<network_participant_2>#key3"
              ]
            },
            "did:iin:<iin_name>:<network_participant_1>#key1"
          ]
        }
      },

      {
        "id": "did:iin:<iin_name>:<network_name>#fabriccerts",
        "type": "DataplaneCredentials",
        "controller": "did:iin:<iin_name>:<network_name>",
        "FabricCredentials": {
          "did:iin:<iin_name>:<network_participant_1>": "Certificate3_Hash",
          "did:iin:<iin_name>:<network_participant_2>": "Certificate2_Hash",
          "did:iin:<iin_name>:<network_participant_3>": "Certificate3_Hash"
        }
      }
    ],
    "authentication": [
      "did:iin:<iin_name>:<network_name>#multisig"
    ],
    "networkGatewayEndpoints": [{
        "hostname": "10.0.0.8",
        "port": "8888"
      },
      {
        "hostname": "10.0.0.9",
        "port": "8888"
      }

    ]
  },
  "signatures": {
    "did:iin:<iin_name>:<network_participant_1>": "...",
    "did:iin:<iin_name>:<network_participant_2>": "...",
    "did:iin:<iin_name>:<network_participant_3>": "..."
  }
}

```

`networkGatewayEndpoints` refer to the address of [relays](../../models/infrastructure/relays.md) which are the components facilatiting communication across DLT networks.

How this request is created is beyond the scope of this specification. The signatures of the requesters can potentially be collected and aggregated through smart contracts on the blockchain maintained by the network. 

#####  Validation of Network DID creation request by the IIN

The DID "create" method of the IIN registry must authenticate a Network DID creation request differently from other DIDs. The IIN first validates if the DID Document has the `networkParticipants` property and the `verificationMethod` property of value `GroupMultiSig`. Additionally, the request must contain the signatures from all the network participants.

The authentication process is carried out by validating the signature from each participant in the `networkParticipants` as follows:

1. The participant DID is obtained from `networkParticipants`.
   - Example: `did:iin:<iin_name>:<network_participant_1>`
2. From the `GroupMultiSig` verification method, which verification method for the participant will be used is determined from the `multisigKeys` property.
   - Example: `did:iin:<iin_name>:<network_participant_1>#key1` indicates that key1 will be used which is specified by the fragment at the end of the URI.
3. The DID Document of the participant is obtained by resolving the DID from the DID registry. It is to be noted that the participant DID may be registered in a different registry from the Network DID. The participant DID document resolution protocol is based on the did method of the concerned participant DID. The required verification method of the participant is then obtained from the DID document of the participant.
   - Example:
   ```json
    {​
      "id": "did:iin:<iin_name>:<network_participant_1>",​
      //...​
      "verificationMethod": [
        {
          "id": "did:iin:<iin_name>:<network_participant_1>#key1",
          "type": "Bls12381G2Key2020",
          "controller": "did:iin:<iin_name>:<network_participant_1>",
          "publicKeyBase58": "25ETdUZDVnME6yYuAMjFRCnCPcDmYQcoZDcZuXAfeMhXPvjZg35QmZ7uctBcovA69YDM3Jf7s5BHo4u1y89nY6mHiji8yphZ4AMm4iNCRh35edSg76Dkasu3MY2VS9LnuaVQ"

        }],
    "assertionMethod": ["did:example:org1#key1"],
    "authentication": ["did:example:org1#key2"]​
    }​
   ```

4. From `signatures` in Network DID creation request, the participant is validated with the help of the verificationMethod property determined in the previous step.


Once each participant's signature is validated, the Network DID is registered in the IIN registry.

Since the IIN registry is a decentralized registry, the validation of a Network DID creation request is carried out by multiple peers so that consensus is reached before the DID is committed in the registry.

### Read

Given a DID in the format `did:iin:<iin_name>:<network_name>` or `did:iin:<iin_name>:<participant_name>` (example `did:iinindy:tradelens`), the corresponding DID Document can be resolved.

Example Read request:

```
{
    "id": "did:iin:ibmiin:tradelens.network"
 }
 ```



### Update

#### Preparing a Network DID updation request

Updating a Network DID requires the request to be authenticated against the `GroupMultiSig` verification method's `updatePolicy`.

Similar to the Network DID creation request, the updation request has a NetworkDIDDocument and signatures. NetworkDIDDocument contains the updated Network DID document and signatures is a set of signatures satisfying the  `updatePolicy` in the `GroupMultiSig` verification method of the existing DID document, as well as the `networkParticipants`.

The updation request can be made by an IIN agent of any participant of the network.

#### Validation of a Network DID updation request by the IIN

The IIN registry authenticates a Network DID updation request based on two conditions:
(1) The signatures must satisfy the `updatePolicy` in the `GroupMultiSig` verification method of the existing Network DID document.
(2) The request must be attested by any new participant included in the `networkParticipants` list which is not present in the existing Network DID document.



### Delete

A "Delete" request only requires the DID and is authenticated in the same way as an "Update" request.


```json
{
  "id": "did:iin:<iin_name>:<network_name>",
  
  "signatures": {
    "did:iin:<iin_name>:<network_participant_1>": "...",
    "did:iin:<iin_name>:<network_participant_2>": "...",
    "did:iin:<iin_name>:<network_participant_3>": "..."
  }
}

```

## Security Considerations


## Privacy Considerations
