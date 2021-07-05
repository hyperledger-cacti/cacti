/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import com.cordaSimpleApplication.flow.CreateState
import com.cordaSimpleApplication.state.SimpleState
import com.cordaInteropApp.flows.CreateExternalRequest
import com.cordaInteropApp.flows.WriteExternalStateInitiator
import com.cordaInteropApp.flows.GetExternalStateByLinearId
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import common.state.State
import io.grpc.ManagedChannelBuilder
import java.lang.Exception
import kotlinx.coroutines.*
import net.corda.core.messaging.startFlow
import networks.networks.Networks
import java.util.*
import org.json.JSONObject

import corda.ViewDataOuterClass

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
        val localRelayHost = localRelayAddress.split(":").first()
        val localRelayPort = localRelayAddress.split(":").last().toInt()
        val client = RelayClient(
                ManagedChannelBuilder.forAddress(localRelayHost, localRelayPort)
                        .usePlaintext()
                        .executor(Dispatchers.Default.asExecutor())
                        .build())
        runBlocking {
            val eitherErrorQuery = constructNetworkQuery(externalStateAddress, config["CORDA_HOST"]!!, config["CORDA_PORT"]!!.toInt())
            println("\nCorda network returned: $eitherErrorQuery \n")
            eitherErrorQuery.map { networkQuery ->
                println("Network query: $networkQuery")
                runBlocking {
                    val ack = async { client.requestState(networkQuery) }.await()
                    pollForState(ack.requestId, client).map {
                        writeExternalStateToVault(
                                it,
                                config["CORDA_HOST"]!!,
                                config["CORDA_PORT"]!!.toInt(),
                                externalStateAddress)
                    }
                }
            }
        }
    }
}

/**
 * The constructNetworkQuery function passes the address provided by the user to the interoperation CorDapp
 * to get the external network's endorsement policy, and to provide a signature and certificate for the
 * external network to authenticate the request.
 *
 * @property address The address of the view provided by the user.
 * @property host The hostname of the Corda node.
 * @property port The port of the Corda node.
 * @property rpc The Corda node RPC connection.
 * @property proxy The proxy to the Corda node RPC connection.
 * @return Returns an Either with an error if the RPC connection failed or the interop flow failed, or a NetworkQuery.
 */
