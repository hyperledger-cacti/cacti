<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Common Types and Structures used by Different Components

Various data structures, patterns, templates, and message types, need to be defined and interpreted in a common way globally by various components that are exercised in any intstance of interoperation.

This folder contains various closed and interdependent sets of such patterns that are used in one or more scenario (i.e., protocol).

Presently, we have defined various patterns for proof-based data-sharing, including messages and addresses passed through relays, as protobufs [here](./protos). These are parsed and used in code written in Go, Node.js, and Java, in our platform modules and sample applications.

A DSL for expressing proof verification policies is defined [here](./policy-dsl). This is work-in-progress and not used by other components at present.

General guideline is to create a new subfolder for any self-contained set of structures and templates that are defined in a common language (e.g., JSON) and which are used by different modules that can be coupled together in a protocol instance.
