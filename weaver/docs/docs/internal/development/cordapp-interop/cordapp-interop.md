<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
---
id: cordapp-interop
title: Interoperation CorDapp

---


Interoperation CorDapp
=====================

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Contributors:    Chander Govindarajan, Allison Irvin, Isabell Kiral
  --------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

This document contains the specification for the interoperation application including the system, the CorDapp flow design and the application server details. 
This CorDapp serves as the bridge between an established CorDapp and the relay.
There are three main functions of the Interoperation CorDapp:

1. It defines states, contracts and flows for authenticating participants of an external network and providing access control to Corda application states. 
2. It defines flows for enabling an external network to query a Corda application.
3. It defines flows for enabling a Corda application to query an external network.

The Corda interoperability application consists of the CorDapp itself, containing flows, contracts and state definitions, as well as a webserver with a REST API that connects to the Corda nodes via RPC to trigger flows.
There is no user interface for the interoperability functionality. 
The REST API is designed to be consumed by a Corda application that wishes to incorporate state synchronisation with an external network. 

To view the assets, flows and API specification in full without any of the descriptions see these pages:
- [CorDapp Assets](internal/development/cordapp-interop/cordapp-interop-assets.md)
- [API Assets](internal/development/cordapp-interop/cordapp-interop-api-assets.md)
- [Flows](internal/development/cordapp-interop/cordapp-interop-flows.md)
- [REST API](internal/development/cordapp-interop/cordapp-interop-rest-api.md)

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## General Corda notes
Corda provides many state interfaces to aid in standardisation across CorDapps. 
States must extend the `ContractState` interface, which contains a list of `AbstractParty`, called `participants`. 
This defines which Corda identities must sign off on transactions that consume state of that type. 
For states where instances evolve by superseding itself, Corda provides the `LinearState` interface. 
This includes a property `linearId`, which is a unique identifier that all versions of the state will preserve throughout the lifecycle of the state. 

## 1. Authentication of external networks

### Foreign Network Information Management

In order to control access to state in a Corda application or to verify state coming from an external network, the Corda network needs to have some way of authenticating parties in the external network. 
The Foreign Network Information Management (FNIM) state contains a network map of the foreign network, including an identifier associated with the foreign network as well as a description of each of the foreign network nodes (`FNNode`s).
This FNIM state is used to verify the identity of external network parties interacting with the Corda network. 
Every interaction requires a signature of the external network party. 
The signature is verified against the provided certificate and the authenticity of the certificate is verified against the FNIM state. 
In our current design, the definition of these `FNNode`s is very Fabric-centric, as the Fabric-Fabric interoperability design used the network map the way it was stored on the Ordering Service channel.
In order to not have to make significant changes to the way the Fabric network published its network map, this format was used to consume the FNIM in the Interoperation CorDapp, complete with fields such as `crypto_config` and `fabric_node_ous`.
The Fabric nodes' info was also stored as a key-value with the key being the name of the Fabric organisation (e.g. `SellerMSP`).
In a more generalised interoperation protocol, we should think about common features that all DLT networks are required to provide in order for external networks to be able to properly identify and authenticate participants. 

An FNIM state is created for an external network on the level of a group of Corda participants. 
The Corda participants that are listed in the FNIM state are responsible for creating the FNIM state and ensuring it is kept up to date with the external network configuration. 
In the current model, this is done manually, with the endpoint to fetch the network map from the external network through the relay hardcoded into the interoperation REST API endpoint. 
This endpoint is also used to update the FNIM state when the foreign network topology changes.
The application middleware checks if there is an FNIM state for that networkId already, and if so, deletes it before creating a new state with the updated details. 
In our demo, the participants of the FNIM state are also hardcoded. 
The flow that creates an FNIM state does not require any manual sign-off by counterparties.
The flow triggers a subflow in all participant nodes listed in the state, that checks the transaction against the contract and signs the transaction if the verification passes. 

