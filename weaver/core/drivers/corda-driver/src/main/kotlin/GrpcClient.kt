/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.driver

import io.grpc.ManagedChannel
import io.grpc.Status
import io.grpc.StatusException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.io.Closeable
import java.util.concurrent.TimeUnit

import com.weaver.protos.common.state.State
import com.weaver.protos.relay.datatransfer.DataTransferGrpcKt

/**
 * Implements a gRPC client that connects to a local relay to send back requested state.
 *
 * @property channel The channel that connects the local relay.
 * @property stub A stub for issuing RPCs to a relay.datatransfer.DataTransfer service as suspending
 * coroutines.
 */
class GrpcClient(private val channel: ManagedChannel) : Closeable {
    private val stub = DataTransferGrpcKt.DataTransferCoroutineStub(channel)

    /**
     * SendDriverState() executes an RPC to the local relay with the requested state.
     *
     * It returns a response message containing an Ack, suspending until the RPC completes
     * with [`Status.OK`][Status]. If the RPC completes with another status, a corresponding
     * [StatusException] is thrown. If this coroutine is cancelled, the RPC is also cancelled
     * with the corresponding exception as a cause.
     *
     * @param request The requested state to send to the gRPC server of the relay.
     *
     * @return The single response from the server containing an Ack.
     */
    suspend fun SendDriverState(
        viewPayload: State.ViewPayload
    ) = coroutineScope {
        println("Sending state back to the relay for request ${viewPayload.requestId}")
        val response = async { stub.sendDriverState(viewPayload) }
        println("Received from SendDriverState: ${response.await()}")
        return@coroutineScope response.await()
    }

    /**
     * close() shuts down the channel with the gRPC server.
     */
    override fun close() {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS)
    }
}