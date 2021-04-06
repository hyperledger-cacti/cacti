<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
---
id: cordapp-interop-flows
title: Flows

---

### AccessControlFlows

    class AccessControlIssueRequestInitiator(
            externalNetworkCertificates: List<String>,
            externalNetworkId: String,
            stateLinearId: UniqueIdentifier,
            participants: List<Party> {
        // creates an access control state on the ledger for a particular document
    }

    class AccessControlIssueRequestApprover(
        id: UniqueIdentifier){
        // allows for a party to approve an access control issuance request
    }

### AccessControlQueryFlows

    class QueryAccessControlIssueRequestStates() List<AccessControlIssueRequestState> {
        // returns access control requests
    }

    class QueryAccessControlIssueRequestStateByLinearId(linearId: UniqueIdentifier) AccessControlIssueRequestState {
        // returns access control request by Id
    }

    class QueryAccessControlStates() List<AccessControlState> {
        // returns list of access control states
    }

    class QueryAccessControlStateByLinearId(linearId: UniqueIdentifier) AccessControlState {
        // returns access control state by Id
    }

### FNIMFlows

    class FNIMInitiator(
        networkId: String,
        topology: List<FNNode>,
        participants: List<Party>) {
        // creates FNIM record for an external network
    }

    class FNIMExitInitiator(
        id: String ) {
        // marks FNIM state as consumed
    }

### FNIMQueryFlows

    class QueryForeignNetworkInformationManagementStates : List<ForeignNetworkInformationManagementState> {
        // returns list of FNIM states
    }

    class QueryForeignNetworkInformationManagementStatesById(
        linearId: UniqueIdentifier) ForeignNetworkInformationManagementState {
        // returns FNIM state
    }

    class QueryForeignNetworkInformationManagementStateByNetworkId(
        networkId: String) ForeignNetworkInformationManagementState {
        // returns FNIM state for specified network
    }

### HandleRequestsFromForeignNetworkFlows

    class StateQueryInitiator(
        externalNetworkId: String,
        organizationName: String,
        stateLinearId: UniqueIdentifier,
        requesterCertString: String,
        requesterSignature: String,
        txId: String?
    ) List<StateQueryResponse> {
        // returns requested state
    }

    class GetLinearIdsFromTxId(
        txId: String
    ) List<UniqueIdentifier> {
        // returns list ids for states that match the query criterion
    }

### WriteStateFromExternalNetworkFlows
    class CreateExternalRequestStateObject(
            request: ExternalStateRequest
    ) RelayRequestObject {
        // returns request object to query relay about a foreign network state
    }

    class WriteExternalStateInitiator(
        nodeResponses: List<NodeResponse>,
        externalNetworkId: String,
        participants: List<Party>
    ) UniqueIdentifier {
        // writes external state to ledger and returns unique identifier to be used to query from MarcoPolo
    }