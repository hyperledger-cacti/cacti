<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Access Control Policies

- RFC: 03-008
- Authors: Dileban Karunamoorthy, Ermyas Abebe, Venkatraman Ramakrishna, Nick Waywood
- Status: Proposed
- Since: 10-Aug-2020

## Summary

-   Access control policies are a means to control what objects on a ledger are accessbile to external entities and the type of actions these entities can exercise.
-   Access control policies are applied against a [security domain](../../models/security/security-domains.md), which can represent entities such as a thing, an individual, an organization or a group of entities such as network.

## Defining Access Control Policies

A verification policy has the following structure:

```protobuf
message AccessControlPolicy {
  string securityDomain = 1;
  repeated Rule rules = 2;
}

// Rule represents a single data access rule for the AccessControlPolicy
message Rule {
  string principal = 1;
  string principalType = 2;
  string resource = 3;
  bool read = 4;
}
```

An access control policy is a set of access _rules_ applied to a security domain, where each rule contains:

-   _principal_ - A security principal an external subject resolves to. When requesting access, the subject must present valid credentials identifying itself with a security domain.
-   _principalType_ - The type of identifier used in the principal field (e.g. public-key)
-   _resource_ - Represents an artifact on the ledger. The type of resources guarded can vary depending on the underlying ledger technology and can include references to business objects, smart contracts, smart contract functions, or other types of code that can result in access to state. The resource can be an exact string match of one of these entities or it can contain a star for fuzzy matching, see below for details
-   _read_ - Specifies whether the rule is currently active or not.

Access policy definitions afford a lot of flexibility in defining rules. Here are a few examples:

-   A policy defined on a security domain identified by "\*" applies to all subjects. This provides any authenticated entity access to objects listed in the rule set. The type of the principal in this case would also be "\*".
-   The _resource_ can contain a "\*" in it to support fuzzy matching. To be a valid pattern, it must contain 0 or 1 stars, and if it has one star, it must be at the end of the string. This restriction exists so that it is possible to determine to most specific access control rule for a given address.
-   The _principalType_ in a rule can be one of: "\*" | "public-key" | "ca" | "role" | "attribute". This allows for access to all subjects in a security domain ("\*") or, restricts access to subjects with a specific public key, restricts access to subjects whose certificates were issued by a known certificate authority, or subjects with a specific role or attribute defined in their certificate.

## Examples

```json
{
  "securityDomain": "<id>",
  "rules": [
    {
      "principal": "<alice's public key>",
      "principalType": "public-key",
      "resource": "state:BOL10001",
      "read": true
    }
    {
      "principal": "intermediate-ca-org3",
      "principalType": "ca",
      "resource": "*",
      "read": true
    },
    {
      "principal": "intermediate-ca-org3",
      "principalType": "ca",
      "resource": "state:*",
      "read": true
    }
  ]
}
```

**TODO**: Where do we define how to represent DLT specific objects (chaincode, flows etc)?
