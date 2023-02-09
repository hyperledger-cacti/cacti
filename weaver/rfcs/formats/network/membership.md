<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Memberships

- RFC: 03-011
- Authors: Allison Irvin, Dileban Karunamoorthy, Ermyas Abebe, Venkatraman Ramakrishna, Nick Waywood
- Status: Proposed
- Since: 11-Aug-2020

## Summary

-   An external entity can represent a thing, person, organization or a group of entities such as a network.
-   An external entity is known to the owners of a ledger by its identity.
-   The set of identities representing the external entity is captured in a members list.
-   Members are part of the overall [security domain](../models/security-domains.md#security-domains) defined on behalf of the external entity.

## Members of a Security Domain

There are multiple strategies for capturing the members list of an external entity. If the external entity is a permissioned network, the members list can be represented by a set of certificate authorities (CAs), where each CA represents an organization in the network. This allows for any user or application in the external network to be identified as a valid member of the security domain as along as the certificate presented was issued by one of the CAs in the members list.

The members list can also be a set of public keys or a set of certificates with a valid chain of trust. This allows for individual members of the external entity to be directly identfied by their public key or certificate. An example of the former is for identifying the set of validators running a BFT consensus protocol in a permissionless network using Proof of Stake for sybil resistance.

Finally, the members map can be left empty ("\*"), indicating that any external entity is a valid member of the security domain. In these situations however, other approaches to authenticating the external entity (such as _traits_) can be used. See [security domains](../models/security-domains.md#security-domains) for discussions on this.

A members object has the following structure:

```protobuf
message Membership {
  string securityDomain = 1;
  map<string, Member> members = 2;
}

// Member of a security domain is represented by a set of public keys,
// certificates or certificate authorities
message Member {
  string value = 1;
  string type = 2;
  repeated string chain = 3;
}
```

The `type` of a member can be one of the following:

-   `public-key` - The member is identified by their public key, which is set to `value`
-   `ca` - The member is identified by a ca certificate, which is set to `value`
-   `certificate` - The member is indentified by a certificate chain, if `chain` has a value, otherwise just by `value`
-   `any` - For use in permissionless networks (see below)

<img src="../../resources/images/membership.png" width=100%>

## Examples

**An empty members map**

An empty members map is useful when defining a security domain for permissionless networks such as Bitcoin. The policies in such a security domain would prevent access to any objects in the local ledger by anonymous external parties. However, policies can be defined for verifying proofs from the Bitcoin network (e.g. a policy specifying the difficulty threshold for Proof of Work).

```json
{
    "securityDomain": "<id>",
    "members": {
        "*": {
            "value": "*",
            "type": "any"
        }
    }
}
```

**A members map based on public keys**

A set of members identfied by their public keys. Useful for defining policies for verifying state proofs from a Proof of Stake chain. The state proofs must include signatures from the validator set defined in the members map.

```json
{
    "securityDomain": "<id>",
    "members": {
        "alice": {
            "value": "<public-key1>",
            "type": "public-key"
        },
        "bob": {
            "value": "<public-key2>",
            "type": "public-key"
        },
        "charles": {
            "value": "<public-key3>",
            "type": "public-key"
        }
    }
}
```

**A members map based on cerificates**

A map of members identfied by their certificates. Useful for grouping an arbitrary set of known external parties (e.g. online services such as oracles) in a security domain.

```json
{
    "securityDomain": "<id>",
    "members": {
        "alice": {
            "value": "<org1:alice-certificate>",
            "type": "certificate"
        },
        "bob": {
            "value": "<org2:bob-certificate>",
            "type": "certificate",
            "chain": [
                "<org2:intermediate-ca-certificate>",
                "<org2:root-ca-certificate>"
            ]
        },
        "charles": {
            "value": "<org3:charles-certificate>",
            "type": "certificate",
            "chain": [
                "<org3:intermediate-ca-certificate>",
                "<org3:intermediate-ca-certificate>",
                "<org3:root-ca-certificate>"
            ]
        }
    }
}
```

**A map of members identfied by their certificate authorities**

Identifying members by their certificate authorities is a typical approach to representing the members of a permissioned network.

```json
{
  "securityDomain": "<id>",
  "members": {
      "org1":{
        "value": "<org1:intermediate-ca-certificate>",
        "type": "ca",
        "chain": [
          "<org1:root-ca-certificate>"
        ]
      },
      "org2:department1": {
        "value": "<org2:department1:intermediate-ca-certificate>",
        "type": "ca",
        "chain": [
          "<org2:intermediate-ca-certificate>",
          "<org2:root-ca-certificate>"
        ],
        "members": {
            "*": {
              "value": "*",
              "type": "any"
            }
        }
    },
    "org3":{
      "value": "<org3:root-ca-certificate>",
      "type": "ca",
      "members": {
        "department1": {
            "value": "<org3:department1:intermediate-ca-certificate>",
            "type": "ca"
        }
        "department2": {
          "value": "<org3:department2:intermediate-ca-certificate>",
          "type": "ca",
          "members": {
            "alice": {
              "value": "org3:department2:alice-certificate",
              "type": "certificate"
            },
            "bob":{
              "value": "org3:department2:bob-certificate",
              "type": "certificate"
            }
          }
        }
      }
    }
  }
}
```
