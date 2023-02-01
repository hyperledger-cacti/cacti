/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.cordaSimpleApplication.flow.IssueAssetState
import com.cordaSimpleApplication.flow.GetStatesByTokenType
import com.cordaSimpleApplication.flow.IssueAssetStateFromStateRef
import com.cordaSimpleApplication.flow.DeleteAssetState
import com.cordaSimpleApplication.flow.GetAssetStateByLinearId
import com.cordaSimpleApplication.flow.RetrieveStateAndRef
import com.cordaSimpleApplication.flow.MergeAssetStates
import com.cordaSimpleApplication.flow.SplitAssetState

import com.cordaSimpleApplication.flow.TransferAssetStateInitiator
import com.cordaSimpleApplication.state.AssetState
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import net.corda.core.identity.CordaX500Name
import java.lang.Exception
import net.corda.core.messaging.startFlow

/**
 * The CLI command used to trigger a CreateState flow.
 *
 * @property quantity The numberOfTokens for the [AssetState].
 * @property tokenType The tokenType for the [AssetState].
 */
class IssueAssetStateCommand : CliktCommand(help = "Invokes the IssueAssetState flow. Requires a key and value") {
    private val quantity: String by argument()
    private val tokenType: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        issueAssetStateHelper(quantity.toLong(), tokenType, config)
    }
}

/**
 * Helper function used by IssueAssetStateCommand
 */
fun issueAssetStateHelper(numberOfTokens: Long, tokenType: String, config: Map<String, String>) {
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        println("IssueAsset flow with arguments $numberOfTokens, $tokenType")
        val proxy = rpc.proxy
        val createdState = proxy.startFlow(::IssueAssetState, numberOfTokens, tokenType)
                .returnValue.get().tx.outputStates.first() as AssetState
        println(createdState)
    } catch (e: Exception) {
        println(e.toString())
    } finally {
        rpc.close()
    }
}

class IssueAssetStateFromStateRefCommand : CliktCommand(help = "Invokes the IssueAssetStateFromStateRef flow. Requires a linearId") {
    private val linearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            println("IssueAsset flow with arguments $linearId")
            val proxy = rpc.proxy
            val createdState = proxy.startFlow(::IssueAssetStateFromStateRef, linearId)
                .returnValue.get().tx.outputStates.first() as AssetState
            println(createdState)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a GetStatesByTokenType flow.
 *
 * @property tokenType The filter criteria for the [AssetState]s to be retrieved.
 */
class GetAssetStatesByTypeCommand : CliktCommand(help = "Get asset states by token type. Requires a token type") {
    private val tokenType: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get states with type $tokenType")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val states = proxy.startFlow(::GetStatesByTokenType, tokenType)
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
 * The CLI command used to trigger a GetAssetStateByLinearId flow.
 *
 * @property linearId The linearId for the [AssetState] to be retrieved.
 */
class GetAssetStateByLinearIdCommand : CliktCommand(help = "Gets asset state by linearId. Requires a linearId") {
    private val linearId: String by argument()
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
            val state = proxy.startFlow(::GetAssetStateByLinearId, linearId)
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
 * The CLI command used to trigger a DeleteAssetState flow.
 *
 * @property linearId The filter for the [AssetState] to be deleted.
 */
class DeleteAssetStateCommand : CliktCommand(help = "Invokes the DeleteAssetState flow. Requires a linearId") {
    private val linearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("DeleteAssetState flow with linearId $linearId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val deletedState = proxy.startFlow(::DeleteAssetState, linearId)
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
 * The CLI command used to trigger a MergeAssetStates flow.
 *
 * @property linearId1 The filter for the first token asset [AssetState] used in the merge operation.
 * @property linearId2 The filter for the second token asset [AssetState] used in the merge operation.
 */
class MergeAssetStatesCommand : CliktCommand(help = "Invokes the MergeAssetStates flow. Requires two linearIds") {
    private val linearId1: String by argument()
    private val linearId2: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("MergeAssetStates flow with linearIds $linearId1 and $linearId2")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val mergedState = proxy.startFlow(::MergeAssetStates, linearId1, linearId2)
                .returnValue.get().inputs.first()
            println(mergedState)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a RetrieveStateAndRef flow.
 *
 * @property tokenType The token type of [AssetState] to be retrieved.
 * @property quantity The number of fungible tokens in [AssetState] to be retrieved.
 */
class RetrieveAssetStateAndRefCommand : CliktCommand(help = "Invokes the RetrieveStateAndRef flow. Requires tokenType and quantity") {
    val tokenType: String by argument()
    val quantity: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("RetrieveStateAndRef flow with tokenType $tokenType and $quantity")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val stateAndRef = proxy.startFlow(::RetrieveStateAndRef, tokenType, quantity.toLong())
                .returnValue.get()
            println(stateAndRef.toString())
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}


/**
 * The CLI command used to trigger a SplitAssetState flow.
 *
 * @property linearId The filter for the [AssetState] to be split.
 * @property quantity1 The number of fungible tokens in the first [AssetState] created after split.
 * @property quantity2 The number of fungible tokens in the second [AssetState] created after split.
 */
class SplitAssetStateCommand : CliktCommand(help = "Invokes the SplitAssetState flow. Requires a linearId") {
    private val linearId: String by argument()
    private val quantity1: String by argument()
    private val quantity2: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("SplitAssetState flow with linearId $linearId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val outputStates = proxy.startFlow(::SplitAssetState, linearId, quantity1.toLong(), quantity2.toLong())
                .returnValue.get().inputs
            println(outputStates)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a TransferAssetStateInitiator flow.
 *
 * @property linearId The filter for the [AssetState] to be transferred.
 * @property otherParty The Party to whom the [AssetState] will be transferred to
 */
class TransferAssetStateCommand : CliktCommand(help = "Invokes the TransferAssetState flow. Requires a linearId and otherParty") {
    private val linearId: String by argument()
    private val partyName: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("TransferAssetState flow with linearId $linearId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val partyX500Name = CordaX500Name.parse(partyName)
            val otherParty = proxy.wellKnownPartyFromX500Name(partyX500Name) ?: return println("Party named $partyName cannot be found.\n")
            val outputStates = proxy.startFlow(::TransferAssetStateInitiator, linearId, otherParty)
                .returnValue.get().inputs
            println(outputStates)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}