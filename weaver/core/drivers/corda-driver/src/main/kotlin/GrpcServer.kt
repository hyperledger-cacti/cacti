/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.driver

import java.io.File
import io.grpc.Server
import io.grpc.ServerBuilder
import kotlinx.coroutines.*

import com.weaver.protos.common.ack.AckOuterClass
import com.weaver.protos.common.query.QueryOuterClass
import com.weaver.protos.driver.driver.DriverCommunicationGrpcKt

/**
 * The GrpcServer is used by the Corda driver to listen for requests for statefrom the relay.
 *
 * The GrpcServer of the Corda driver has the responsibility of receiving these requests,
 * dispatching them to the correct network node and returning an Ack to the requesting gRPC client.
 */
class GrpcServer(private val port: Int) {
    val server: Server
    val useTlsForDriver = (System.getenv("DRIVER_TLS")?.toBoolean() ?: false)

    init {
        if (useTlsForDriver) {
            println("Starting Corda driver gRPC server with TLS")
            server = ServerBuilder
                .forPort(port)
                .useTransportSecurity(File(System.getenv("DRIVER_TLS_CERT_PATH")?.toString() ?: ""), File(System.getenv("DRIVER_TLS_KEY_PATH")?.toString() ?: ""))
                .addService(GrpcService())
                .build()
        } else {
            server = ServerBuilder
                .forPort(port)
                .addService(GrpcService())
                .build()
        }
    }

    /**
     * The start() method is used to bring up the gRPC server of the driver.
     */
    fun start() {
        server.start()
        println("Corda driver gRPC server started. Listening on port $port")
        Runtime.getRuntime().addShutdownHook(
            Thread {
                println("Shutting down, stopping Corda driver gRPC server...")
                this@GrpcServer.stop()
            }
        )
    }

    /**
     * The stop() method shuts down the gRPC server.
     */
    private fun stop() {
        server.shutdown()
    }

    /**
     * The blockUntilShutdown() method can be used to prevent the server from
     * creating new threads while it is waiting for the main thread to terminate.
     */
    fun blockUntilShutdown() {
        server.awaitTermination()
    }

    /**
     * GrpcService implements the service for the Driver Communication.
     *
     * It provides an implementation of the requestDriverState method to receive a request for state
     * from an external network.
     */
    private class GrpcService : DriverCommunicationGrpcKt.DriverCommunicationCoroutineImplBase() {
        /**
         * requestDriverState() is used to receive a request for state from an external network.
         * It dispatches the fetchState() function that coordinates sending the request on to the Corda node.
         * It then returns an Ack to the requesting gRPC client.
         */
        override suspend fun requestDriverState(request: QueryOuterClass.Query): AckOuterClass.Ack {
            println("Request received with request: $request")
            val ack = AckOuterClass.Ack.newBuilder()
                .setStatus(AckOuterClass.Ack.STATUS.OK)
                .setRequestId(request.requestId)
                .setMessage("Received query with request id ${request.requestId}")
                .build()
            println("Fetching state from the Corda network.\n")
            GlobalScope.launch { fetchState(request) }
            println("Sending back Ack: $ack\n")
            return ack
        }
    }
}
