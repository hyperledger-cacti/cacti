<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
---
id: cordapp-interop-assets
title: CorDapp Assets

---



    class AccessControlState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            externalNetworkId: String,
            externalNetworkCertificates: List<String>,
            stateLinearId: UniqueIdentifier,
            participants: List<Party>
    ) : LinearState

    class ExternalStateObjectState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            participants: List<Party>,
            externalState: String,
            externalNetworkId: String,
            responseObject: List<FormattedResponse>
    ) : LinearState

    class ForeignNetworkInformationManagementState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            participants: List<Party>,
            networkId: String,
            topology: List<FNNode>
    ) : LinearState