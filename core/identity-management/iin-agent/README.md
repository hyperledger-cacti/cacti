<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agent Implementation

In this folder lies an implementation of the IIN agent according to the [RFC specification](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/rfcs/models/identity/iin-agent.md).

The core part of this module is built in a DLT-neutral manner and can be used by a participant of a network running on any DLT platform. The module also has extensions that can be activated for specific DLT platforms.

The agent is presently implemented using TypeScript, though there is no limitation that prevents it from being ported to a different programming language.

## Build the IIN Agent

To build using code purely from this clone of Weaver, do the following:
- If the JavaScript protobufs have not alredy been built, run the following:
  ```bash
  cd ../../../common/protos-js`
  make build
  cd ../../core/identity-management/iin-agent
  ```
- Built the agent as follows:
  ```bash
  make build-local
  ```

To build using existing Weaver Github packages, run the the following:
```bash
make build
```

## Running the IIN Agent

Run `npm run dev` to start the agent in your terminal. (_Note_: we will support a containerized IIN agent in the future.)
