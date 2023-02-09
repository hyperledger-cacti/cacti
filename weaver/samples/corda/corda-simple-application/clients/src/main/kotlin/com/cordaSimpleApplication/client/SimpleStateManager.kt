/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.cordaSimpleApplication.flow.*
import com.cordaSimpleApplication.state.SimpleState
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import java.lang.Exception
import net.corda.core.messaging.startFlow

/**
 * The CLI command used to trigger a CreateState flow.
 *
 * @property key The key for the [SimpleState].
 * @property value The value for the [SimpleState].
 */
class CreateStateCommand : CliktCommand(help = "Invokes the CreateState flow. Requires a key and value") {
    val key: String by argument()
    val value: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        createStateHelper(key, value, config)
    }
}

/**
 * Helper function used by CreateStateCommand
 */
fun createStateHelper(key: String, value: String, config: Map<String, String>) {
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        println("CreateState flow with arguments $key, $value")
        val proxy = rpc.proxy
        val createdState = proxy.startFlow(::CreateState, key, value)
                .returnValue.get().tx.outputStates.first() as SimpleState
        println(createdState)
    } catch (e: Exception) {
        println(e.toString())
    } finally {
        rpc.close()
    }
}

/**
 * The CLI command used to trigger an UpdateState flow.
 *
 * @property key The key for the [SimpleState].
 * @property value The new value for the [SimpleState].
 */
class UpdateStateCommand : CliktCommand(help = "Invokes the UpdateState flow. Requires a key and value") {
    val key: String by argument()
    val value: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("UpdateState flow with arguments $key, $value")
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val updatedState = proxy.startFlow(::UpdateState, key, value)
                    .returnValue.get().tx.outputStates.first() as SimpleState
            println(updatedState)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a DeleteState flow.
 *
 * @property key The key for the [SimpleState] to be deleted.
 */
class DeleteStateCommand : CliktCommand(help = "Invokes the DeleteState flow. Requires a key") {
    val key: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("DeleteState flow with key $key")
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val deletedState = proxy.startFlow(::DeleteState, key)
                    .returnValue.get().inputs.first()
            println(deletedState)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a GetStateByKey flow.
 *
 * @property key The key for the [SimpleState] to be retrieved.
 */
class GetStateCommand : CliktCommand(help = "Gets state by key. Requires a key") {
    val key: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get states with key $key")
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val states = proxy.startFlow(::GetStateByKey, key)
                    .returnValue.get()
            println(states.toString(Charsets.UTF_8))
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a GetStateByLinearId flow.
 *
 * @property linearId The linearId for the [SimpleState] to be retrieved.
 */
class GetStateUsingLinearIdCommand : CliktCommand(help = "Gets state by linearId. Requires a linearId") {
    val linearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get state with linearId $linearId")
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val state = proxy.startFlow(::GetStateByLinearId, linearId)
                    .returnValue.get()
            println(state)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger the GetStates flow.
 */
class GetStatesCommand : CliktCommand(help = "Gets all SimpleStates") {
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get states")
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val states = proxy.startFlow(::GetStates).returnValue.get()
            println(states)
        } catch (e: Exception) {
            println("Failed to create Corda Node RPC connection: $e")
        } finally {
            rpc.close()
        }
    }
}
