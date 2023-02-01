<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
---
id: cordapp-interop-api-assets
title: API Assets

---


    class AccessControlIssueRequestState(
            linearId: UniqueIdentifier = UniqueIdentifier(),
            externalNetworkId: String,
            externalNetworkCertificates: List<String>,
            requestApprovals: List<DigitalSignature.WithKey>,
            stateLinearId: UniqueIdentifier,
            participants: List<Party>
    ) : LinearState

    class FormattedResponse(
            organizationName: String,
            decryptedPayload: String,
            certString: String,
            signatureBytes: ByteArray,
            message: ByteArray,
            publicKey: PublicKey
    )

    class RelayRequestObject(
            operationType: String,
            policy: String,
            function: String,
            arguments: List<String>,
            clientOrganizationId: String,
            clientCertificate: String,
            clientSignature: String
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

    class ExternalStateRequest(
            url: String,
            path: String,
            externalNetworkId: String,
            requestId: String,
            function: String,
            participants: List<String>,
            mock: String?
    )

    class ForeignNetworkMapInformationIntermediateResponse(
            CarrierMSP:  FNNode,
            SellerMSP: FNNode
    )

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

    class TxIdResponseObject(
            queryResponse: List<List<StateQueryResponse>?>
    )

    class LinearIdResponseObject(
            queryResponse: List<StateQueryResponse>
    )

    class QueryResponse(
            state: String,
            linearId: String
    )

    class ParsedQueryObject(
            linearId: UniqueIdentifier,
            txId: String?
    )

    class ExternalNetworkRequest(
            externalNetworkId: String,
            organizationName: String,
            requesterCertificate: String,
            requesterSignature: String,
            stateLinearId: String
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

    class ExternalNetworkRequestWithTxId(
            externalNetworkId: String,
            organizationName: String,
            requesterCertificate: String,
            requesterSignature: String,
            txId: String
    )

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