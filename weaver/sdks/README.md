<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# DLT-Specific Libraries and Tools for Network Applications

Blockchain/DLT applications typically have a multi-layer architecture, with user- or organization-specific services layered over smart contracts. Hyperledger Fabric offers SDKs in Node.js (JavaScript and TypeScript), Java, and Go. Different flavors of Ethereum offer a variety of tools to build Dapps (e.g., Truffle). Corda similarly offers a framework to build CorDapps.

Because in our vision, interoperability is a core capability of a network to be exercised when needed, we need to offer libraries, tools, and SDK extensions whereby existing applications can be augmented to be interoperable, and new applications can be developed using these features.

Presently, we have implemented a library for Fabric applications developed in Node.js (i.e., using the Fabric Node SDK) [here](./fabric/interoperation-node-sdk).

A new subfolder must be created here to house libraries, tools, and SDK extensions for every distinct DLT supported by our protocols for interoperability. Therefore, any support for Besu app or CorDapp developers will be housed in separate folders, while support for Java app developers on Fabric should lie in a distinct subfolder within [this folder](./fabric/).