suspend fun constructNetworkQuery(address: String, host: String, port: Int): Either<Error, Networks.NetworkQuery> {
    println("Getting query information for foreign network from Corda network")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    try {
        val proxy = rpc.proxy
        val eitherErrorRequest = proxy.startFlow(::CreateExternalRequest, address)
                .returnValue.get().map {
                    Networks.NetworkQuery.newBuilder()
                            .addAllPolicy(it.policy)
                            .setAddress(address)
                            .setRequestingRelay("")
                            .setRequestingNetwork("Corda_Network")
                            .setCertificate(it.certificate)
                            .setRequestorSignature(it.signature)
                            .setRequestingOrg(it.requestingOrg)
                            .setNonce(it.nonce)
                            .build()
                }
        return eitherErrorRequest
    } catch (e: Exception) {
        return Left(Error("Corda Network Error: ${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * pollForState is used to poll the local relay for the requested state. This is a recursive function that continues
 * to poll if the returned state is "PENDING" or "PENDING_ACK" or returns the "COMPLETED" or "ERROR" state.
 *
 * @property requestId The requestId for the original request.
 * @property client The gRPC client for the relay.
 * @property requestState The state response from the relay.
 * Will have status "PENDING", "PENDING_ACK", "COMPLETED" or "ERROR".
 * @return Returns the request state when it has status "COMPLETED" or "ERROR".
 */
suspend fun pollForState(requestId: String, client: RelayClient, retryCount: Int = 0): Either<Error, State.RequestState> = coroutineScope {
    val num = 10
    if (retryCount > num) {
        Left(Error("Error: Timeout, remote network took longer than $num seconds to respond"))
    } else {
        delay(1000L)
        val requestState = async { client.getState(requestId) }.await()
        println("Response from getState: $requestState")
        when (requestState.status.toString()) {
            "COMPLETED" -> Right(requestState)
            "PENDING" -> async { pollForState(requestId, client, retryCount + 1) }.await()
            "PENDING_ACK" -> async { pollForState(requestId, client, retryCount + 1) }.await()
            "ERROR" -> {
                println("Error returned from the remote network: $requestState")
                Left(Error("Error returned from remote network $requestState"))
            }
            else -> Left(Error("Unexpected status returned in RequestState"))
        }
    }
}

/**
 * writeExternalStateToVault is used to trigger the interoperation CorDapp to store the requested state in the ledger.
 *
 * @property requestState The state that is returned by the external network.
 * @property host The host of the Corda node to connect to.
 * @property port The port of the Corda node to connect to.
 * @property rpc The Corda node RPC connection.
 * @property stateId The linearId of the state stored in the Corda ledger.
 * @property proxy The proxy to the Corda node RPC connection.
 * @return Returns an Either with an error if the RPC connection failed or the Corda network returned an error, else
 * the unique identifier of the stored state.
 */
fun writeExternalStateToVault(
    requestState: State.RequestState,
    host: String,
    port: Int,
    address: String
): Either<Error, String> {
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Sending response to Corda for view verification.\n")
        val proxy = rpc.proxy
        val stateId = runCatching {
            val viewBase64String = Base64.getEncoder().encodeToString(requestState.view.toByteArray())
            proxy.startFlow(::WriteExternalStateInitiator, viewBase64String, address)
                    .returnValue.get()
        }.fold({
            it.map { linearId ->
                println("Verification was successful and external-state was stored with linearId $linearId.\n")

		val response = proxy.startFlow(::GetExternalStateByLinearId, linearId.toString()).returnValue.get()
        val responseView = ViewDataOuterClass.ViewData.parseFrom(response)
        val value = responseView.payload.toStringUtf8()
		val key = address.split(":").last()
		val createdState = proxy.startFlow(::CreateState, key, value)
                    .returnValue.get().tx.outputStates.first() as SimpleState
		println("Created simplestate: ${createdState}")
		println("LinearId ${createdState.linearId} can be used to fetch the requested state from the CorDapp simplestate vault")

                linearId.toString()
            }
        }, {
            Left(Error("Corda Network Error: Error running WriteExternalStateInitiator flow: ${it.message}\n"))
        })
        stateId
    } catch (e: Exception) {
        println("Error writing state to Corda network: ${e.message}\n")
        Left(Error("Error writing state to Corda network: ${e.message}"))
    } finally {
        rpc.close()
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
          val proxy = rpc.proxy
          val response = proxy.startFlow(::GetExternalStateByLinearId, externalStateLinearId)
                  .returnValue.get()
          val responseView = ViewDataOuterClass.ViewData.parseFrom(response)
          
          val payload = responseView.payload.toStringUtf8()
          
          println("Response Payload: ${payload}.\n")
          
          println("Signatures:")
          var i = 1
          for (notarization in responseView.notarizationsList) {
              val id = notarization.id
              val certificate = notarization.certificate
              val signature = notarization.signature
              println("${i}\tID: ${id}\n\tCert: ${certificate}\n\tSignature: ${signature}.\n")
              i += 1
          }          
          
          // val responseString = response.toString(Charsets.UTF_8)
          // val responseJSON = JSONObject(responseString)
          // 
          // val payload = responseJSON.getString("payload")
          // println("Response Payload: ${payload}.\n")
          // 
          // val proofMessage = responseJSON.getString("proofmessage")
          // println("Proof Message: ${proofMessage}.\n")
          // 
          // println("Signatures:")
          // val signatures = responseJSON.getJSONArray("signatures")
          // for (i in 0 until signatures.length()) {
          //     val proofSignature = signatures.getJSONObject(i)
          //     val id = proofSignature.getString("id")
          //     val certificate = proofSignature.getString("certificate")
          //     val signature = proofSignature.getString("signature")
          //     println("${i}\tID: ${id}\n\tCert: ${certificate}\n\tSignature: ${signature}.\n")
          // }
      } catch (e: Exception) {
          println(e.toString())
      } finally {
          rpc.close()
      }
    }
}
