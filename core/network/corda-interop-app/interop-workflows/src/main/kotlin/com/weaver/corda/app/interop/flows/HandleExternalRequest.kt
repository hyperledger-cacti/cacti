/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import com.weaver.protos.common.query.QueryOuterClass
import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import arrow.core.flatMap
import co.paralleluniverse.fibers.Suspendable
import com.google.protobuf.ByteString
import com.weaver.protos.common.interop_payload.InteropPayloadOuterClass
import com.weaver.protos.common.state.State
import com.weaver.protos.corda.ViewDataOuterClass
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.FlowLogic
import net.corda.core.flows.StartableByRPC
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import java.security.MessageDigest
import java.time.Instant
import java.util.*

/**
 * The HandleExternalRequest flow processes requests that come from external networks.
 *
 * The flow coordinates the following:
 * 1. Checks the validity of query signature
 * 2. Checks that the certificate of the requester is valid according to the network's [Membership]
 * 3. Resolves flow listed in the view address
 * 4. Checks the access control policy for the requester and view address is met
 * 5. Calls application CorDapp flow
 * 6. Signs the requested view on the stringified JSON converted to a Base64 ByteArray
 * 7. Creates the View to be returned
 *
 * @property query The query that is sent by the requesting network.
 */
@StartableByRPC
class HandleExternalRequest(val query: QueryOuterClass.Query) : FlowLogic<Either<Error, State.View>>() {

    /**
     * The call() method runs the flow logic.
     *
     * Any errors that are encountered during the verification of the request are propagated up to the
     * Left(Error) type.
     *
     * @return returns an Either with an Error or a View containing the metadata and view data.
     */
    @Suspendable
    override fun call(): Either<Error, State.View> = try {
        println("Received query from foreign network $query")

        // 1. Check validity of request signature
        verifyNodeSignature(query.certificate, query.requestorSignature, (query.address + query.nonce).toByteArray()).flatMap {
            getCertificateFromString(query.certificate).flatMap {
                // 2. Check that the certificate of the requester is valid according to the securityDomain's Membership
                verifyMemberInSecurityDomain(it, query.requestingNetwork, query.requestingOrg, serviceHub)
            }
        }.flatMap {
            // 3. Resolve the flow from the address in the query
            parseCordaViewAddress(query.address).flatMap { cordaViewAddress ->
                resolveFlow(cordaViewAddress.flowName, cordaViewAddress.flowArgs)
            }
        }.flatMap { flowLogic ->
            println("Resolved flow to $flowLogic\n")
            // 4. Check access control policy is met for the requester and view address
            verifyAccessToFlow(query, serviceHub).flatMap {
                try {
                    // 5. Call the application CorDapp flow
                    val flowResult = subFlow(flowLogic)
                    println("Flow result: $flowResult\n")
                    Right(flowResult)
                } catch (e: Exception) {
                    println("Flow Error: Error calling the requested flow: ${e.message}.\n")
                    Left(Error("Flow Error: ${e.message}"))
                }
            }
        }.flatMap { flowResult ->
            val interopPayload = InteropPayloadOuterClass.InteropPayload.newBuilder()
                    .setAddress(query.address)
                    .setPayload(ByteString.copyFrom(flowResult))
                    .build()
            // 7. Assemble the view from the result returned from the flow
            subFlow(CreateNodeSignatureFlow(interopPayload.toByteArray())).flatMap { signature ->
                println("calling createView from HandleExternalRequest")
                val view = createView(
                        interopPayload.toByteArray(),
                        signature,
                        convertCertificateToBase64Pem(ourIdentityAndCert.certificate.encoded),
                        ourIdentity.name.organisation)
                println("Generated view: $view \n")
                view
            }
        }
    } catch (e: Exception) {
        println("Flow Error: Error handling the external request: ${e.message}.\n")
        Left(Error("Flow Error: Error handling the external request: ${e.message}"))
    }
}

/**
 * The QueryState flow allows for finding the LinearState's for are data in the vault
 *
 * This flow is currently only being used for testing purposes.
 */
@StartableByRPC
class QueryState() : FlowLogic<ByteArray>() {

