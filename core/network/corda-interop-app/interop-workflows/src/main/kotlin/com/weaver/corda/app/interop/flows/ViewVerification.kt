/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.*
import arrow.core.extensions.either.applicative.applicative
import arrow.core.extensions.list.traverse.traverse
import co.paralleluniverse.fibers.Suspendable
import com.google.protobuf.ByteString
import com.weaver.protos.common.interop_payload.InteropPayloadOuterClass
import com.weaver.protos.common.state.State
import com.weaver.protos.corda.ViewDataOuterClass
import com.weaver.protos.fabric.view_data.ViewData
import net.corda.core.node.ServiceHub
import org.hyperledger.fabric.protos.msp.Identities
import org.hyperledger.fabric.protos.peer.ProposalPackage
import org.hyperledger.fabric.protos.peer.ProposalResponsePackage
import java.security.PublicKey
import java.security.Signature
import java.util.Base64

/**
 * The verifyView function takes a view that is returned from an external network and verifies
 * that it is valid according to the proof type used for the particular protocol.
 *
 * It first determines from the protocol and proof type in the View's metadata how the
 * verification should be done and then calls the appropriate verification function.
 *
 * @param view The view that is returned by the foreign network.
 * @param address The address used to uniquely identify the view, containing the source network id,
 * and the view address.
 * @return Returns an Either with an Error if verification failed, or the [CordaViewData] or [FabricViewData].
 */
@Suspendable
fun verifyView(view: State.View,
               addressString: String,
               serviceHub: ServiceHub): Either<Error, Unit> = try {
    parseAddress(addressString).flatMap { address ->
        println("Verifying view from external network.\n")
//        val viewData = view.data.toString(Charsets.UTF_8)

        // Find the verification policy for the network and view.
        resolvePolicy(serviceHub, address.securityDomain, address.viewSegment).flatMap { verificationPolicyCriteria ->
            // Determine the view verification function that needs to be used for the protocol and proof type.
            // TODO: work out how to pattern match on more than one field
            when (view.meta.protocol) {
                State.Meta.Protocol.CORDA -> {
                    when (view.meta.proofType) {
                        "Notarization" -> verifyCordaNotarization(view.data, verificationPolicyCriteria, address.securityDomain, serviceHub)
                        else -> {
                            println("Verification Error: Proof type other than Notarization not supported in Corda.\n")
                            Left(Error("Verification Error: Proof type other than Notarization not supported in Corda"))
                        }
                    }
                }
                State.Meta.Protocol.FABRIC -> {
                    when (view.meta.proofType) {
                        "Notarization" -> verifyFabricNotarization(
                                view.data,
                                verificationPolicyCriteria,
                                address.securityDomain,
                                addressString,
                                serviceHub)
                        else -> {
                            println("Verification Error: Proof type other than Notarization not supported in Fabric.\n")
                            Left(Error("Verification Error: Proof type other than Notarization not supported in Fabric"))
                        }
                    }
                }
                State.Meta.Protocol.BITCOIN -> {
                    println("Verification Error: Interoperation with Bitcoin protocol not implemented.\n")
                    Left(Error("Verification Error: Interoperation with Bitcoin protocol not implemented"))
                }
                State.Meta.Protocol.ETHEREUM -> {
                    println("Verification Error: Interoperation with Ethereum protocol not implemented.\n")
                    Left(Error("Verification Error: Interoperation with Ethereum protocol not implemented"))
                }
                else -> {
                    println("Verification Error: Unrecognized protocol.\n")
                    Left(Error("Verification Error: Unrecognized protocol"))
                }
            }
        }
    }
} catch (e: Exception) {
    println("Verification Error: Error with view verification: ${e.message}.\n")
    Left(Error("Verification Error: Error with view verification: ${e.message}"))
}

/**
 * The verifyCordaNotarization function is used to verify views that come from a Corda network
 * that were generated with Notarization proofs.
 *
 * Verification requires the following steps:
 * 1. Make the [ViewDataOuterClass.ViewData] object from the view data
 * 2. Verify each of the signatures in the Notarization array according to the data bytes and certificate.
 * 3. Check the certificates are valid according to the [Membership].
 * 4. Check the notarizations fulfill the verification policy of the request.
 *
 * @param viewData The data returned from the Corda network that contains a bytestring of
 * the [ViewDataOuterClass.ViewData].
 * @param verificationPolicy The verification policy that the source network is required to meet in order
 * for the view to be considered valid.
 * @param securityDomain The securityDomain of the remote network
 * @return Returns an Either with the Unit if verification was successful, else an Error.
 */
