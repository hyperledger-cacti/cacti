<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Ethereum Views

- RFC: 03-006
- Authors: Ermyas Abebe
- Status: Draft
- Since: 13-Aug-2020

## Addressing an Ethereum View

```
operator = contract-address , function-selector , { argument }
```

Example:

* Contract Address: 0x51c9c2475f106fd6bed2bd45824a9ab5b0d24113
* Function Selector: 0xcdcd77c0
* Argument 1: 0x0000000000000000000000000000000000000000000000000000000000000045
* Argument 2: 0x0000000000000000000000000000000000000000000000000000000000000001

```
operator = 0x51c9c2475f106fd6bed2bd45824a9ab5b0d24113:0xcdcd77c00x00000000000000000000000000000000000000000000000000000000000000450x0000000000000000000000000000000000000000000000000000000000000001
```

## View Data Definition

### Examples

