/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.sdk;

import io.grpc.ManagedChannel
import io.grpc.Status
import io.grpc.StatusException
import java.io.Closeable
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.slf4j.LoggerFactory

import com.weaver.protos.networks.networks.NetworkGrpcKt.NetworkCoroutineStub
import com.weaver.protos.networks.networks.Networks

/**
 * RelayClient implements a gRPC client that connects to a local relay to request external state.
 *
 * @property channel The channel that connects the local relay.
 * @property stub A stub for issuing RPCs to a networks.networks.Network service as suspending coroutines.
 */
class RelayClient(private val channel: ManagedChannel) : Closeable {
    private val stub = NetworkCoroutineStub(channel)
    private val logger = LoggerFactory.getLogger(RelayClient::class.java)

    /**
     * requestState() coordinates making the initial RPC to the local relay to with a request for
     * state from an external network.
     *
     * It returns a response message, suspending until the RPC completes
     * with [`Status.OK`][Status]. If the RPC completes with another status, a corresponding
     * [StatusException] is thrown. If this coroutine is cancelled, the RPC is also cancelled
     * with the corresponding exception as a cause.
     *
     * The response returned contains the Id of the request which is later used by the getState function
     * to poll for the state returned by the external network to the relay. This allows the request
     * for state to be done asynchronously.
     *
     * @param networkQuery The query for the state to retrieve from an external network.
     *
     * @return The acknowledgement response from the gRPC server.
     */
    suspend fun requestState(networkQuery: Networks.NetworkQuery) = coroutineScope {
        val response = async { stub.requestState(networkQuery) }
        logger.debug("Ack received from requestState with requestId: ${response.await()}")
        return@coroutineScope response.await()
    }

    /**
     * getState() executes an RPC to the local relay with the Id of the request for
     * which it wishes to retrieve the state.
     *
     * This gRPC call is intended to be used for polling the relay for the state it previously
     * requested in the requestState gRPC call.
     * It returns a response message, suspending until the RPC completes
     * with [`Status.OK`][Status]. If the RPC completes with another status, a corresponding
     * [StatusException] is thrown. If this coroutine is cancelled, the RPC is also cancelled
     * with the corresponding exception as a cause.
     *
     * @param requestId The id of the request for which to get the state.
     *
     * @return The RequestState from the server.
     */
    suspend fun getState(requestId: String) = coroutineScope {
        val request = Networks.GetStateMessage.newBuilder()
                .setRequestId(requestId)
                .build()
        val response = async { stub.getState(request) }
        return@coroutineScope response.await()
    }

    /**
     * close() shuts down the channel with the gRPC server.
     */
    override fun close() {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS)
    }
}
