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
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.default
import java.io.File
import java.lang.Exception
import kotlinx.coroutines.runBlocking
import net.corda.core.messaging.startFlow
import com.google.protobuf.util.JsonFormat
import java.util.Base64
import java.util.Calendar
import net.corda.core.utilities.OpaqueBytes
import net.corda.core.crypto.sha256
import java.time.Instant

import com.weaver.corda.sdk.AssetManager
import com.cordaSimpleApplication.state.AssetState
import com.cordaSimpleApplication.contract.AssetContract

import com.r3.corda.lib.tokens.contracts.commands.RedeemTokenCommand
import com.r3.corda.lib.tokens.contracts.commands.IssueTokenCommand
import net.corda.samples.tokenizedhouse.flows.RetrieveStateAndRef
import net.corda.samples.tokenizedhouse.flows.GetIssuedTokenType
import com.r3.corda.lib.tokens.contracts.FungibleTokenContract
import net.corda.core.identity.CordaX500Name
import net.corda.core.identity.Party


/**
 * Command to pledge an asset.
 * pledge --hash=hash --timeout=timeout --recipient="O=PartyB,L=London,C=GB" --param=type:id ----> non-fungible
 * pledge --fungible --timeout=timeout --recipient="O=PartyB,L=London,C=GB" --param=type:amount ----> fungible
 */
class PledgeHouseTokenCommand : CliktCommand(name="pledge",
        help = "Locks an asset. lock --fungible --timeout=10 --recipient='O=PartyB,L=London,C=GB' --param=type:amount ") {
    val config by requireObject<Map<String, String>>()
    val timeout: String? by option("-t", "--timeout", help="Timeout duration in seconds.")
    val recipient: String? by option("-r", "--recipient", help="Party Name for recipient")
    val fungible: Boolean by option("-f", "--fungible", help="Fungible Asset Pledge: True/False").flag(default = false)
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        if (recipient == null || param == null) {
            println("One of Recipient, or param argument is missing.")
        } else {
            var nTimeout: Long
            if (timeout == null) {
                nTimeout = 10L
            } else {
                nTimeout = timeout!!.toLong()
            }
            println("nTimeout: $nTimeout")
            val calendar = Calendar.getInstance()
            nTimeout += calendar.timeInMillis / 1000
            println("nTimeout: $nTimeout")
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val params = param!!.split(":").toTypedArray()
                var id: Any
                val issuer = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse("O=PartyA,L=London,C=GB"))!!
                val issuedTokenType = rpc.proxy.startFlow(::GetIssuedTokenType, "house").returnValue.get()
                println("TokenType: $issuedTokenType")
                var obs = listOf<Party>()
                if (observer != null)   {
                   obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                if (fungible) {
                    id = AssetManager.createFungibleAssetPledge(
                        rpc.proxy,
                        "1234567",
                        "891011121314",
                        params[0],          // Type
                        params[1].toLong(), // Quantity
                        recipient!!, 
                        nTimeout,
                        "net.corda.samples.tokenizedhouse.flows.RetrieveStateAndRef",
                        RedeemTokenCommand(issuedTokenType, listOf(0), listOf()),
                        issuer,
                        obs
                    )
                } else {
                    id = AssetManager.createAssetPledge(
                        rpc.proxy,
                        "1234567",
                        "891011121314",
                        params[0],      // Type
                        params[1],      // ID
                        recipient!!, 
                        nTimeout,
                        "com.cordaSimpleApplication.flow.RetrieveStateAndRef",
                        AssetContract.Commands.Delete(),
                        issuer,
                        obs
                    )
                }
                println("Asset Pledge State created with contract ID ${id}.")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Command to reclaim a pledged asset after timeout.
 */
class ReclaimHouseTokenCommand : CliktCommand(name="reclaim-pledged-asset", help = "Reclaims a pledged asset after timeout.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for Asset Transfer Pledge State")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        if (contractId == null) {
            println("Arguments required: --contract-id.")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val issuer = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse("O=PartyA,L=London,C=GB"))!!
                val issuedTokenType = rpc.proxy.startFlow(::GetIssuedTokenType, "house").returnValue.get()
                println("TokenType: $issuedTokenType")
                var obs = listOf<Party>()
                if (observer != null)   {
                    obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                val res = AssetManager.reclaimPledgedAsset(
                    rpc.proxy,
                    contractId!!,
                    IssueTokenCommand(issuedTokenType, listOf(0)),
                    issuer,
                    obs
                )
                println("Pledged Asset Reclaim Response: ${res}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Query pledge status of an asset for asset-transfer.
 */
class IsHouseTokenPledgedCommand : CliktCommand(name="is-pledged", help = "Query pledge status of an asset, given contractId.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for Asset Transfer Pledge State")
    override fun run() = runBlocking {
        if (contractId == null) {
            println("Arguments required: --contract-id.")
        } else {        
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val res = AssetManager.isAssetPledgedForTransfer(
                    rpc.proxy, 
                    contractId!!
                )
                println("Is Asset Pledged for Transfer Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}
/**
 * Fetch Asset Pledge State for Transfer associated with contractId.
 */
class GetHouseTokenPledgeStateCommand : CliktCommand(name="get-pledge-state", help = "Fetch asset Pledge State associated with contractId.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for Pledge State")
    override fun run() = runBlocking {
        if (contractId == null) {
            println("Arguments required: --contract-id.")
        } else {
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val res = AssetManager.readPledgeStateByContractId(
                    rpc.proxy, 
                    contractId!!
                )
                println("Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}
