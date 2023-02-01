/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.weaver.corda.app.interop.flows.CreateNetworkIdState
import com.weaver.corda.app.interop.flows.RetrieveNetworkIdStateAndRef
import com.cordaSimpleApplication.flow.TransferAssetStateInitiator
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.default
import net.corda.core.identity.CordaX500Name
import net.corda.core.identity.Party
import com.weaver.corda.app.interop.states.NetworkIdState
import java.lang.Exception
import net.corda.core.messaging.startFlow

class NetworkIdCommand : CliktCommand(name = "network-id", help ="Manages the network id of corda network") {
    override fun run() {
    }
}

/**
 * The CLI command used to trigger a CreateNetworkIdState flow.
 *
 * @property memberstring The ';' delimeter string of network members for the [NetworkIdState].
 */
class CreateNetworkIdStateCommand : CliktCommand(name="create-state", help = "Invokes the CreateNetworkIdState. Requires an id to be passed") {
    private val memberstring: String? by option("-m", "--members", help="Names of parities that are network members")
    val config by requireObject<Map<String, String>>()
    override fun run() {
        if (memberstring == null) {
            println("Arguments required: --members.")
        }
        createNetworkIdStateHelper(config["NETWORK_NAME"]!!, memberstring!!, config)
    }
}

/**
 * Helper function used by CreateNetworkIdStateCommand
 */
fun createNetworkIdStateHelper(networkId: String, memberstring: String, config: Map<String, String>) {
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        println("CreateNetworkIdState flow with arguments $networkId, $memberstring")
        val proxy = rpc.proxy
        var members = listOf<Party>()
        val networkmembers = memberstring.split(";").toTypedArray();
        networkmembers.forEach {
            members += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(it))!!
        }
        val createdState = proxy.startFlow(::CreateNetworkIdState, networkId, members)
                .returnValue.get().tx.outputStates.first() as NetworkIdState
        println(createdState)
    } catch (e: Exception) {
        println(e.toString())
    } finally {
        rpc.close()
    }
}

/**
 * The CLI command used to trigger a RetrieveNetworkIdStateAndRef flow.
 */
class RetrieveNetworkIdStateAndRefCommand : CliktCommand(name="retrieve-state-and-ref", help = "Invokes the RetrieveNetworkIdStateAndRef flow.") {
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("RetrieveNetworkIdStateAndRef flow")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val stateAndRef = proxy.startFlow(::RetrieveNetworkIdStateAndRef)
                .returnValue.get()
            println(stateAndRef.toString())
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}