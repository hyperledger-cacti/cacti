<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Proof Verification Policies

- RFC: 03-009
- Authors: Allison Irvin, Dileban Karunamoorthy, Ermyas Abebe, Venkatraman Ramakrishna, Nick Waywood
- Status: Proposed
- Since: 10-Aug-2020

## Summary

-   Networks may optionally maintain verification policies that can be applied against state proofs from remote networks.
-   These policies describe the minimum criteria a proof must satisfy for it to be considered valid.
-   It is possible, and sometimes desirable, for networks to apply a stronger criteria for proof validation than what a remote network might deem sufficient.

## Defining Verification Policies

The `criteria` for a policy defines the combinatiton of signatures that need to be provided to satisfy validity for that view, and is expressed as boolean logic that is encoded using the [JsonLogic syntax](http://jsonlogic.com/).

A verification policy has the following structure:

```protobuf
message VerificationPolicy {
  string securityDomain = 1;
  repeated Rule rules = 2;
}

// The Policy captures the list of parties that are required to provide proofs
// of a view in order for the Fabric network to accept the view as valid.
message Policy {
  string type = 1;
  repeated string criteria = 2;
}

// List of rules for the VerificationPolicy
message Rule {
  // pattern defines the view/views that this rule applies to
  // A rule may contain a "*" at the end of the pattern
  string pattern = 1;
  Policy policy = 2;
}
```

A verification policy is a set of access _rules_ applied to a security domain, where each rule contains:

-   _pattern_ - Represents an artifact on the ledger. The type of resources guarded by the pattern can vary depending on the underlying ledger technology and can include references to business objects, smart contracts, smart contract functions, or other types of code that can result in access to state. The resource can be an exact string match of one of these entities or it can contain a star for fuzzy matching, see below for details
-   _policy_ - The Policy captures the list of parties that are required to provide proofs of a view in order for the Fabric network to accept the view as valid.

## Examples

A sample policy for verifying proofs from a permissioned trade network.

```json
{
    "securityDomain": "trade-network",
    "rules": [
        {
            "pattern": "trade-channel:trade-chaincode:getbilloflading:10012",
            "policy": {
                "type": "signature",
                "criteria": {
                    "and": ["org1", "org2"]
                }
            }
        },
        {
            "pattern": "trade-channel:trade-chaincode:*",
            "policy": {
                "type": "signature",
                "criteria": {
                    "and": ["org1", "org2"]
                }
            }
        }
    ]
}
```

The values of a criteria can be parameterized. Parameters can be view derived e.g. attribute values, or can be named regex captures from the identifier or pattern fields. The example below demonstrates how this can be utilised, where `:issuer:id` and `:beneficiary:id` represent attributes that are extracted from the view. This type of criteria specification is useful for states where the validity of the state solely relies on the parties listed in the states (e.g. Bank Guarantees, Letter of Credit, legal contracts).
The mechaism for extracting the value from these attributes would need to be delegated back to the application contract, since the interoperation layer does not have knowledge of the data-model of a view. The `$issuer_id` parameter represents a captured group from the pattern field.

```json
{
    "securityDomain": "lygon",
    "rules": [
        {
            "pattern": "lygon:bg-channel-issuer:bg-chaincode:getBankGuarantee:*",
            "policy": {
                "type": "signature",
                "criteria": {
                    "or": [
                        {
                            "and": [":issuer:id", ":beneficiary:id"]
                        },
                        {
                            "and": [":issuer:id", "Lygon1B_org"]
                        },
                        {
                            "and": ["$issuer", "Lygon1B_org"]
                        }
                    ]
                }
            }
        }
    ]
}
```

A sample policy for verifying proofs from the bitcoin network.

```json
{
    "securityDomain": "bitcoin",
    "rules": [
        {
            "identifier": "<txid>",
            "policy": {
                "type": "pow",
                "criteria": {
                    "blocks": 6,
                    "difficulty": "<difficulty-target>"
                }
            }
        }
    ]
}
```
