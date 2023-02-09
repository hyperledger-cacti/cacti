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
import org.json.JSONObject
import net.corda.core.messaging.CordaRPCOps
import kotlinx.coroutines.runBlocking
import kotlin.system.exitProcess
import net.corda.core.messaging.startFlow
import java.util.Base64
import net.corda.core.identity.CordaX500Name
import com.weaver.corda.sdk.AssetTransferSDK
import com.weaver.corda.sdk.InteroperableHelper
import com.cordaSimpleApplication.contract.AssetContract
import com.cordaSimpleApplication.contract.BondAssetContract
import java.util.Calendar
import com.weaver.corda.app.interop.flows.RetrieveNetworkId
import com.weaver.corda.app.interop.flows.GetAssetPledgeStatus
import com.weaver.corda.app.interop.states.AssetPledgeState
import com.cordaSimpleApplication.flow.GetAssetClaimStatusByPledgeId
import com.cordaSimpleApplication.flow.GetBondAssetPledgeStatusByPledgeId
import com.cordaSimpleApplication.flow.GetBondAssetClaimStatusByPledgeId
import com.cordaSimpleApplication.flow.GetAssetPledgeStatusByPledgeId
import net.corda.core.identity.Party

class AssetTransferCommand : CliktCommand(name = "transfer", help ="Manages simple asset transfer") {
    override fun run() {
    }
}

/**
 * Command to pledge an asset.
 * transfer pledge-asset --timeout=120 -rnid 'Corda_Network2' -nrid 'Corda_Network2' --recipient='<name of the recipient>' --param=type:id ----> non-fungible
 * transfer pledge-asset --fungible --timeout=120 -rnid Corda_Network2 --recipient='<name of the recipient>' --param=type:amount ----> fungible
 */
