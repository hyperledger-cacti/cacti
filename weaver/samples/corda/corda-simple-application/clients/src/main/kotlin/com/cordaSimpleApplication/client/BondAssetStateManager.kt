/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.cordaSimpleApplication.flow.IssueBondAssetState
import com.cordaSimpleApplication.flow.GetStatesByBondAssetType
import com.cordaSimpleApplication.flow.IssueBondAssetStateFromStateRef
import com.cordaSimpleApplication.flow.DeleteBondAssetState
import com.cordaSimpleApplication.flow.GetBondAssetStateByLinearId
import com.cordaSimpleApplication.flow.RetrieveBondAssetStateAndRef

import com.cordaSimpleApplication.flow.TransferBondAssetStateInitiator
import com.cordaSimpleApplication.state.BondAssetState
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import net.corda.core.identity.CordaX500Name
import java.lang.Exception
import net.corda.core.messaging.startFlow

class BondAssetCommand : CliktCommand(name = "bond", help ="Manages bond asset life cycle (e.g., issue, get, delete)") {
    override fun run() {
    }
}

/**
 * The CLI command used to trigger a IssueBondAssetState flow, that creates a non-fungible/bond asset.
 *
 * @property assetId The identifier for the [BondAssetState].
 * @property assetType The asset type for the [BondAssetState].
 */
class IssueBondAssetStateCommand : CliktCommand(name = "issue-asset", help = "Invokes the IssueBondAssetState flow. Requires a key and value") {
    private val assetId: String by argument()
    private val assetType: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        issueBondAssetStateHelper(assetId, assetType, config)
    }
}

/**
 * Helper function used by IssueBondAssetStateCommand
 */
fun issueBondAssetStateHelper(assetId: String, assetType: String, config: Map<String, String>) {
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        println("IssueBondAssetState flow with arguments, assetId: $assetId, assetType: $assetType")
        val proxy = rpc.proxy
        val createdState = proxy.startFlow(::IssueBondAssetState, assetId, assetType)
                .returnValue.get().tx.outputStates.first() as BondAssetState
        println(createdState)
    } catch (e: Exception) {
        println(e.toString())
    } finally {
        rpc.close()
    }
}

/**
 * The CLI command used to trigger a IssueBondAssetStateFromStateRef flow, that creates a non-fungible/bond asset from an existing state.
 *
 * @property linearId The identifier of an existing [BondAssetState] to clone from.
 */
class IssueBondAssetStateFromStateRefCommand : CliktCommand(name = "issue-asset-from-state-ref", help = "Invokes the IssueBondAssetStateFromStateRef flow. Requires a linearId") {
    private val linearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            println("IssueBondAssetStateFromStateRef flow with arguments, linearId: $linearId")
            val proxy = rpc.proxy
            val createdState = proxy.startFlow(::IssueBondAssetStateFromStateRef, linearId)
                .returnValue.get().tx.outputStates.first() as BondAssetState
            println(createdState)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}

/**
 * The CLI command used to trigger a GetStatesByBondAssetType flow.
 *
 * @property assetType The filter criteria for the [BondAssetState]s to be retrieved.
 */
class GetBondAssetStatesByTypeCommand : CliktCommand(name = "get-assets-by-type", help = "Get asset states by bond type. Requires a bond asset type") {
    private val assetType: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get states with type assetType: $assetType")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val states = proxy.startFlow(::GetStatesByBondAssetType, assetType)
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
 * The CLI command used to trigger a GetBondAssetStateByLinearId flow.
 *
 * @property linearId The identifier for the [BondAssetState] to be retrieved.
 */
class GetBondAssetStateByLinearIdCommand : CliktCommand(name = "get-asset-by-linear-id", help = "Gets asset state by linearId. Requires a linearId") {
    private val linearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Get state with linearId: $linearId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val state = proxy.startFlow(::GetBondAssetStateByLinearId, linearId)
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
 * The CLI command used to trigger a DeleteBondAssetState flow.
 *
 * @property linearId The identifier for the [BondAssetState] to be deleted.
 */
class DeleteBondAssetStateCommand : CliktCommand(name = "delete-asset", help = "Invokes the DeleteBondAssetState flow. Requires a linearId") {
    private val linearId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("DeleteBondAssetState flow with linearId: $linearId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val deletedState = proxy.startFlow(::DeleteBondAssetState, linearId)
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
 * The CLI command used to trigger a RetrieveBondAssetStateAndRef flow.
 *
 * @property assetType The asset type of [BondAssetState] to be retrieved.
 * @property assetId The identifier of bond/non-fungible asset [BondAssetState] to be retrieved.
 */
class RetrieveBondAssetStateAndRefCommand : CliktCommand(name = "retrieve-state-and-ref", help = "Invokes the RetrieveBondAssetStateAndRef flow. Requires asset type and id") {
    val assetType: String by argument()
    val assetId: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("RetrieveBondAssetStateAndRef flow with assetType: $assetType and assetId: $assetId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val stateAndRef = proxy.startFlow(::RetrieveBondAssetStateAndRef, assetType, assetId)
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
 * The CLI command used to trigger a TransferBondAssetStateInitiator flow.
 *
 * @property linearId The filter for the [BondAssetState] to be transferred.
 * @property otherParty The Party to whom the [BondAssetState] will be transferred to
 */
class TransferBondAssetStateCommand : CliktCommand(name = "transfer-asset", help = "Invokes the TransferBondAssetState flow. Requires a linearId and otherParty") {
    private val linearId: String by argument()
    private val partyName: String by argument()
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("TransferBondAssetState flow with linearId: $linearId")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val partyX500Name = CordaX500Name.parse(partyName)
            val otherParty = proxy.wellKnownPartyFromX500Name(partyX500Name) ?: return println("Party named $partyName cannot be found.\n")
            val outputStates = proxy.startFlow(::TransferBondAssetStateInitiator, linearId, otherParty)
                .returnValue.get().inputs
            println(outputStates)
        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}