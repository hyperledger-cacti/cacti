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
import net.corda.core.utilities.OpaqueBytes
import net.corda.core.crypto.sha256
import java.time.Instant
import net.corda.core.identity.CordaX500Name

import com.weaver.corda.sdk.AssetManager
import com.cordaSimpleApplication.state.AssetState
import com.cordaSimpleApplication.contract.AssetContract
import java.util.Calendar
import com.weaver.corda.app.interop.flows.RetrieveNetworkId
import com.weaver.corda.app.interop.flows.IsRemoteAssetClaimedEarlier
import com.cordaSimpleApplication.flow.GetAssetPledgeStatusByPledgeId
import com.cordaSimpleApplication.flow.MarshalFungibleToken
import com.cordaSimpleApplication.flow.GetOurCertificateBase64
import com.cordaSimpleApplication.flow.GetOurIdentity
import net.corda.core.identity.Party

/**
 * Command to pledge an asset.
 * pledge-asset --timeout=120 -rnid Corda_Network2 --recipient='<base64 certificate>' --param=type:id ----> non-fungible
 * pledge-asset --fungible --timeout=120 -rnid Corda_Network2 --recipient='<base64 certificate>' --param=type:amount ----> fungible
 */
class PledgeAssetCommand : CliktCommand(name="pledge-asset",
        help = "Locks an asset. $ ./clients pledge-asset --fungible --timeout=10 --recipient='<base64 certificate>' --param=type:amount") {
    val config by requireObject<Map<String, String>>()
    val timeout: String? by option("-t", "--timeout", help="Timeout duration in seconds.")
    val remoteNetworkId: String? by option("-rnid", "--remote-network-id", help="Importing network for asset transfer")
    val recipientCert: String? by option("-r", "--recipient", help="Recipient party certificate in base64 format")
    val fungible: Boolean by option("-f", "--fungible", help="Fungible Asset Pledge: True/False").flag(default = false)
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        if (recipientCert == null) {
            println("Arguement -r (recipient certificate in base64) is required")
        } else if (param == null) {
            println("Arguement -p (asset details to be pledged) is required")
        } else if (remoteNetworkId == null) {
            println("Arguement -rnid (remote/importing network id) is required")
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
                
                val localNetworkId = rpc.proxy.startFlow(::RetrieveNetworkId).returnValue.get()
                println("localNetworkId: ${localNetworkId}")

                var assetJsonBytes = rpc.proxy.startFlow(::MarshalFungibleToken, params[0], params[1].toLong()).returnValue.get()
                val thisPartyName = rpc.proxy.startFlow(::GetOurIdentity).returnValue.get()
                 // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
                 // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
                 // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
                val thisParty = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(thisPartyName))!!

                var obs = listOf<Party>()
                if (observer != null)   {
                   obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                if (fungible) {
                    id = AssetManager.createFungibleAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        remoteNetworkId!!,
                        params[0],          // Type
                        params[1].toLong(), // Quantity
                        assetJsonBytes,
                        recipientCert!!,
                        nTimeout,
                        "com.cordaSimpleApplication.flow.RetrieveStateAndRef",
                        AssetContract.Commands.Delete(),
                        thisParty,
                        obs
                    )
                } else {
                    id = AssetManager.createAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        remoteNetworkId!!,
                        params[0],      // Type
                        params[1],      // ID
                        recipientCert!!,
                        nTimeout,
                        "com.cordaSimpleApplication.flow.RetrieveStateAndRef",
                        AssetContract.Commands.Delete(),
                        thisParty,
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
 * Query pledge status of an asset for asset-transfer.
 */
class IsAssetPledgedCommand : CliktCommand(name="is-asset-pledged", help = "Query pledge status of an asset, given pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Linear id for asset transfer pledge state")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else {        
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val res = AssetManager.isAssetPledgedForTransfer(
                    rpc.proxy, 
                    pledgeId!!
                )
                println("Is asset pledged for transfer response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}
/**
 * Fetch asset pledge state for transfer associated with pledgeId.
 */
class GetAssetPledgeStateCommand : CliktCommand(name="get-asset-pledge-state", help = "Fetch asset pledge state associated with pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Linear Id for asset pledge state")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else {
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val res = AssetManager.readPledgeStateByContractId(
                    rpc.proxy, 
                    pledgeId!!
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
 * Command to fetch the certificate (in base64) of the party owning the node.
 */
class FetchCertBase64AssetCommand : CliktCommand(name="get-cert-base64-asset", help = "Obtain the certificate of the party owning a node in base64 format.") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {

        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val certBase64 = rpc.proxy.startFlow(::GetOurCertificateBase64).returnValue.get()
            println("Certificate in base64: $certBase64")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}

/**
 * Command to reclaim a pledged asset after timeout.
 */
class ReclaimAssetCommand : CliktCommand(name="reclaim-pledged-asset", help = "Reclaims a pledged asset after timeout.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge/Linear id for asset transfer pledge state")
    val claimStatusLinearId: String? by option("-cid", "--claim-status-linear-id", help="Linear id for interop-query external state")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer (e.g., 'O=PartyA,L=London,C=GB')")
    override fun run() = runBlocking {
        println("Came here..1")
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (claimStatusLinearId == null) {
            println("Arguments required: --claim-status-linear-id.")
        } else {
            println("Came here..2")
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            val thisPartyName = rpc.proxy.startFlow(::GetOurIdentity).returnValue.get()
                 // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
                 // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
                 // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
            val thisParty = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(thisPartyName))!!
            try {
                var obs = listOf<Party>()
                if (observer != null)   {
                    obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                println("Came here..3")
                val res = AssetManager.reclaimPledgedAsset(
                    rpc.proxy,
                    pledgeId!!,
                    AssetContract.Commands.Issue(),
                    claimStatusLinearId!!,
                    thisParty,
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
class ClaimRemoteAssetCommand : CliktCommand(name="claim-remote-asset", help = "Claims a remote pledged asset.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge/Linear id for asset transfer pledge state")
    val pledgeStatusLinearId: String? by option("-psld", "--pledge-status-linear-id", help="Linear id for interop-query external state")
    val lockerCert: String? by option("-lc", "--locker-certificate", help="Certificate of the party in the exporting network owning the asset pledged")
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer (e.g., 'O=PartyA,L=London,C=GB')")
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
                val thisPartyName = rpc.proxy.startFlow(::GetOurIdentity).returnValue.get()
                 // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
                 // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
                 // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
                val thisParty = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(thisPartyName))!!
                val recipientCert = rpc.proxy.startFlow(::GetOurCertificateBase64).returnValue.get()
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
                    lockerCert!!,
                    recipientCert,
                    "com.cordaSimpleApplication.flow.GetSimpleAssetStateAndContractId",
                    AssetContract.Commands.Issue(),
                    thisParty,
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
 * Fetch AssetClaimStatusState in the importing network as part of transfer of an asset with the input pledgeId.
 */
class GetSimpleAssetClaimStatusByPledgeIdCommand : CliktCommand(name="get-claim-status-by-pledge-id", help = "Fetch asset Claim State associated with pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge Id for AssetClaimStatusState on the ledger")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val proxy = rpc.proxy
                val assetClaimStatusState = proxy.startFlow(::IsRemoteAssetClaimedEarlier, pledgeId!!)
                    .returnValue.get()
                if (assetClaimStatusState == null) {
                    println("Asset with pledgeId ${pledgeId} is not claimed yet.")
                } else {
                    println("Asset with pledgeId ${pledgeId} is claimed and assetClaimStatusState: ${assetClaimStatusState}")
                }
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
class GetSimpleAssetPledgeStatusByPledgeIdCommand : CliktCommand(name="get-pledge-status-by-pledge-id", help = "Fetch asset pledge state associated with pledgeId.") {
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