<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Architectural Components for Protocol Implementations

This folder contains implementations of the core capabilities that enable networks to interoperate.

Interoperation modules (for various DLTs) that are implemented in the style of, or emulate, native smart contracts, lie [here](./network).

Functions in the middle of a protocol that enable communication, interpretation, and information processing on behalf of a network are implemented in this folder. These functions may be implemented in a centralized or distributed manner, but because they are communication modules, it is not posssible to implement them as smart contracts.

Implementation of a DLT-agnostic relay module lies [here](./relay).

Implementations of DLT-aware modules for processing of requests and response lie [here](./drivers).
