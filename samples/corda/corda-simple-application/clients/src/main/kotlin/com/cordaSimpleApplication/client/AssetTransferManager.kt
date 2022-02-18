/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.default
import java.lang.Exception
import java.io.File
import org.json.JSONObject
import net.corda.core.messaging.CordaRPCOps
import kotlinx.coroutines.runBlocking
import kotlin.system.exitProcess
import net.corda.core.messaging.startFlow
import java.util.Base64
import net.corda.core.identity.CordaX500Name

import com.weaver.corda.sdk.AssetManager
import com.weaver.corda.sdk.InteroperableHelper
import com.cordaSimpleApplication.contract.AssetContract
import java.util.Calendar
import com.weaver.corda.app.interop.flows.RetrieveNetworkId
import com.weaver.corda.app.interop.flows.GetAssetPledgeStatus
import com.weaver.corda.app.interop.states.AssetPledgeState
import com.cordaSimpleApplication.flow.GetAssetClaimStatusByPledgeId
import com.cordaSimpleApplication.flow.GetAssetPledgeStatusByPledgeId
import com.cordaSimpleApplication.flow.GetOurCertificateBase64
import com.cordaSimpleApplication.flow.GetOurIdentity
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
    val remoteNetworkId: String? by option("-rnid", "--remote-network-id", help="Importing network for asset transfer")
    val recipient: String? by option("-r", "--recipient", help="Name of the recipient in the importing network")
    val fungible: Boolean by option("-f", "--fungible", help="Fungible Asset Pledge: True/False").flag(default = false)
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer")
    override fun run() = runBlocking {
        if (recipient == null) {
            println("Arguement -r (name of the recipient in importing n/w) is required")
        } else if (param == null) {
            println("Arguement -p (asset details to be pledged) is required")
        } else if (remoteNetworkId == null) {
            println("Arguement -rnid (remote/importing network id) is required")
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
                var id: Any
                
                val localNetworkId = rpc.proxy.startFlow(::RetrieveNetworkId).returnValue.get()
                println("localNetworkId: ${localNetworkId}")

                val thisPartyName = rpc.proxy.startFlow(::GetOurIdentity).returnValue.get()
                 // "thisParty" is set to the token "issuer" in case fungible house token; since we are using the same
                 // SDK function claimPledgeFungibleAsset and Interop application for both the "Simple Asset" and
                 // the "Fungible house token" corDapps, we pass the Identity of the party submitting the claim here.
                val thisParty = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(thisPartyName))!!

                var obs = listOf<Party>()
                if (observer != null)   {
                   obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }

                // Obtain the recipient certificate from the name of the recipient
                val recipientCert: String = getUserCertFromFile(recipient!!, remoteNetworkId!!)

                if (fungible) {
                    id = AssetManager.createFungibleAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        remoteNetworkId!!,
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
                    id = AssetManager.createAssetPledge(
                        rpc.proxy,
                        localNetworkId!!,
                        remoteNetworkId!!,
                        params[0],      // Type
                        params[1],      // ID
                        recipientCert,
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
class FetchCertBase64Command : CliktCommand(name="get-cert-base64", help = "Obtain the certificate of the party owning a node in base64 format.") {
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
 * Command to fetch the name of the party owning the node.
 */
class FetchPartyNameCommand : CliktCommand(name="get-party-name", help = "Obtain the name of the party owning a node in the Corda network.") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {

        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val partyName = rpc.proxy.startFlow(::GetOurIdentity).returnValue.get()
            println("Name of the party owning the Corda node: $partyName")
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
    val pledgeId: String? by option("-pid", "--pledge-id", help="Pledge id for asset transfer pledge state")
    val transferCategory: String? by option("-tc", "--transfer-category", help="transferCategory is input in the format: 'asset_type.remote_network_type'."
        + " 'asset_type' can be either 'bond', 'token' or 'house-token'."
        + " 'remote_network_type' can be either 'fabric', 'corda' or 'besu'.")
    val importNetworkId: String? by option ("-inid", "--import-network-id", help="Import network id of pledged asset for asset transfer")
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    val observer: String? by option("-o", "--observer", help="Party Name for Observer (e.g., 'O=PartyA,L=London,C=GB')")
    override fun run() = runBlocking {
        if (pledgeId == null) {
            println("Arguments required: --pledge-id.")
        } else if (transferCategory == null) {
            println("Arguments required: --transfer-category.")
        } else if (importNetworkId == null) {
            println("Arguments required: --import-network-id.")
        } else if (param == null) {
            println("Arguments required: --param.")
        } else {
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

            val assetPledgeState = rpc.proxy.startFlow(::GetAssetPledgeStatus, pledgeId!!, importNetworkId!!).returnValue.get() as AssetPledgeState
            if (assetPledgeState.lockerCert.equals("")) {
                println("Error: not a valid pledgeId $pledgeId")
                throw IllegalStateException("Error: not a valid pledgeId $pledgeId")
            } else if (!assetPledgeState.remoteNetworkId.equals(importNetworkId)) {
                println("Invalid argument --import-network-id $importNetworkId")
                throw IllegalStateException("Invalid argument --import-network-id $importNetworkId")
            }

            val params = param!!.split(":").toTypedArray()
            if (params.size != 2) {
                println("Invalid argument --param $param")
                throw IllegalStateException("Invalid argument --param $param")
            }
            var externalStateAddress: String = getReclaimViewAddress(transferCategory!!, params[0], params[1], pledgeId!!,
                assetPledgeState.lockerCert, assetPledgeState.localNetworkId, assetPledgeState.recipientCert,
                importNetworkId!!, assetPledgeState.expiryTimeSecs.toString())

            try {
                val networkConfig: JSONObject = getRemoteNetworkConfig(assetPledgeState.localNetworkId)
                val exportRelayAddress: String = networkConfig.getString("relayEndpoint")
                val claimStatusLinearId: String = requestStateFromRemoteNetwork(exportRelayAddress, externalStateAddress, rpc.proxy, config)

                var obs = listOf<Party>()
                if (observer != null)   {
                    obs += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(observer!!))!!
                }
                val res = AssetManager.reclaimPledgedAsset(
                    rpc.proxy,
                    pledgeId!!,
                    AssetContract.Commands.Issue(),
                    claimStatusLinearId,
                    thisParty,
                    obs
                )
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
                val thisParty: Party = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(thisPartyName))!!
                val recipientCert: String = rpc.proxy.startFlow(::GetOurCertificateBase64).returnValue.get()
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
                val networkConfig: JSONObject = getRemoteNetworkConfig(importNetworkId)
                val importRelayAddress: String = networkConfig.getString("relayEndpoint")
                val pledgeStatusLinearId: String = requestStateFromRemoteNetwork(importRelayAddress, externalStateAddress, rpc.proxy, config)

                val res = AssetManager.claimPledgedFungibleAsset(
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
    } else if (transferCategory.equals("token.fabric")) {
        funcName = "GetTokenAssetPledgeStatus"
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
 * This function parses the file remote-network-config.json and fetches the configuration of the input networkId.
 * If either the configuration file not found, or the network is not found, it throws an exception.
 */
fun getRemoteNetworkConfig(networkID: String): JSONObject {

    val credentialPath: String = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath: String = credentialPath + "/remote-network-config.json"

    val networksConfigJSON: JSONObject
    val networksConfigFile: File
    try {
        networksConfigFile = File(filepath)
        if (!networksConfigFile.exists()) {
            // if file doesn't exits, throw an exception
            println("File $filepath doesn't exist to fetch the network configuration of networkID $networkID.")
            throw IllegalStateException("File $filepath doesn't exist to fetch the network configuration of networkID $networkID.")
        } else {
            // if file exists, read the contents of the file
            networksConfigJSON = JSONObject(networksConfigFile.readText(Charsets.UTF_8))
        }

        // throw exception if the networkID is not present in the file
        if (!networksConfigJSON.has(networkID)) {
            println("File $filepath doesn't contain the configuration of networkID $networkID.")
            throw IllegalStateException("File $filepath doesn't contain the configuration of networkID $networkID.")
        }
    } catch (e: Exception) {
        println("Error: ${e.toString()}")
        // exit the process throwing error code
        exitProcess(1)
    }

    return networksConfigJSON.getJSONObject(networkID)
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

/*
 * Fetches the certificate corresponding to an user from the file 'networkID'+'_UsersAndCerts.json'.
 * This is used during Pledge to get the recipientCert, and during Claim to get the pledgerCert.
 */
fun getUserCertFromFile(userID: String, networkID: String): String {
    var certBase64: String
    try {

        val credentialPath: String = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
        val dirPath: String = "$credentialPath" + "/remoteNetworkUsers"
        val filepath: String = "$dirPath/$networkID" + "_UsersAndCerts.json"

        var usersAndCertsJSON: JSONObject
        var usersAndCertsFile: File
        usersAndCertsFile = File(filepath)
        if (!usersAndCertsFile.exists()) {
            // if file doesn't exits, throw an exception
            println("File $filepath doesn't exist to fetch the certificate of user $userID.")
            throw IllegalStateException("File $filepath doesn't exist to fetch the certificate of user $userID.")
        } else {
            // if file exists, read the contents of the file
            usersAndCertsJSON = JSONObject(usersAndCertsFile.readText(Charsets.UTF_8))
        }

        // throw exception if the userID is not present in the file
        if (!usersAndCertsJSON.has(userID)) {
            println("File $filepath doesn't contain the certificate of user $userID.")
            throw IllegalStateException("File $filepath doesn't contain the certificate of user $userID.")
        }

        certBase64 = usersAndCertsJSON.getString(userID)
    } catch (e: Exception) {
        println(e.toString())
        exitProcess(1)
    }
    return certBase64
}

/*
 * Populates the file 'networkID'+'_UsersAndCerts.json' with the users and their certificates.
 * This is used during Pledge to get the recipientCert, and during Claim to get the pledgerCert.
 */
class SaveUserCertToFileCommand : CliktCommand(name="save-cert", help = "Populates the file 'networkId' + '_UsersAndCerts.json' with the certificate of 'ourIdentity'")
{
    val config by requireObject<Map<String, String>>()
    override fun run() {
        println("Fetching base64 certificate of the user 'ourIdentity'.")
        val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val proxy = rpc.proxy
            val userID: String = proxy.startFlow(::GetOurIdentity).returnValue.get()
            val certBase64: String = proxy.startFlow(::GetOurCertificateBase64).returnValue.get()
            var networkID: String
            val cordaPort: Int = config["CORDA_PORT"]!!.toInt()
            if (cordaPort == 30006) {
                networkID = "Corda_Network2"
            } else if (cordaPort == 10006) {
                networkID = "Corda_Network"
            } else {
                println("CORDA_PORT $cordaPort is not a valid port.")
                throw IllegalStateException("CORDA_PORT $cordaPort is not a valid port.")
            }

            val credentialPath: String = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
            val dirPath: String = "${credentialPath}/remoteNetworkUsers"
            val filepath: String = "${dirPath}/${networkID + "_UsersAndCerts.json"}"

            val folder: File = File(dirPath)
            if (!folder.exists()) {
                folder.mkdirs()
            }
            var usersAndCertsJSON: JSONObject
            val usersAndCertsFile: File = File(filepath)
            if (!usersAndCertsFile.exists()) {
                // if file doesn't exits, create an empty JSON object
                usersAndCertsJSON = JSONObject()
            } else {
                // if file exists, read the contents of the file
                var usersOfNetwork = File(filepath).readText(Charsets.UTF_8)
                usersAndCertsJSON = JSONObject(usersOfNetwork)
            }

            // add <userID, certBase64> to the JSON object; if the key userID exists already, overwrite the value
            usersAndCertsJSON.put(userID, certBase64)

            usersAndCertsFile.writeText(usersAndCertsJSON.toString())

        } catch (e: Exception) {
            println(e.toString())
        } finally {
            rpc.close()
        }
    }
}