In a more generalised protocol, it would be preferable to have a standardised format for the publication of network maps.
For example, having a decentralised identity platform for the storage of DLT network that were discoverable by other networks would be ideal. 
Otherwise, having all networks provide their network map through a consistent API, would also be helpful.

The Corda parties that control the creation and management of FNIM states in the Corda network also needs to be revisited. 
For example, ensuring currency of an FNIM state for a particular external network could be up to a group of participants that share some state together that they wish to have synchronised with the external network. 
Alternatively, a dedicated group of Corda parties could be responsible for maintaining currency of the configurations of all the external networks that any group of participants may wish to interoperate with in a Corda network. 
The mechanism for updating FNIM state when external network configuration changes should also be revisited, rather than deleting the existing state and creating a new one. 

Similarly to the requirement for a Corda network to have access to the network map of an external network, the external network must also have a snapshot of the Corda network they wish to interoperate with in order to validate requests and responses.
The exposure of the network map is currently done through the individual Corda applications as the information that each network wishes to share externally will vary on a case-by-case basis. 
This model can be revised if needed for the next iteration of the protocol.

#### FNIM CorDapp Assets
    class ForeignNetworkInformationManagementState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            participants: List<Party>,
            networkId: String,
            topology: List<FNNode>
    ) : LinearState

    class FNNode(
            admins: List<String>,
            crypto_config: CryptoConfig,
            fabric_node_ous: String?,
            intermediate_certs: List<String>,
            name: String,
            organizational_unit_identifiers: List<String>,
            revocation_list: List<String>,
            root_certs: List<String>,
            signing_identity: String?,
            tls_intermediate_certs: List<String>,
            tls_root_certs: List<String>
    )

    class CryptoConfig(
            identity_identifier_hash_function: String,
            signature_hash_family: String
    )

#### FNIM API Assets

    class FNIMStateRequest(
            networkId: String,
            topology: List<FNNode>,
            participants: List<String>
    )

    class FNIMStateResponse(
            linearId: UniqueIdentifier,
            networkId: String,
            topology: List<FNNode>,
            participants: List<String>
    )

    class ForeignNetworkMapInformationIntermediateResponse(
        CarrierMSP:  FNNode,
        SellerMSP: FNNode
    )

#### FNIM Flows

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

#### FNIM Query Flows

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

#### FNIM application REST API and Corda flow connections

    GET storeFNIM
    req: {}
    res: ForeignNetworkMapInformationIntermediateResponse, or failure
    calls: 
        1. <foreign-network-id-and-certs-configuration-url> to get ForeignNetworkMapInformationIntermediateResponse
        2. QueryForeignNetworkInformationManagementStateByNetworkId to check if FNIM exists for this network already
        3. FNIMExitInitiator (if FNIM exists already)
        4. FNIMInitiator

    POST foreignNetworkInfos
    req: FNIMStateRequest
    res: FNIMStateResponse, or failure
    calls: FNIMInitiator

    DELETE foreignNetworkInfos/{id}
    req: {}
    res: id, or failure
    calls: FNIMExitInitiator

    GET foreignNetworkInfos
    req: {}
    res: List<ForeignNetworkInformationManagementState>, or failure
    calls: QueryForeignNetworkInformationManagementStates

    GET foreignNetworkInfos/{id}
    req: {}
    res: ForeignNetworkInformationManagementState, or failure
    calls: QueryForeignNetworkInformationManagementStatesById


### Access Control
The Interoperation CorDapp allows groups of Corda parties to grant access to their application states through `AccessControlStates`.
These Access Control states are issued on a per-application state and per-external network basis (for example, for a particular letter of credit and for a particular external network). 
The application state for which the Access Control state pertains is denoted by the `stateLinearId` and the external network is specified by the `externalNetworkId` that should match the `externalNetworkId` for the FNIM state.
The Access Control state also lists the certificates of the parties of the external network who are allowed to make requests for state.
These are included in the `externalNetworkCertificates` field. 

