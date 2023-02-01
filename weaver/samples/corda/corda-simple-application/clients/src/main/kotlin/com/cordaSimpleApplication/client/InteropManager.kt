/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import io.grpc.ManagedChannelBuilder
import java.lang.Exception
import kotlinx.coroutines.*
import net.corda.core.messaging.startFlow
import java.util.*

import com.cordaSimpleApplication.flow.CreateState
import com.cordaSimpleApplication.state.SimpleState

import com.weaver.corda.sdk.InteroperableHelper

/**
 * The CLI command used to trigger a request for state from an external network.
 *
 * This triggers the creation of a relay client that makes a gRPC request to the local relay for some state.
 * Upon receipt of an Acknowledgement from the local relay, the client will poll the local relay for the
 * state data until it receives a "COMPLETED" message. It then triggers the [WriteExternalStateInitiator]
 * flow to store the external state in the vault.
 *
 * @property localRelayPort The port used by the local relay
 * @property externalStateAddress The information necessary for the relay to locate the external state. Includes the name of the remote relay, the driver that connect to the external network and some parameters used by the external network to locate the state.
 *
 * TODO: Put the address of the Corda node to connect to in a local config file
 */
class RequestStateCommand : CliktCommand(help = "Requests state from a foreign network. " +
        "Requires the port number for the local relay and remote relay name") {
    val localRelayAddress: String by argument()
    val externalStateAddress: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        val networkName = System.getenv("NETWORK_NAME") ?: "Corda_Network"
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            InteroperableHelper.interopFlow(
                rpc.proxy, 
                localRelayAddress, 
                externalStateAddress,
                networkName,
                config["RELAY_TLS"]!!.toBoolean(),
                config["RELAY_TLSCA_TRUST_STORE"]!!,
                config["RELAY_TLSCA_TRUST_STORE_PASSWORD"]!!,
                config["RELAY_TLSCA_CERT_PATHS"]!!
            ).fold({
                println("Error in Interop Flow: ${it.message}")
            }, {
                val linearId = it.toString()
                println("Interop flow successful and external-state was stored with linearId $linearId.\n")
                val value = InteroperableHelper.getExternalStatePayloadString(
                                rpc.proxy, 
                                linearId
                            )
        		val key = externalStateAddress.split(":").last()
        		val createdState = rpc.proxy.startFlow(::CreateState, key, value)
                            .returnValue.get().tx.outputStates.first() as SimpleState
        		println("Created simplestate: ${createdState}")
            })
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}

class GetExternalStateCommand : CliktCommand(help = "Get external state from vault. " +
        "Requires linearId") {
    val externalStateLinearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get states with key $externalStateLinearId")
        val rpc = NodeRPCConnection(
              host = config["CORDA_HOST"]!!,
              username = "clientUser1",
              password = "test",
              rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val payload = InteroperableHelper.getExternalStatePayloadString(
                            rpc.proxy, 
                            externalStateLinearId
                        )
            println("\nResponse Payload: ${payload}.\n")

            println("Signatures:")
            val signatories = InteroperableHelper.getExternalStateSignatories(
                            rpc.proxy, 
                            externalStateLinearId
                        )
            var i = 1
            for (id in signatories) {
                val signature = InteroperableHelper.getExternalStateSignature(rpc.proxy, externalStateLinearId, id)
                val certificate = InteroperableHelper.getExternalStateSignatoryCertificate(rpc.proxy, externalStateLinearId, id)
                println("${i}\tID: ${id}\n\tCert: ${certificate}\n\tSignature: ${signature}.\n")
                i += 1
            }

      } catch (e: Exception) {
          println(e.toString())
      } finally {
          rpc.close()
      }
    }
}
