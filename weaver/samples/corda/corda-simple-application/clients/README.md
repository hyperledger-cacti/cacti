<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Corda Client

This module contains the client that allows a user to interact with the Corda
nodes. The example Corda network contains an application CorDapp that enables
the management of simple key/value states (`SimpleState`). It also allows
interoperability with other DLT networks that also store key/value states. 

The entrypoint to the client is the `CordaClient.kt` file. It uses a kotlin CLI
library called Clikt. The parent command is defined in this file, and sets up
the configuration context used by the subcommands (i.e. the Corda node address).

The commands for managing the `SimpleState` are found in the
`SimpleStateManager.kt` file. The commands for making requests for state to
another DLT network are defined in `InteropRequests.kt`. The commands for
setting up verification policies, access control policies and network maps are
in `VerificationPolicyManager.kt`, `AccessControlPolicyManager.kt` and
`NetworkMapManager.kt`, respectively.