This is just one approach that could be used to grant access to foreign network participants. 
It may be desirable to be able to set access control rules on a Corda application level (e.g. allow one Access Control state to govern access to _all_ Corda states for a given application).
Therefore, this may need to be revisited for the next version of the interoperation protocol.

As the Access Control state defines whether an external party can access state from the Corda ledger, explicit approval needs to be given by each participant of the Corda state. 
These approvals are captured in an Access Control Request State. 
Once all participants have manually approved the request through initiating the `AccessControlIssueRequestApprover`, an Access Control state will be created. 

The workflow to grant access to application states needs to be built into the application for a particular CorDapp. 
For example, as a part of a trade logistics application, one part of the user interface could include allowing particular external network participants to request a current view of a letter of credit state. 
All participants of that letter of credit would have to approve the access control request before it becomes active. 
This workflow was not built into the Corda-Fabric interoperability demo, with the creation and approval of an Access Control request being triggered through the interoperation middleware when an external network request for Corda state is received.

#### Access Control CorDapp Assets

    class AccessControlIssueRequestState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            externalNetworkId: String,
            externalNetworkCertificates: List<String>,
            requestApprovals: List<DigitalSignature.WithKey>,
            stateLinearId: UniqueIdentifier,
            participants: List<Party>
    ) : LinearState

    class AccessControlState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            externalNetworkId: String,
            externalNetworkCertificates: List<String>,
            stateLinearId: UniqueIdentifier,
            participants: List<Party>
    ) : LinearState

#### Access Control API Assets

    class AccessControlIssueRequestStateRequest(
        externalNetworkId: String,
        externalNetworkCertificates: List<String>,
        stateLinearId: String,
        participants: List<String>
    )

    class AccessControlIssueRequestStateResponse(
            linearId: UniqueIdentifier,
            externalNetworkId: String,
            externalNetworkCertificates: List<String>,
            requestApprovals: List<String>,
            stateLinearId: String,
            participants: List<String>
    )

    class AccessControlStateResponse(
            linearId: UniqueIdentifier,
            externalNetworkId: String,
            externalNetworkCertificates: List<String>,
            stateLinearId: String,
            participants: List<String>
    )