@Suspendable
fun verifyCordaNotarization(viewData: ByteString, verificationPolicyCriteria: List<String>, securityDomain: String, serviceHub: ServiceHub): Either<Error, Unit> = try {
    println("Verifying the Corda network notarizations for policy $verificationPolicyCriteria.\n")

    // 1. Make the CordaViewData object from the view data
    val cordaViewData = ViewDataOuterClass.ViewData.parseFrom(viewData)
    println("Corda view data: $cordaViewData")

    // 2. Map over the list of notarizations and verify the signature, creating a list of Either Error Boolean
    val eitherErrorCordaViewData = cordaViewData.notarizationsList.map { notarization ->
        getCertificateFromString(notarization.certificate).flatMap { x509Cert ->
            // 3. Check the certificates are valid according to the [Membership].
            verifyMemberInSecurityDomain(x509Cert, securityDomain, notarization.id, serviceHub).flatMap {
                verifyNodeSignature(notarization.certificate, notarization.signature, cordaViewData.payload.toByteArray())
            }
        }
    }
            // Traverse over the List of Eithers, to create an Either<Error, List<Bool>>
            .traverse(Either.applicative(), ::identity)
            .fix().map { it.fix() }
            // Map the Right to the view data
            .map { viewData }

    // Get the signers from the list of notarizations
    val signers = cordaViewData.notarizationsList.map { it.id }

    // 4. Check that every party listed in the verification policy is a signatory
    eitherErrorCordaViewData.flatMap { _ ->
        if (signers.containsAll(verificationPolicyCriteria)) {
            println("All required parties in the verification policy have signed.\n")
            Right(Unit)
        } else {
            println("Verification Error: Not all required parties have signed.\n")
            Left(Error("Verification Error: Not all required parties have signed."))
        }
    }
} catch (e: Exception) {
    println("Corda Network Error: Error verifying Corda notarization view: ${e.message}\n")
    Left(Error("Corda Network Error: Error verifying Corda notarization view: ${e.message}"))
}

/**
 * The verifyFabricNotarization function is used to verify views that come from a Fabric network
 * that were generated with Notarization proofs.
 *
 * Verification requires the following checks to be performed:
 * 1. Ensure the response is in a valid format - view data should be parsed to [ViewData.FabricView]
 * 2. Verify address in payload is the same as original address
 * 3. Verify that the responses in the different ProposalResponsePayload blobs match each other
 * 4. Validate endorsement certificate and check [Membership]
 * 5. Check the notarizations fulfill the verification policy of the request.
 *
 * @param viewData The data returned from the Fabric network that contains a bytestring of
 * the [ViewData.FabricView].
 * @param verificationPolicy The verification policy that the source network is required to meet in order
 * for the view to be considered valid.
 * @param securityDomain The securityDomain of the remote network
 * @return Returns an Either with the Unit if verification was successful, else an Error.
 */
