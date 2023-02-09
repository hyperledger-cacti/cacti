<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Policy DSL

- RFC: 03-010
- Authors: Allison Irvin, Dileban Karunamoorthy, Ermyas Abebe, Venkatraman Ramakrishna, Nick Waywood
- Status: Draft
- Since: 10-Aug-2020

## Summary

A verification policy defines the proof criteria that a requesting network requires of a remote network (see [Proof Verification Policies](./proof-verification.md) for more information).

This DSL defines the language that can be used to express these proof requirements.

## Grammar

The grammar for the DSL is defined in [an antlr4 grammar file](../../../common/policy-dsl/parser/Policy.g4).

The main piece of the grammar is

```
expression
           : expression AND expression  #booleanAndExpression
           | expression OR expression   #booleanOrExpression
           | ID                         #idExpression
           | count_expression           #countExpression
           ;
```

which states that an expression in this language can be composed of count expressions and "ID"s, and these expressions can be combined using boolean AND and OR operators.

-   A count expression allows you to specify a number of signatories that are required
-   An ID allows you to specify a specific organisation that needs to sign

## Examples

-   Org1 and Org2 need to sign

`Org1 && Org2`

-   Org1 needs to sign and at least 3 signatures are required

`Org1 && count >= 3`

-   Org1 and Org2 need to sign or have more than 5 signatures

`Org1 && Org2 || count > 4`