#### Access Control Flows

    class AccessControlIssueRequestInitiator(
            externalNetworkCertificates: List<String>,
            externalNetworkId: String,
            stateLinearId: UniqueIdentifier,
            participants: List<Party> {
        // Creates an access control request on the ledger for a particular document
    }

    class AccessControlIssueRequestApprover(
        id: UniqueIdentifier){
        // Allows for a party to approve an access control issuance request
        // Once all parties listed as a participant of the state the access control request pertains to
        // have approved the request, an AccessControlState is created
    }

#### Access Control Query Flows

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

    class QueryAccessControlStatesByStateIdAndNetworkId(
            stateLinearId: UniqueIdentifier,
            externalNetworkId: String
        ) AccessControlState {
        // returns access control state by the linearId of the application state and the external network Id
    }


#### Access Control Application REST API and Corda Flow Connections

    POST accessControlRequests/new
    req: AccessControlIssueRequestStateRequest
    res: AccessControlIssueRequestStateResponse, or failure
    calls: AccessControlIssueRequestInitiator

    POST /accessControlRequests/approve/{id}
    req: id
    res: AccessControlIssueRequestStateResponse, or failure
    calls: AccessControlIssueRequestApprover

    GET accessControlRequests
    req: {}
    res: AccessControlIssueRequestStateResponse, or failure
    calls: QueryAccessControlIssueRequestStateByLinearId

    GET accessControlStates
    req: {}
    res: List<AccessControlState>, or failure
    calls: QueryAccessControlStates

    GET accessControlStates/{id}
    req: {}
    res: AccessControlStateResponse, or failure
    calls: QueryAccessControlIssueRequestStateByLinearId


## 2. Handle external networks querying a Corda application for state

An external network can make a request for Corda state by reaching the interoperability CorDapp through the relay. 

For an external network request to be successful it must fulfill the following:

1. The identity of the requester needs to be authenticated through a signature on the request and a provided certificate. The signature is either made on the `linearId` or the `txId` that is provided in the request.
2. The certificate needs to be validated against the FNIM stored for the external network (i.e. the certificate needs to be issued by an issuing CA listed in the FNIM and the hierarchy of certificates in the FNIM needs to be validated up to the rootCA).
3. The desired state needs to be located in the vault of the Corda node processing the request.
4. A corresponding Access Control state needs to be found for the desired state and the certificate of the requester needs to be listed in the Access Control state.

The Corda node processing the request then needs to assemble a response object that includes the desired state and a signature on the state that provides evidence that this was the current view of the state according to that node. 
The Corda node then needs to forward the request on to all participants of the state, who run through the same process for validation of the request and assembly of the response object. 
The responses from each of the Corda nodes are collected by the initial Corda node and returned to the relay who pass the response back to the requesting network. 
Collectively, the responses from all Corda nodes (provided they shared the same view of the state) should be enough to convince the requester of the current state in the Corda ledger. 
This assumes that the requesting network trusts that the Corda network participants are not colluding to misrepresent the state. 
Whether we want to provide stronger assurances of the currency and finality of state by requiring the Notary also sign off on the state can be assessed in the next iteration.

There must be some way of identifying the desired Corda state without necessitating that the interoperation Cordapp be aware of the data classes of the Corda application. 
In Fabric, this was done by the requesting network passing the chaincode query function name and the query in the request. 
In Corda, this approach needs to be revisited because there is no concept of a chaincode query function. 
The initial approach taken in the demo was to identify the Corda state by linearId as this guarantees that the state can be uniquely identified in the vault. 
However, there is no guarantee that states will have a unique identifier as not all application states will extend the `LinearState` interface.
As well, the `linearId` is a property generated in Corda on creation of the state and may be meaningless in the business process.
Therefore, it cannot be assumed that an external network will have visibility of the `linearId`. 
Our workaround for the demo was to create a custom endpoint `externalNetworkRequestByTxId` where the desired state was identified by a property unique to a letter of credit - the `txId`. 
A set of linearIds that corresponded to that txId were then found using a custom flow called `GetLinearIdsFromTxId`. 
The request was then validated according to the criteria above (valid signature, valid certificate according to FNIM, valid Access Control state) and a response object generated for each state located by linearId.
Other approaches that could be more appropriate for Corda may include creating query flows in the CorDapp application that work in a similar way to chaincode query functions. 
This would involve investigating if cross-CorDapp triggering of flows is possible, and if so, how they can be executed. 
Another approach could be requiring a `CustomQueryCriteria` in the request that comes from the external network. 
Again, we would have to investigate if `CustomQueryCriteria` can be used in a CorDapp that has no knowledge of the application states for which that query pertains. 
Regardless of the approach to address state within Corda, for the next iteration of the protocol we need to think about how to generalise this across enterprise DLTs. 

Another workaround for the demo also of note here is the automatic generation of an Access Control state for the states specified in the request.
As we had not implemented any workflow or user interface in the Corda application for granting access to external network participants, creation of an Access Control state was triggered when the interoperation CorDapp received a request from an external network. 
Note that the functionality for a Corda application to incorporate the creation of Access Control states into their workflows is present in the interoperation APIs. 
This workaround was put in place purely because the demo did not include a demonstration of this workflow.
Some further thought will need to be put into the workflow in the application CorDapp, especially with how external network parties are represented (for example, will the application CorDapp require access to the participant certificates listed in the FNIM?).

Things to think about in the next iteration of the protocol:
- Trust model of the relay - does the request need to be encrypted?
- How do we address the Corda nodes in the request so the relay can know which node to forward the request on to
- Do we need to include guidelines about the encryption and signature schemes that can be used? Will accepted encryption and signature schemes vary on a network-by-network basis? If so, do we need some way of publishing what encryption and signature schemes a network accepts?
- How to generalise the addressing of state? In Corda this could be a `CustomQueryCriteria`, in Fabric this is currently done through chaincode function and query
- How to handle multiple states being found
- Next iteration needs to handle replay attacks - provide a nonce in the request
- Currently the `organizationName` of the requester is required in the request. We need a more general way of linking the requester identity with the issuing CA in the FNIM. 

#### Handle Requests From Foreign Network - CorDapp Assets

The `StateQueryResponse` is the object assembled by each Corda node for each requested state. 
The `requestedState` field is a JSON string of the `QueryResponse` that is encoded in Base64 as a bytearray.
The `certificate` is the certificate of the Corda node providing the state and is used by the requesting network to validate the signature and the identity of the Corda node against their locally stored copy of the Corda network FNIM. 
The `signature` is the signature of the Corda node signed on the `requestedState` bytearray. 

The `state` field in `QueryResponse` is a JSON string of the Corda application state.
For the demo, some of the JSON attributes were manipulated by converting to lowercase from camelcase, and renaming some fields.
This was done as the Fabric application was expecting the letter of credit state to be returned in a particular form.
Ideally, the Interoperation CorDapp would not manipulate the state in any way before it is returned. 
It also cannot be expected that the Corda application needs to modify its data structures in any way to conform with an external network's data structure. 
It should be up to the consuming network to parse the state it receives into a meaningful format for its own application. 
    
    class StateQueryResponse(
        requestedState: ByteArray, 
        certificate: ByteArray,
        signature: ByteArray 
    )

    class QueryResponse(
            state: String,
            linearId: String
    )

#### Handle Requests From Foreign Network - API Assets

`ExternalNetworkRequest` or `ExternalNetworkRequestWithTxId` are the two request bodies that the external network can provide.
These are based on whether the external network is identifying the Corda application state by `linearId` or `txId`. 
As mentioned previously, for the demo the latter request type was used as we assumed that the external network would not have any visibility of the `linearId` property of a Corda state.
The `externalNetworkId` needs to match with the `externalNetworkId` used to store the FNIM for the requesting network.
The `organizationName` is a Fabric-specific artifact that stems from the way identities are grouped under organizations.
This field is needed in order to validate the identity of the requester in the FNIM by finding the correct issuing CA of the credentials. 
This will need to be revised in the next iteration of the protocol as the FNIM will need to be generalised to be applicable to all enterprise DLTs. 

    class ExternalNetworkRequest(
        externalNetworkId: String,
        organizationName: String,
        requesterCertificate: String,
        requesterSignature: String,
        stateLinearId: String
    )

    class ExternalNetworkRequestWithTxId(
        externalNetworkId: String,
        organizationName: String,
        requesterCertificate: String,
        requesterSignature: String,
        txId: String
    )

#### Handle Requests From Foreign Network - Flows

    class StateQueryInitiator(
        externalNetworkId: String,
        organizationName: String,
        stateLinearId: UniqueIdentifier,
        requesterCertString: String,
        requesterSignature: String,
        txId: String?
    ) List<StateQueryResponse> {
        // returns requested state and associated proof
    }

    class GetLinearIdsFromTxId(
        txId: String
    ) List<UniqueIdentifier> {
        // returns list ids for states that match the query criterion
    }

#### Handle Requests From Foreign Network - Application REST API and Corda Flow Connections

The `externalNetworkRequest POST` endpoint is used to find the Corda application state based on `linearId`.
It will return a `StateQueryResponse` for each Corda node listed as a participant in the state, or in the case that a state is not found or access is denied for the requester, will fail.
The `externalNetworkRequestByTxId POST` endpoint finds Corda application state based on `txId` and could potentially match with multiple states. 
Therefore, for each accessible state found, each Corda node listed as a participant in the state will provide a `StateQueryResponse`.
If no states are found or the requester does not have permission to access the state, an empty list will be returned. 
Note that the access control calls that are made are purely a workaround from the fact that the setup of state access control was not built into the demo.

    POST externalNetworkRequest
    req: ExternalNetworkRequest
    res: List<StateQueryResponse>, or failure
    calls: 
        1. <interoperation-webserver1-url>/accessControlRequests/new
        2. <interoperation-webserver2-url>/accessControlRequests/approve
        3. StateQueryInitiator

    POST externalNetworkRequestByTxId
    req: ExternalNetworkRequestWithTxId
    res: List<List<StateQueryResponse>?>
    calls: 
        1. <interoperation-webserver1-url>/accessControlRequests/new
        2. <interoperation-webserver2-url>/accessControlRequests/approve
        3. GetLinearIdsFromTxId
        4. StateQueryInitiator (for each linearId)


## 3. Requests to get state from external networks

In the opposite case from the previous section, the Interoperation CorDapp also allows a Corda application to request a state from an external network. 
This consists of the following steps:

1. A Corda application uses the Interoperation CorDapp API to trigger the request to the external network (takes a `ExternalStateRequest`)
2. The Interoperation CorDapp creates a request object to send to the foreign network's relay (`RelayRequestObject`)
3. The returned state and proofs are validated
4. The external network's state is stored in the vault along with the associated proofs
5. The `linearId` of the state is returned to the Corda application
6. The Corda application retrieves the state from the vault

#### Request State from External Network - CorDapp Assets

The `ExternalStateRequest` is the request object the webserver receives as part of the `POST requestExternalState` endpoint.
It is used by the webserver to know how to address the relay and it is also passed on to the `CreateExternalRequestStateObject` flow to construct the request object that will be forwarded to the relay.
The `url` and the `path` are required to the webserver knows how to address the relay to forward the request on to.
The `externalNetworkId` identifies the external network the relay needs to forward the request to and needs to match the id used in the FNIM.
The `arguments` contains the arguments that will be passed to the specified chaincode function, `function`.
These parameters, `arguments` and `function` are very Fabric-centric and we should generalise the method of addressing state across DLTs for future iterations of the interoperation protocol.
The `participants` is the list of Corda participants that will need own the Fabric state when it is stored in Corda. 
To make this code a little cleaner, we should probably have the request object received by the webserver defined in the API assets, which should include `url`, `path`, `participants` and `requestParameters`.
The `requestParameters` would be forwarded on to the `CreateExternalRequestStateObject` flow, and would only include those fields relevant to the flow (`externalNetworkId`, `function` and `arguments`).
However, seeing as the way we address state in a more general protocol is going to change, we probably don't need to worry about cleaning this up in the demo code. 

    class ExternalStateRequest(
            url: String,
            path: String,
            externalNetworkId: String,
            arguments: String,
            function: String,
            participants: List<String>
    )

The `RelayRequestObject` is what the interoperation CorDapp sends to the relay to forward on to the Fabric network.
`operationType` defines the type of operation the Corda network wants to perform on the chaincode - either `INVOKE` or `QUERY`.
For now, the `QUERY` operation is the only one that is supported on the Fabric end and is hardcoded in the `CreateExternalRequestStateObject` flow where an instance of  `RelayRequestObject` is created.
To be consistent, `operationType` should probably have been included in the `ExternalStateRequest` that was passed into the flow.
Again, seeing as the way we address state is going to change, we won't worry about changing the demo code. 
The `policy` refers to the endorsement policy of the Fabric channel for the particular state that the Corda application is requesting. 
A more detailed discussion of how the `policy` is defined and how it _should_ be defined is in the [flows section](#writestatefromexternalnetworkflows).
The fields `function` and `arguments` are copied across from what is provided in the `ExternalStateRequest` that comes from the client application.
On the Fabric end, the Fabric nodes will want to authenticate the Corda node making the request - enabled through `clientOrganizationId`, `clientCertificate` and `clientSignature`. 

    class RelayRequestObject(
            operationType: String,
            policy: String,
            function: String,
            arguments: List<String>,
            clientOrganizationId: String,
            clientCertificate: String,
            clientSignature: String
    )

The `ExternalStateObjectState` is the way the state and proof that is returned from the external network is saved as a state in the Corda vault.

    class ExternalStateObjectState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            participants: List<Party>,
            externalState: String,
            externalNetworkId: String,
            responseObject: List<FormattedResponse>
    ) : LinearState

    class FormattedResponse(
            organizationName: String,
            decryptedPayload: String,
            certString: String,
            signatureBytes: ByteArray,
            message: ByteArray,
            publicKey: PublicKey
    )

    class RelayResponseObject(
            requestId: String,
            status: String,
            response: List<NodeResponse>?
    )

    class NodeResponse(
            proposal: String,
            proposalResponse: String
    )

    class RelayRequestId(
            requestId: String
    )

    class ParsedQueryObject(
            linearId: UniqueIdentifier,
            txId: String?
    )

    class NetworkMapObject(
            networkId: String,
            nodes: List<Node>
    )

    class Node(
            name: String,
            address: String,
            hierarchicalCerts: List<ByteArray>,
            hierarchicalCANames: List<String>
    )


#### WriteStateFromExternalNetworkFlows

The `CreateExternalRequestStateObject` flow takes the request from the Corda application (through the webserver) and creates the request object that the relay needs to pass on to the external network. 
It first looks up the FNIM for the external network based off the provided external netowrk id. 
The `policy` for the `RelayRequestObject` is created by concatenating the name of each of the `FNNode`s that are present in the `ForeignNetworkInformationManagementState` for that network, separated by the `&` symbol (e.g. for the demo `SellerMSP & CarrierMSP`).
This approach is not ideal as it is very Fabric-centric and is currently hardcoded to be all of the nodes listed in the FNIM for the network, which may or may not be the correct endorsement policy needed for the state.
How endorsement policy should be represented in the interoperation CorDapp has been raised as an [issue in the `cordapp-interop` repo](https://github.ibm.com/dlt-interoperability/cordapp-interop/issues/35).
The endorsement policy is a concept that is present in all permissioned DLTs (although not always called "endorsement policy").
It refers to the set of parties who have ownership of a state, or who control the update of a state. 
We should generalise this concept in the next iteration of the protocol and store the endorsement policies for an external network as states that can be looked up by the interop CorDapp.
The `clientCertificate` is a string of the Corda node X.509 certificate in PEM format. 
The signature is a Base 64 string, signed on a concatenation of the `function`, `arguments` and `clientOrganizationId` represented as Base 64 byte arrays.

    class CreateExternalRequestStateObject(
            request: ExternalStateRequest
    ) RelayRequestObject {
        // returns request object to query relay about a foreign network state
    }

The `WriteExternalStateInitiator` flow is used to verify the state proof that is returned from the external network and commit the state to the vault. 

    class WriteExternalStateInitiator(
        nodeResponses: List<NodeResponse>,
        externalNetworkId: String,
        participants: List<Party>
    ) UniqueIdentifier {
        // writes external state to ledger and returns unique identifier to be used to query from MarcoPolo
    }


#### Application REST API and Corda flow connections
----------------------------------------------

    POST requestExternalState
    req: ExternalStateRequest
    res: UniqueIdentifier, or failure
    calls: 
        1. CreateExternalRequestStateObject
        2. HTTP POST request to relay with the provided url and path
        3. HTTP GET request to relay to get the response from the external network
        4. WriteExternalStateInitiator

<!-- ### Implementation Notes -->
<!--
!IMPORTANT!

1.  For ease of implementation, both the application servers will be
    implemented as a single codebase with all APIs enabled. There will
    be two instantiations however, one for each bank. -->
