<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agent Implementation

In this folder lies an implementation of the IIN agent according to the [RFC specification](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/rfcs/models/identity/iin-agent.md).

The core part of this module is built in a DLT-neutral manner and can be used by a participant of a network running on any DLT platform. The module also has extensions that can be activated for specific DLT platforms.

The agent is presently implemented using TypeScript, though there is no limitation that prevents it from being ported to a different programming language.