    /**
     * The call() method runs the flow logic.
     *
     * @return returns the LinearState's corresponding to the state in the vault
     */
    @Suspendable
    override fun call(): ByteArray {
        println("Querying for states")
        var states: List<LinearState>?
        try {
            states = serviceHub.vaultService
                    .queryBy<LinearState>()
                    .states
                    .map { it.state.data }
            println("Found states $states")
        } catch (e: Exception) {
            println("Failed to retrieve states")
            states = null
        }
        return states.toString().toByteArray()
    }
}

/**
 * The resolveFlow function uses reflection to construct an instance of FlowLogic from the given
 * flow name and arguments.
 *
 * @param flowName The name of the flow provided by the remote client.
 * @param flowArgs The list of arguments for the flow provided by the remote client.
 * @return Returns an Either with an instance of FlowLogic if it was resolvable, or an Error.
 */
@Suppress("UNCHECKED_CAST")
fun resolveFlow(flowName: String, flowArgs: List<Any>): Either<Error, FlowLogic<ByteArray>> = try {
    println("Attempting to resolve $flowName to a Corda flow.")
    val kotlinClass = Class.forName(flowName).kotlin
    val ctor = kotlinClass.constructors.first()
    if (ctor.parameters.size != flowArgs.size) {
        println("Flow Resolution Error: wrong number of arguments supplied.\n")
        Left(Error("Flow Resolution Error: wrong number of arguments supplied"))
    } else {
        try {
            Right(ctor.call(*flowArgs.toTypedArray()) as FlowLogic<ByteArray>)
        } catch (e: Exception) {
            println("Flow Resolution Error: $flowName not a flow: ${e.message}.\n")
            Left(Error("Flow Resolution Error: $flowName not a flow"))
        }
    }
} catch (e: Exception) {
    println("Flow Resolution Error: ${e.message} \n")
    Left(Error("Flow Resolution Error: ${e.message}"))
}

/**
 * The createView function takes the data returned from the flow as a Base64 encoded string,
 * the node's signature on this data, and the node's certificate and assembles a [ViewData] object from
 * these, then assembles the [State.View] with the required metadata and [ViewData].
 *
 * @param data The result of the application flow that was specified by the requesting network.
 * @param signature The signature of the node signed on the data bytearray as a Base64 string.
 * @param certificate The certificate of the Corda node that provided the signature.
 * @return Returns an Either with an Error if generating the view was not successful, or the [State.View],
 * containing the metadata, proof and flow result.
 */
fun createView(interopPayload: ByteArray, signature: String, certificate: String, identity: String): Either<Error, State.View> = try {
    println("calling createViewData function")
    createViewData(interopPayload, signature, certificate, identity).map {
        val meta = State.Meta.newBuilder()
                .setProtocol(State.Meta.Protocol.CORDA)
                .setTimestamp(Date.from(Instant.now()).toString())
                .setProofType("Notarization")
                .setSerializationFormat("JSON")
                .build()
        State.View.newBuilder()
                .setMeta(meta)
                .setData(ByteString.copyFrom(it))
                .build()
    }
} catch (e: Exception) {
    println("Error creating view: ${e.message}")
    Left(Error("Error creating view: ${e.message}"))
}

/**
 * The createViewData function assembles the data and proof to be returned to the remote client.
 *
 * @param data The data that is returned from the application CorDapp flow that is specified by
 * the remote client and triggered by the interop CorDapp.
 * @param signature The signature of the node signed on the data bytearray as a Base64 string.
 * @param certificate The certificate of the Corda node that provided the signature.
 * @return Returns an Either with the Base64-encoded JSON string of the [ViewData] object or an Error.
 */
fun createViewData(
        interopPayload: ByteArray,
        signature: String,
        certificate: String,
        identity: String
) : Either<Error, ByteArray> = try {
    val notarization = ViewDataOuterClass.ViewData.Notarization.newBuilder()
            .setCertificate(certificate)
            .setSignature(signature)
            .setId(identity)
            .build()

    // Create the viewData object and convert to a JSON string
    val viewData = ViewDataOuterClass.ViewData.newBuilder()
            .addAllNotarizations(listOf(notarization))
            .setPayload(ByteString.copyFrom(interopPayload))
            .build()
    println("View data created: $viewData \n")

    Right(viewData.toByteArray())
} catch (e: Exception) {
    println("Error creating data and proof object: ${e.message}\n")
    Left(Error("Error creating data and proof object: ${e.message}"))
}