class PledgeAssetCommand : CliktCommand(name="pledge-asset",
        help = "Locks an asset. $ ./clients transfer pledge-asset --fungible --timeout=10 -rnid 'Corda_Network2' --recipient='<name of recipient>' --param=type:amount") {
    val config by requireObject<Map<String, String>>()
    val timeout: String? by option("-t", "--timeout", help="Pledge validity time duration in seconds.")
    val importNetworkId: String? by option("-inid", "--import-network-id", help="Importing network for asset transfer")
    val recipient: String? by option("-r", "--recipient", help="Name of the recipient in the importing network")
    val fungible: Boolean by option("-f", "--fungible", help="Fungible Asset Pledge: True/False").flag(default = false)
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        if (recipient == null) {
            println("Arguement -r (name of the recipient in importing n/w) is required")
        } else if (param == null) {
            println("Arguement -p (asset details to be pledged) is required")
        } else if (importNetworkId == null) {
            println("Arguement -inid (importing/remote network id) is required")
        } else {
            var nTimeout: Long
            if (timeout == null) {
                nTimeout = 300L
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
                var result: Either<Error, String>
                
                val localNetworkId = rpc.proxy.startFlow(::RetrieveNetworkId).returnValue.get()
                println("localNetworkId: ${localNetworkId}")

                 // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
                 // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
                 // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
                val thisParty: Party = rpc.proxy.nodeInfo().legalIdentities.get(0)

                var obs = listOf<Party>()
                if (observer != null)   {
                   obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }

                // Obtain the recipient certificate from the name of the recipient
                val recipientCert: String = getUserCertFromFile(recipient!!, importNetworkId!!)

                if (fungible) {
                    result = AssetTransferSDK.createFungibleAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        importNetworkId!!,
                        params[0],          // Type
                        params[1].toLong(), // Quantity
                        recipientCert,
                        nTimeout,
                        "com.cordaSimpleApplication.flow.RetrieveStateAndRef",
                        AssetContract.Commands.Delete(),
                        thisParty,
                        obs
                    )
                } else {
                    result = AssetTransferSDK.createAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        importNetworkId!!,
                        params[0],      // Type
                        params[1],      // ID
                        recipientCert,
                        nTimeout,
                        "com.cordaSimpleApplication.flow.RetrieveBondAssetStateAndRef",
                        BondAssetContract.Commands.Delete(),
                        thisParty,
                        obs
                    )
                }
                
                when (result) {
                    is Either.Left -> {
                        println("Corda Network Error: Error running PledgeAsset flow: ${result.a.message}\n")
                        throw IllegalStateException("Corda Network Error: Error running PledgeAsset flow: ${result.a.message}\n")
                    }
                    is Either.Right -> {
                        println("AssetPledgeState created with pledge-id '${result.b}'")
                    }
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
                val res = AssetTransferSDK.isAssetPledgedForTransfer(
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
class GetAssetPledgeStateCommand : CliktCommand(name="get-pledge-state", help = "Fetch asset pledge state associated with pledgeId.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge id for asset pledge state")
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
                val res = AssetTransferSDK.readPledgeStateByPledgeId(
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
 * Command to reclaim a pledged asset after timeout.
 */
class ReclaimAssetCommand : CliktCommand(name="reclaim-pledged-asset", help = "Reclaims a pledged asset after timeout.") {
    val config by requireObject<Map<String, String>>()
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge id for asset transfer pledge state")
    val transferCategory: String? by option("-tc", "--transfer-category", help="transferCategory is input in the format: 'asset_type.remote_network_type'."
        + " 'asset_type' can be either 'bond', 'token' or 'house-token'."
        + " 'remote_network_type' can be either 'fabric', 'corda' or 'besu'.")
    val importNetworkId: String? by option ("-inid", "--import-network-id", help="Import network id of pledged asset for asset transfer")
    val exportRelayAddress: String? by option ("-era", "--export-relay-address", help="Asset export network relay address")
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer (e.g., 'O=PartyA,L=London,C=GB')")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (transferCategory == null) {
            println("Arguments required: --transfer-category.")
        } else if (importNetworkId == null) {
            println("Arguments required: --import-network-id.")
        } else if (exportRelayAddress == null) {
            println("Arguments required: --export-relay-address.")
        } else if (param == null) {
            println("Arguments required: --param.")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
            // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
            // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
            val thisParty: Party = rpc.proxy.nodeInfo().legalIdentities.get(0)

            val params = param!!.split(":").toTypedArray()
            if (params.size != 2) {
                println("Invalid argument --param $param")
                throw IllegalStateException("Invalid argument --param $param")
            }

            try {
                var assetPledgeState: AssetPledgeState
                when (val result: Either<Error, AssetPledgeState> = AssetTransferSDK.getAssetPledgeStatus(rpc.proxy, pledgeId!!, importNetworkId!!)) {
                    is Either.Left -> {
                        println("Corda Network Error: Error running GetAssetPledgeStatus flow: ${result.a.message}\n")
                        throw IllegalStateException("Corda Network Error: Error running GetAssetPledgeStatus flow: ${result.a.message}\n")
                    }
                    is Either.Right -> {
                        assetPledgeState = result.b
                    }
                }

                var externalStateAddress: String = getReclaimViewAddress(transferCategory!!, params[0], params[1], pledgeId!!,
                assetPledgeState.lockerCert, assetPledgeState.localNetworkId, assetPledgeState.recipientCert,
                importNetworkId!!, assetPledgeState.expiryTimeSecs.toString())

                //val networkConfig: JSONObject = getRemoteNetworkConfig(assetPledgeState.localNetworkId)
                //val exportRelayAddress: String = networkConfig.getString("relayEndpoint")
                val claimStatusLinearId: String = requestStateFromRemoteNetwork(exportRelayAddress!!, externalStateAddress, rpc.proxy, config)

                var obs = listOf<Party>()
                if (observer != null)   {
                    obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                var res: Any

                if (transferCategory!!.contains("token.")) {
                    res = AssetTransferSDK.reclaimPledgedAsset(
                        rpc.proxy,
                        pledgeId!!,
                        AssetContract.Commands.Issue(),
                        claimStatusLinearId,
                        thisParty,
                        obs
                    )
                } else {
                    res = AssetTransferSDK.reclaimPledgedAsset(
                        rpc.proxy,
                        pledgeId!!,
                        BondAssetContract.Commands.Issue(),
                        claimStatusLinearId,
                        thisParty,
                        obs
                    )
                }

                println("Pledged Asset Reclaim Response: ${res}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
                // exit the process throwing error code
                exitProcess(1)
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
    val locker: String? by option("-l", "--locker", help="Name of the party in the exporting network owning the asset pledged")
    val transferCategory: String? by option("-tc", "--transfer-category", help="transferCategory is input in the format: 'asset_type.remote_network_type'."
        + " 'asset_type' can be either 'bond', 'token' or 'house-token'."
        + " 'remote_network_type' can be either 'fabric', 'corda' or 'besu'.")
    val exportNetworkId: String? by option ("-enid", "--export-network-id", help="Export network id of pledged asset for asset transfer")
    val importRelayAddress: String? by option ("-ira", "--import-relay-address", help="Import network relay address")
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer (e.g., 'O=PartyA,L=London,C=GB')")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (locker == null) {
            println("Arguments required: --locker.")
        } else if (transferCategory == null) {
            println("Arguments required: --transfer-category.")
        } else if (exportNetworkId == null) {
            println("Arguments required: --export-network-id.")
        } else if (importRelayAddress == null) {
            println("Arguments required: --import-relay-address.")
        } else if (param == null) {
            println("Arguments required: --param.")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
                // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
                // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
                val thisParty: Party = rpc.proxy.nodeInfo().legalIdentities.get(0)
                val recipientCert: String = fetchCertBase64Helper(rpc.proxy)
                val params = param!!.split(":").toTypedArray()
                if (params.size != 2) {
                    println("Invalid argument --param $param")
                    throw IllegalStateException("Invalid argument --param $param")
                }
                println("params[0]: ${params[0]} and params[1]: ${params[1]}")
                var obs = listOf<Party>()
                if (observer != null)   {
                    obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }

                // Obtain the locker certificate from the name of the locker
                val lockerCert: String = getUserCertFromFile(locker!!, exportNetworkId!!)

                val importNetworkId: String? = rpc.proxy.startFlow(::RetrieveNetworkId).returnValue.get()
                var externalStateAddress: String = getClaimViewAddress(transferCategory!!, pledgeId!!, lockerCert, exportNetworkId!!, recipientCert, importNetworkId!!)

                // 1. While exercising 'data transfer' initiated by a Corda network, the localRelayAddress is obtained directly from user.
                // 2. While exercising 'asset transfer' initiated by a Fabric network, the localRelayAddress is obtained from config.json file
                // 3. While exercising 'asset transfer' initiated by a Corda network (this case), the localRelayAddress is obtained
                //    below from the remote-network-config.json file
                //val networkConfig: JSONObject = getRemoteNetworkConfig(importNetworkId)
                //val importRelayAddress: String = networkConfig.getString("relayEndpoint")
                val pledgeStatusLinearId: String = requestStateFromRemoteNetwork(importRelayAddress!!, externalStateAddress, rpc.proxy, config)

                var res: Any
                if (transferCategory!!.contains("token.")) {
                    res = AssetTransferSDK.claimPledgedFungibleAsset(
                        rpc.proxy,
                        pledgeId!!,
                        pledgeStatusLinearId,
                        params[0],          // Type
                        params[1].toLong(), // Quantity
                        lockerCert,
                        recipientCert,
                        "com.cordaSimpleApplication.flow.GetSimpleAssetStateAndContractId",
                        AssetContract.Commands.Issue(),
                        thisParty,
                        obs
                    )
                } else {
                    res = AssetTransferSDK.claimPledgedAsset(
                        rpc.proxy,
                        pledgeId!!,
                        pledgeStatusLinearId,
                        params[0], // Type
                        params[1], // Id
                        lockerCert,
                        recipientCert,
                        "com.cordaSimpleApplication.flow.GetSimpleBondAssetStateAndContractId",
                        BondAssetContract.Commands.Issue(),
                        thisParty,
                        obs
                    )
                }
                println("Pledged asset claim response: ${res}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
                // exit the process throwing error code
                exitProcess(1)
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
    val expiryTimeSecs: String? by option("-t", "--expiry-time-secs", help="Pledge expiry time in epoch seconds.")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (expiryTimeSecs == null) {
            println("Arguments required: --expiry-time-secs (-t).")
        } else {
            val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val proxy = rpc.proxy
                val assetClaimStatusBytes = proxy.startFlow(::GetAssetClaimStatusByPledgeId, pledgeId!!, expiryTimeSecs!!)
                    .returnValue.get()
                println("assetClaimStatusBytes: ${assetClaimStatusBytes.toString(Charsets.UTF_8)}")
                println("assetClaimStatusBytes: ${assetClaimStatusBytes.contentToString()}")
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
                println("\n assetPledgeStatus: ${assetPledgeStatusBytes.contentToString()}")
            } catch (e: Exception) {
                println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

fun getReclaimViewAddress(
    transferCategory: String,
    assetType: String,
    assetIdOrQuantity: String,
    pledgeId: String,
    pledgerCert: String,
    exportNetworkId: String,
    recipientCert: String,
    importNetworkId: String,
    pledgeExpiryTimeSecs: String) : String
{
    var viewAddress: String
    var funcName: String? = null
    var funcArgs: List<String>? = null

    // transferCategory is input in the format: "asset_type.remote_network_type"
    // asset_type can be either bond, token or house-token
    // remote_network_type can be either fabric, corda or besu
    if (transferCategory.equals("token.corda")) {
        funcName = "GetAssetClaimStatusByPledgeId"
        funcArgs = listOf(pledgeId, pledgeExpiryTimeSecs)
    } else if (transferCategory.equals("bond.corda")) {
        funcName = "GetBondAssetClaimStatusByPledgeId"
        funcArgs = listOf(pledgeId, pledgeExpiryTimeSecs)
    } else if (transferCategory.equals("token.fabric")) {
        funcName = "GetTokenAssetClaimStatus"
        funcArgs = listOf(pledgeId, assetType, assetIdOrQuantity, recipientCert, pledgerCert,
                        exportNetworkId, pledgeExpiryTimeSecs)
    } else if (transferCategory.equals("bond.fabric")) {
        funcName = "GetAssetClaimStatus"
        funcArgs = listOf(pledgeId, assetType, assetIdOrQuantity, recipientCert, pledgerCert,
                    exportNetworkId, pledgeExpiryTimeSecs)
    } else if (transferCategory.equals("house-token.corda")) {
        funcName = "GetAssetClaimStatusByPledgeId"
        funcArgs = listOf(pledgeId, pledgeExpiryTimeSecs)
    }
    println("funcName: $funcName and funcArgs: $funcArgs")

    viewAddress = generateViewAddressFromRemoteConfig(importNetworkId, funcName!!, funcArgs!!)

    return viewAddress
}

fun getClaimViewAddress(
    transferCategory: String,
    pledgeId: String,
    pledgerCert: String,
    exportNetworkId: String,
    recipientCert: String,
    importNetworkId: String) : String
{
    var viewAddress: String
    var funcName: String? = null
    var funcArgs: List<String>? = null

    if (transferCategory.equals("token.corda")) {
        funcName = "GetAssetPledgeStatusByPledgeId"
        funcArgs = listOf(pledgeId, importNetworkId)
    } else if (transferCategory.equals("bond.corda")) {
        funcName = "GetBondAssetPledgeStatusByPledgeId"
        funcArgs = listOf(pledgeId, importNetworkId)
    } else if (transferCategory.equals("token.fabric")) {
        funcName = "GetTokenAssetPledgeStatus"
        funcArgs = listOf(pledgeId, pledgerCert, importNetworkId, recipientCert)
    } else if (transferCategory.equals("bond.fabric")) {
        funcName = "GetAssetPledgeStatus"
        funcArgs = listOf(pledgeId, pledgerCert, importNetworkId, recipientCert)
    } else if (transferCategory.equals("house-token.corda")) {
        funcName = "GetAssetPledgeStatusByPledgeId"
        funcArgs = listOf(pledgeId, importNetworkId)
    }
    println("funcName: $funcName and funcArgs: $funcArgs")

    viewAddress = generateViewAddressFromRemoteConfig(exportNetworkId, funcName!!, funcArgs!!)

    return viewAddress
}

/*
 * This is used to create the view address referring to the file remote-network-config.json
 * This is called both in the cases of Claim and Reclaim.
 * It generates the view addess based on the remote network being Corda or Fabric accordingly.
 */
fun generateViewAddressFromRemoteConfig(
    networkId: String,
    funcName: String,
    funcArgs: List<String>) : String
{
    var address: String = ""
    var remoteNetworkConfig: JSONObject = getRemoteNetworkConfig(networkId)

    try {
        val relayEndpoint: String = remoteNetworkConfig.getString("relayEndpoint")
        if (remoteNetworkConfig.getString("type").equals("corda")) {
            val cordaHosts: List<String> = listOf(remoteNetworkConfig.getString("partyEndPoint"))
            val flowPackage: String = remoteNetworkConfig.getString("flowPackage")

            address = InteroperableHelper.createCordaViewAddress(networkId, relayEndpoint, cordaHosts,
                        flowPackage + "." + funcName, funcArgs.joinToString(separator=":") { it })
        } else if (remoteNetworkConfig.getString("type").equals("fabric")) {
            val channelName: String = remoteNetworkConfig.getString("channelName")
            val chaincodeName: String = remoteNetworkConfig.getString("chaincode")
            address = InteroperableHelper.createFabricViewAddress(networkId, relayEndpoint, channelName,
                        chaincodeName, funcName, funcArgs.joinToString(separator=":") { it })
        }
    } catch (e: Exception) {
        println("Error: ${e.toString()}")
        // exit the process throwing error code
        exitProcess(1)
    }

    println("networkId: $networkId and view address: $address")

    return address
}

/*
 * This is used to fetch the requested state from a remote network, save in local vault, and return the vault ID.
 * In case of Claim by a network, this is used to fetch the pledge-status in the export network.
 * In case of Reclaim by a network, this is used to fetch the claim-status in the import network.
 */
fun requestStateFromRemoteNetwork(
    localRelayAddress: String,
    externalStateAddress: String,
    proxy: CordaRPCOps,
    config: Map<String, String>) : String
{
    var linearId: String = ""
    val networkName = System.getenv("NETWORK_NAME") ?: "Corda_Network"

    try {
        InteroperableHelper.interopFlow(
            proxy,
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
            linearId = it.toString()
            println("Interop flow successful and external-state was stored with linearId $linearId.\n")
        })
    } catch (e: Exception) {
        println("Error: ${e.toString()}")
        // exit the process throwing error code
        exitProcess(1)
    }

    return linearId
}