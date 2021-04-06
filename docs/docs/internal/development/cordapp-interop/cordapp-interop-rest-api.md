<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
---
id: cordapp-interop-rest-api
title: REST API

---


Documentation of the REST API that is intended to be called from the MarcoPolo CordApp with the underlying
flows noted.

    GET networkMapSnapshot
    req: {}
    res: List<NodeInfo>, or failure
    calls: proxy.networkMapSnapshot

    GET registeredFlows
    req: {}
    res: List<String>, or failure
    calls: proxy.registeredFlows

    GET foreignNetworkInfos
    req: {}
    res: List<ForeignNetworkInformationManagementState>, or failure
    calls: QueryForeignNetworkInformationManagementStates

    GET foreignNetworkInfos/{id}
    req: {}
    res: ForeignNetworkInformationManagementState, or failure
    calls: QueryForeignNetworkInformationManagementStatesById

    POST foreignNetworkInfos
    req: FNIMStateRequest
    res: FNIMStateResponse, or failure
    calls: FNIMInitiator

    DELETE foreignNetworkInfos/{id}
    req: {}
    res: id, or failure
    calls: FNIMExitInitiator

    GET accessControlRequests
    req: {}
    res: AccessControlIssueRequestStateResponse, or failure
    calls: QueryAccessControlIssueRequestStateByLinearId

    POST accessControlRequests/new
    req: AccessControlIssueRequestStateRequest
    res: AccessControlIssueRequestStateResponse, or failure
    calls: AccessControlIssueRequestInitiator

    POST /accessControlRequests/approve/{id}
    req: id
    res: AccessControlIssueRequestStateResponse, or failure
    calls: AccessControlIssueRequestApprover

    GET accessControlStates
    req: {}
    res: List<AccessControlState>, or failure
    calls: QueryAccessControlStates

    GET accessControlStates/{id}
    req: {}
    res: AccessControlStateResponse, or failure
    calls: QueryAccessControlIssueRequestStateByLinearId

    POST externalNetworkRequest
    req: ExternalNetworkRequest
    res: LinearIdResponseObject, or failure
    calls: StateQueryInitiator

    POST externalNetworkRequestByTxId
    req: ExternalNetworkRequestWithTxId
    res: TxIdResponseObject, or failure
    calls: GetLinearIdsFromTxId

    GET getNetworkMap/{id}
    req: {}
    res: NetworkMapObject, or failure
    calls: proxy.networkMapSnapshot

    POST requestExternalState
    req: ExternalStateRequest
    res: UniqueIdentifier, or failure
    calls: WriteExternalStateInitiator

    GET storeFNIM
    req: {}
    res: ForeignNetworkMapInformationIntermediateResponse, or failure
    calls: QueryForeignNetworkInformationManagementStateByNetworkId