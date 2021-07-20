/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.Either
import arrow.core.Left
import arrow.core.flatMap
import co.paralleluniverse.fibers.Suspendable
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.FlowLogic
import net.corda.core.flows.StartableByRPC
import java.security.MessageDigest
import java.util.*

/**
 * The CreateExternalRequest flow is used to get information required by the Corda client
 * to create a request to send to a foreign network's relay when querying a foreign
 * network for state.
 *
 * Specifically, the Corda node needs to look up the verification policy stored for the
 * external network for the request that the client wants to make. This policy allows the
 * foreign network's relay to determine which nodes the query needs to be forwarded to.
 * It also provides the certificate and signature of the requesting node.
 *
 * @property address The address contains information required for the Corda nodes to build the request.
 */
@StartableByRPC
class CreateExternalRequest(val address: String) : FlowLogic<Either<Error, RequestForExternalState>>() {

    /**
     * The call() method runs the flow logic.
     *
     * The flow first calls a subFlow to create a signature, signed on the address and nonce.
     * It then looks up the verification policy for the remote network based on the provided address.
     * It then creates the request object to be returned.
     * Any errors that occur during any of these stages are propagated up to the Left(Error) type.
     *
     * @return Returns an Either Error [RequestForExternalState] that is used by the client to construct a query.
     */
    @Suspendable
    override fun call(): Either<Error, RequestForExternalState> = try {
        println("Request to create an external request received with address $address")
        // This nonce is used to sign the request to prevent replay attacks in the case that
        // a request is intercepted by a middleman.
        val nonce = UniqueIdentifier().toString()
        val data = (address + nonce).toByteArray()
//        val digest = MessageDigest.getInstance("SHA-256").digest((address + nonce).toByteArray())
        subFlow(CreateNodeSignatureFlow(data)).flatMap{ signature ->
            println("Created signature for request: $signature")
            val orgName = ourIdentity.name.x500Principal.name.substringAfter("O=")
                    .substringBefore(",")
            parseAddress(address).flatMap { parsedAddress ->
                resolvePolicy(serviceHub, parsedAddress.securityDomain, parsedAddress.viewSegment).map { policyCriteria ->
                    val request = RequestForExternalState(
                            policyCriteria,
                            convertCertificateToBase64Pem(ourIdentityAndCert.certificate.encoded),
                            signature,
                            nonce,
                            orgName)
                    println("Returning $request\n")
                    request
                }
            }
        }
    } catch (e: Exception) {
        println("Error constructing request for external state: ${e.message}\n.")
        Left(Error("Corda Network Error: Failed to construct request ${e.message}"))
    }
}