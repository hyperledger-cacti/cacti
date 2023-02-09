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
import java.io.File
import java.lang.Exception
import java.security.cert.X509Certificate
import org.json.JSONObject
import net.corda.core.messaging.CordaRPCOps
import kotlinx.coroutines.runBlocking
import kotlin.system.exitProcess
import java.util.Base64
import net.corda.core.identity.CordaX500Name
import net.corda.core.identity.Party
import com.weaver.corda.app.interop.flows.x509CertToPem
import com.weaver.corda.sdk.HashFunctions

class UtilsCommand : CliktCommand(name = "utils", help ="Manages utilities") {
    override fun run() {
    }
}


/**
 * Generates Hash to be used for HTLC for a given secret:
 * get-hash -s <secret>
 * get-hash --secret=<secret>
 */
class GetHashCommand : CliktCommand(name = "hash",
        help = "Generates Hash to be used for HTLC for a given secret. Usage: utils hash --secret=<secret>") {
    val hash_fn: String? by option("-hfn", "--hash-fn", help="Hash Function to be used. Supported: SHA256, SHA512. Default: SHA256")
    val secret: String? by option("-s", "--secret", help="Preimage to be hashed")
    val random: Boolean by option("-r", "--random", help="Random generate preimage").flag(default = false)
    override fun run() = runBlocking {
        if (secret == null && !random) {
            println("Either provide Parameter --secret (-s) or set --random (-r) flag")
        }
        var hash: HashFunctions.Hash = HashFunctions.SHA256()
        if(hash_fn == "SHA256") {
            hash = HashFunctions.SHA256()
        } else if ( hash_fn == "SHA512") {
            hash = HashFunctions.SHA512()
        }
        if (random) {
            hash.generateRandomPreimage(22)
        } else {
            hash.setPreimage(secret!!)
        }
        println("Preimage: ${hash.getPreimage()}")
        println("Hash in Base64: ${hash.getSerializedHashBase64()}")
    }
}

/**
 * Helper function used by IssueBondAssetStateCommand
 */
fun fetchCertBase64Helper(proxy: CordaRPCOps) : String {
    var certPemBase64: String = ""
    try {
        val partyName: CordaX500Name = proxy.nodeInfo().legalIdentities.get(0).name

        val cert: X509Certificate = proxy.nodeInfo().identityAndCertFromX500Name(partyName).certificate
        val certPem: String = x509CertToPem(cert)
        certPemBase64 = Base64.getEncoder().encodeToString(certPem.toByteArray())
    } catch (e: Exception) {
        println(e.toString())
    }

    return certPemBase64
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
            val certPemBase64: String = fetchCertBase64Helper(rpc.proxy)
            println("Certificate in base64: $certPemBase64")
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
            val partyName: String = rpc.proxy.nodeInfo().legalIdentities.get(0).name.toString()
            println("Name of the party owning the Corda node: $partyName")
            println("rpc.proxy.nodeInfo().legalIdentities.size: ${rpc.proxy.nodeInfo().legalIdentities.size}")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}

/*
 * This function parses the file remote-network-config.json and fetches the configuration of the input networkId.
 * If either the configuration file not found, or the network is not found, it throws an exception.
 */
fun getRemoteNetworkConfig(networkID: String): JSONObject {

    val credentialPath: String = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath: String = credentialPath + "/../remote-network-config.json"

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
 * Fetches the certificate corresponding to an user from the file 'networkID'+'_UsersAndCerts.json'.
 * This is used during Pledge to get the recipientCert, and during Claim to get the pledgerCert.
 */
fun getUserCertFromFile(userID: String, networkID: String): String {
    var certBase64: String
    try {

        val credentialPath: String = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
        val dirPath: String = "$credentialPath" + "/../remoteNetworkUsers"
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
            val userID: String = rpc.proxy.nodeInfo().legalIdentities.get(0).name.toString()
            val certBase64: String = fetchCertBase64Helper(rpc.proxy)
            var networkID: String
            val cordaPort: Int = config["CORDA_PORT"]!!.toInt()
            val cordaNetwork: String? = config["NETWORK_NAME"]
            if (cordaPort == 30006 || cordaPort == 30009 || cordaPort == 30012 || (cordaNetwork != null && cordaNetwork.equals("Corda_Network2"))) {
                networkID = "Corda_Network2"
            } else if (cordaPort == 10006 || cordaPort == 10009 || cordaPort == 10012 || (cordaNetwork != null && cordaNetwork.equals("Corda_Network"))) {
                networkID = "Corda_Network"
            } else {
                println("Either CORDA_PORT $cordaPort or NETWORK_NAME $cordaNetwork is not valid.")
                throw IllegalStateException("Either CORDA_PORT $cordaPort or NETWORK_NAME $cordaNetwork is not valid")
            }

            val credentialPath: String = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
            val dirPath: String = "${credentialPath}/../remoteNetworkUsers"
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