@Suspendable
fun verifyFabricNotarization(
        viewData: ByteString,
        verificationPolicyCriteria: List<String>,
        securityDomain: String,
        addressString: String,
        serviceHub: ServiceHub): Either<Error, Unit> {
    try {
        println("Verifying Fabric notarizations.\n")

        val viewDataBase64String = Base64.getEncoder().encodeToString(viewData.toByteArray())

        println("viewDataBase64String: $viewDataBase64String")

        // 1. Make the FabricViewData object from the view data
        val fabricViewData = ViewData.FabricView.parseFrom(viewData)
        println("Fabric view data: $fabricViewData\n")

        // TODO: Handle encrypted (confidential) payloads in Fabric views
        var responsePayload = ""
        var responsePayloadEncoded = ""
        var responseIndex = 0
        for (endorsedProposalResponse in fabricViewData.endorsedProposalResponsesList) {
            val chaincodeAction = ProposalPackage.ChaincodeAction.parseFrom(endorsedProposalResponse.payload.extension)
            val interopPayload = InteropPayloadOuterClass.InteropPayload.parseFrom(chaincodeAction.response.payload)
            println("Interop payload: $interopPayload")
            // 2. Verify address in payload is the same as original address
            if (interopPayload.address != addressString) {
                println("Address in response does not match original address: Original: $addressString Response: ${interopPayload.address}")
                return Left(Error("Address in response does not match original address: Original: $addressString Response: ${interopPayload.address}"))
            }
            // 3. Verify that the responses in the different ProposalResponsePayload blobs match each other
            if (responseIndex == 0) {
                responsePayload = chaincodeAction.response.payload.toString()
                responsePayloadEncoded = Base64.getEncoder().encodeToString(chaincodeAction.response.payload.toByteArray())
            } else if (responsePayload != chaincodeAction.response.payload.toString()) {
                println("Mismatching payloads in proposal responses: 0 - $responsePayload,  $responseIndex: ${chaincodeAction.response.payload}")
                val encodedPayload = Base64.getEncoder().encodeToString(chaincodeAction.response.payload.toByteArray())
                return Left(Error("Mismatching payloads in proposal responses: 0 - $responsePayloadEncoded,  $responseIndex: $encodedPayload"))
            }
            responseIndex++
        }

        // For each of the peer responses in the viewData, parse the proposal response field to a ProposalResponse
        return fabricViewData.endorsedProposalResponsesList.map { endorsedProposalResponse ->
            val endorsement = endorsedProposalResponse.endorsement
            // 4. Validate endorsement certificate and check [Membership]
            verifyEndorsementAndMapToOrgName(endorsement, securityDomain, endorsedProposalResponse.payload.toByteArray(), serviceHub)
            // Traverse the resulting List<Either<Error, String>> to get an Either<Error, List<String>>
        }.traverse(Either.applicative(), ::identity)
                .fix().map { it.fix() }
                .flatMap { orgNameList ->
                    // 5. Check that the list of endorsers contains all the required verifiers
                    println("Checking that the verification policy has been met.")
                    // TODO: This needs to use the criteria now instead
                    if (orgNameList.containsAll(verificationPolicyCriteria)) {
                        println("All required parties in the verification policy have signed.\n")
                        Right(Unit)
                    } else {
                        println("Error: Not all required parties have signed.\n")
                        Left(Error("Not all required parties have signed"))
                    }
                }
    } catch (e: Exception) {
        println("Verification Error: Error verifying Fabric notarization view: ${e.message}.\n")
        return Left(Error("Verification Error: Error verifying Fabric notarization view: ${e.message}"))
    }
}

/**
 * verifyEndorsementAndMapToOrgName checks the endorser certificate is valid according to the membership
 * and validates the signature on the response payload with the certificate
 *
 * @param endorsement The endorsement from the remote network
 * @param securityDomain The securityDomain of the remote network
 * @param fabricViewData The [ViewData.FabricView] returned from the Fabric network
 * @return Returns an Error if the endorsement verification failed, or the orgName of the org the
 * signed the certificate.
 */
fun verifyEndorsementAndMapToOrgName(endorsement: ProposalResponsePackage.Endorsement, securityDomain: String, proposalResponsePayloadBytes: ByteArray, serviceHub: ServiceHub): Either<Error, String> {
    // Get the endorser certificate from the Endorsement
    val serializedIdentity = Identities.SerializedIdentity.parseFrom(endorsement.endorser)
    val certString = Base64.getEncoder().encodeToString(serializedIdentity.idBytes.toByteArray())
    println("Cert string of endorser: $certString")

    // Convert the certificate string to an X509 certificate
    return getCertificateFromString(certString).flatMap { certificate ->
        val orgName = serializedIdentity.mspid
        // Check the endorser certificate is valid according to the Membership
        verifyMemberInSecurityDomain(certificate, securityDomain, orgName, serviceHub).flatMap {
            // Validate the signature on the response payload with the certificate
            isValidFabricSignature(
                    publicKey = certificate.publicKey,
                    message = proposalResponsePayloadBytes + endorsement.endorser.toByteArray(),
                    signatureBytes = endorsement.signature.toByteArray())
        }.map { orgName }
    }
}

/**
 * The isValidFabricSignature function verifies the signature created by a Fabric peer.
 *
 * @param publicKey The public key of the Fabric peer creating the signature.
 * @param message The message that the signature was created on as a Base64 bytearray
 * @param signatureBytes The Base64 bytearray of the signature.
 * @return Returns an Error if the signature was not valid, or true if it was.
 * TODO: use the generic verify signature function - Fabric-specific not needed.
 */
fun isValidFabricSignature(
        publicKey: PublicKey,
        message: ByteArray,
        signatureBytes: ByteArray
): Either<Error, Boolean> = try {
    println("Verifying the Fabric peer's signature.")
    val signature = Signature.getInstance("SHA256withECDSA")
    signature.initVerify(publicKey)
    signature.update(message)
    signature.verify(signatureBytes)
    println("Signature verification was successful.\n")
    Right(true)
} catch (e: Exception) {
    println("Verification Error: Error verifying Fabric signature:::: ${e.message}.\n")
    Left(Error("Verification Error: Error verifying Fabric signature: ${e.message}"))
}
