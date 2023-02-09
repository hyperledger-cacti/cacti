/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import net.corda.core.serialization.CordaSerializable

/**
 * The Address class contains the information that was sent in the address field of a query from an external network.
 *
 * @property locationSegment The location of the relay for the source network.
 * @property securityDomain The identifier for the source network.
 * @property viewSegment The part of the address that contains the identifier for the requested view.
 */
@CordaSerializable
data class Address(val locationSegment: List<String>, val securityDomain: String, val viewSegment: String)

/**
 * CordaViewAddress contains the data relevant to the view sent in the address string by the remote client.
 *
 * @property nodeAddresses The list of RPC addresses for the Corda nodes that need to be queried for the view.
 * @property flowName The fully qualified name of the flow that needs to be triggered.
 * @property flowArgs The list of arguments for the flow.
 */
@CordaSerializable
data class CordaViewAddress(val nodeAddresses: List<RpcAddress>, val flowName: String, val flowArgs: List<String>)

/**
 * RpcAddress is the address that can be used to connect to a Corda node via RPC.
 *
 * @property host The hostname of the address.
 * @property port The port of the address.
 */
@CordaSerializable
data class RpcAddress(val host: String, val port: Int)

/**
 * FabricViewAddress contains the data relevant to query a remote fabric network.
 *
 * @property channelId The channelId of the fabric query
 * @property chaincodeId The chaincodeId of the fabric query
 * @property chaincodeFn The chaincodeFn of the fabric query
 * @property chaincodeArgs The chaincodeArgs of the fabric query
 */
@CordaSerializable
data class FabricViewAddress(
        val channelId: String,
        val chaincodeId: String,
        val chaincodeFn: String,
        val chaincodeArgs: List<String>
)

/**
 * RequestForExternalState contains the information needed by the Corda client to construct
 * a query for state from a foreign network.
 *
 * @property policy This is the endorsement policy the foreign network needs to satisfy on the view response.
 * @property certificate This is the certificate of the requesting node used to authenticate the
 * request by the foreign network
 * @property signature This is the signature provided by the requesting node and used by the foreign network
 * to authenticate the request. It is signed on a byte array of the address field of the request and is
 * returned as a Base64 encoded string.
 * @property nonce A unique identifier for the request. This is used to authenticate the requester and to
 * ensure that replay attacks cannot happen in the case that a middleman intercepts the request.
 */
@CordaSerializable
data class RequestForExternalState(
        val policy: List<String>,
        val certificate: String,
        val signature: String,
        val nonce: String,
        val requestingOrg: String) {
}
