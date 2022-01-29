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
import com.weaver.corda.app.interop.flows.GetAssetClaimStatusState
import com.weaver.corda.app.interop.flows.GetAssetClaimStatusStateByExpiryTimeSecs

import com.weaver.corda.sdk.AssetManager
import com.cordaSimpleApplication.state.AssetState
import com.cordaSimpleApplication.contract.AssetContract

import net.corda.samples.tokenizedhouse.flows.GetAssetClaimStatusByPledgeId
import net.corda.samples.tokenizedhouse.flows.GetAssetPledgeStatusByPledgeId
import net.corda.samples.tokenizedhouse.states.FungibleHouseTokenJson
import com.google.gson.Gson
import com.google.gson.GsonBuilder

import com.r3.corda.lib.tokens.contracts.commands.RedeemTokenCommand
import com.r3.corda.lib.tokens.contracts.commands.IssueTokenCommand
import net.corda.samples.tokenizedhouse.flows.RetrieveStateAndRef
import net.corda.samples.tokenizedhouse.flows.GetIssuedTokenType
import com.r3.corda.lib.tokens.contracts.FungibleTokenContract
import com.weaver.corda.app.interop.flows.RetrieveNetworkId
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

                val localNetworkId = rpc.proxy.startFlow(::RetrieveNetworkId).returnValue.get()
                println("localNetworkId: ${localNetworkId}")
                val remoteNetworkId = "891011121314"

                val assetJson = FungibleHouseTokenJson(
                    tokenType = params[0],
                    numUnits = params[1].toLong(),
                    owner = ""
                )
                println("Created house token asset ${assetJson}\n")
                val gson = GsonBuilder().create();
                var assetJsonBytes = gson.toJson(assetJson, FungibleHouseTokenJson::class.java)

                var obs = listOf<Party>()
                if (observer != null)   {
                   obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                if (fungible) {
                    id = AssetManager.createFungibleAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        remoteNetworkId,
                        params[0],          // Type
                        params[1].toLong(), // Quantity
                        assetJsonBytes,
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
                        localNetworkId!!,
                        remoteNetworkId,
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
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge/Linear Id for Asset Transfer Pledge State")
    val claimStatusLinearId: String? by option("-cid", "--claim-status-linear-id", help="Linear Id for interop-query external state")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (claimStatusLinearId == null) {
            println("Arguments required: --claim-status-linear-id.")
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
                    pledgeId!!,
                    IssueTokenCommand(issuedTokenType, listOf(0)),
                    claimStatusLinearId!!,
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
 * Command to claim a remotely pledged asset by an importing network as part of asset-transfer.
 */
class ClaimRemoteHouseTokenCommand : CliktCommand(name="claim-remote-asset", help = "Claims a remotel pledged asset.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge/Linear Id for Asset Transfer Pledge State")
    val pledgeStatusLinearId: String? by option("-psld", "--pledge-status-linear-id", help="Linear Id for interop-query external state")
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        println("Entered here..1")
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (pledgeStatusLinearId == null) {
            println("Arguments required: --pledge-status-linear-id.")
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
                println("param: ${param}")
                val params = param!!.split(":").toTypedArray()
                println("params[0]: ${params[0]} and params[1]: ${params[1]}")
                var obs = listOf<Party>()
                if (observer != null)   {
                    obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                val res = AssetManager.claimPledgedFungibleAsset(
                    rpc.proxy,
                    pledgeId!!,
                    pledgeStatusLinearId!!,
                    params[0],          // Type
                    params[1].toLong(), // Quantity
                    "net.corda.samples.tokenizedhouse.flows.GetTokenStateAndContractId",
                    IssueTokenCommand(issuedTokenType, listOf(0)),
                    issuer,
                    obs
                )
                println("Pledged asset claim response: ${res}")
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

/**
 * Fetch Asset Claim State for Transfer associated with contractId/pledgeId.
 */
class GetAssetClaimStatusByPledgeIdCommand : CliktCommand(name="get-claim-status-by-pledge-id", help = "Fetch asset Claim State associated with pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge Id for AssetClaimStatus State")
    val expiryTimeSecs: String? by option ("-t", "--expiry-time", help="Expiry Time in Epoch Secs for Pledge State")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (expiryTimeSecs == null) {
            println("Arguments required: --expiry-time.")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val proxy = rpc.proxy
                val assetClaimStatusStateBytes = proxy.startFlow(::GetAssetClaimStatusByPledgeId, pledgeId!!, expiryTimeSecs!!)
                    .returnValue.get()
                val charset = Charsets.UTF_8
                println("assetClaimStatusState: ${assetClaimStatusStateBytes.toString(charset)}")
                println("assetClaimStatusState: ${assetClaimStatusStateBytes.contentToString()}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Fetch Asset Claim State for Transfer associated with contractId/pledgeId.
 */
class GetAssetClaimStatusStateCommand : CliktCommand(name="get-claim-status-state", help = "Fetch Asset Claim Status state associated with pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="PledgeId for Pledge State")
    val expiryTimeSecs: String? by option ("-t", "--expiry-time", help="Expiry Time in Epoch Secs for Pledge State")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id")
        } else if (expiryTimeSecs == null) {
            println("Arguments required: --expiryTimeSecs")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val proxy = rpc.proxy
                val blankAssetJson = FungibleHouseTokenJson(
                    tokenType = "",
                    numUnits = 0L,
                    owner = ""
                )
                println("Created empty house token asset ${blankAssetJson}\n")
                val gson = GsonBuilder().create();
                var blankAssetJsonBytes = gson.toJson(blankAssetJson, FungibleHouseTokenJson::class.java)
                val assetClaimStatusStateBytes = proxy.startFlow(::GetAssetClaimStatusState, pledgeId!!, expiryTimeSecs!!, blankAssetJsonBytes)
                    .returnValue.get()
                println("assetClaimStatusStateBytes: ${assetClaimStatusStateBytes}")
                val charset = Charsets.UTF_8
                println("assetClaimStatusState: ${assetClaimStatusStateBytes.toString(charset)}")
                println("assetClaimStatusState: ${assetClaimStatusStateBytes.contentToString()}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

class GetAssetClaimStateWithExpiryTimeCommand : CliktCommand(name="get-claim-status-by-expirytime", help = "Fetch asset claim state with expirty time.") {
    val config by requireObject<Map<String, String>>()
    val expiryTimeSecs: String? by option ("-t", "--expiry-time", help="Expiry time in Epoch secs for claim state")
    override fun run() = runBlocking {
        if (expiryTimeSecs == null) {
            println("Arguments required: --expiry-time")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val proxy = rpc.proxy
                val assetClaimStatusStateBytes = proxy.startFlow(::GetAssetClaimStatusStateByExpiryTimeSecs, expiryTimeSecs!!)
                    .returnValue.get()
                println("assetClaimStatusStateBytes: ${assetClaimStatusStateBytes}")
                //val charset = Charsets.UTF_8
                //println("assetClaimStatusState: ${assetClaimStatusStateBytes.toString(charset)}")
                //println("assetClaimStatusState: ${assetClaimStatusStateBytes.contentToString()}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Fetch Asset Pledge State for Transfer associated with contractId/pledgeId.
 */
class GetAssetPledgeStatusByPledgeIdCommand : CliktCommand(name="get-pledge-status-by-pledge-id", help = "Fetch asset pledge state associated with pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge Id for Pledge State")
    val recipientNetworkId: String? by option ("-rnid", "--recipient-network-id", help="Importing network id of pledged asset for asset transfer")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (recipientNetworkId == null) {
            println("Arguments required: --recipient-network-id.")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val proxy = rpc.proxy
                val assetPledgeStatusBytes = proxy.startFlow(::GetAssetPledgeStatusByPledgeId, pledgeId!!, recipientNetworkId!!)
                    .returnValue.get()
                val charset = Charsets.UTF_8
                println("assetPledgeStatus: ${assetPledgeStatusBytes.toString(charset)}")
                println("assetPledgeStatus: ${assetPledgeStatusBytes.contentToString()}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}