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
import com.weaver.corda.sdk.HashFunctions
import com.cordaSimpleApplication.state.AssetState
import com.cordaSimpleApplication.contract.AssetContract


/**
 * Command to lock an asset.
 * lock-asset --hash=hash --timeout=timeout --recipient="O=PartyB,L=London,C=GB" --param=type:id ----> non-fungible
 * lock-asset --fungible --hash=hash --timeout=timeout --recipient="O=PartyB,L=London,C=GB" --param=type:amount ----> fungible
 */
class LockAssetCommand : CliktCommand(
        help = "Locks an asset. lock-asset --fungible --hashBase64=hashbase64 --timeout=10 --recipient='PartyA' --param=type:amount ") {
    val config by requireObject<Map<String, String>>()
    val hash_fn: String? by option("-hfn", "--hash-fn", help="Hash Function to be used. Default: SHA256")
    val hashBase64: String? by option("-h64", "--hashBase64", help="Hash in base64 for HTLC")
    val timeout: String? by option("-t", "--timeout", help="Timeout duration in seconds.")
    val recipient: String? by option("-r", "--recipient", help="Party Name for recipient")
    val fungible: Boolean by option("-f", "--fungible", help="Fungible Asset Lock: True/False").flag(default = false)
    val param: String? by option("-p", "--param", help="Parameter AssetType:AssetId for non-fungible, AssetType:Quantity for fungible.")
    override fun run() = runBlocking {
        var hash: HashFunctions.Hash = HashFunctions.SHA256()
        if(hash_fn == "SHA256") {
            hash = HashFunctions.SHA256()
        } else if ( hash_fn == "SHA512") {
            hash = HashFunctions.SHA512()
        }
        if (hashBase64 == null || recipient == null || param == null) {
            println("One of HashBase64, Recipient, or param argument is missing.")
        } else {
            var nTimeout: Long
            if (timeout == null) {
                nTimeout = 10L
            } else {
                nTimeout = timeout!!.toLong()
            }
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val params = param!!.split(":").toTypedArray()
                var id: Any
                val issuer = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse("O=PartyA,L=London,C=GB"))!!
                hash.setSerializedHashBase64(hashBase64!!)
                if (fungible) {
                    id = AssetManager.createFungibleHTLC(
                        rpc.proxy, 
                        params[0],          // Type
                        params[1].toLong(), // Quantity
                        recipient!!, 
                        hash, 
                        nTimeout, 
                        1,                  // nTimeout represents Duration
                        "com.cordaSimpleApplication.flow.RetrieveStateAndRef", 
                        AssetContract.Commands.Delete(),
                        issuer
                    )
                } else {
                    id = AssetManager.createHTLC(
                        rpc.proxy, 
                        params[0],      // Type
                        params[1],      // ID
                        recipient!!, 
                        hash, 
                        nTimeout,  
                        1,              // nTimeout represents Duration
                        "com.cordaSimpleApplication.flow.RetrieveStateAndRef", 
                        AssetContract.Commands.Delete(),
                        issuer
                    )
                }
                println("HTLC Lock State created with contract ID ${id}.")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Command to claim a locked asset.
 */
class ClaimAssetCommand : CliktCommand(help = "Claim a locked asset. Only Recipient's call will work.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for HTLC State")
    val hash_fn: String? by option("-hfn", "--hash-fn", help="Hash Function to be used. Default: SHA256")
    val secret: String? by option("-s", "--secret", help="Hash Pre-Image for the HTLC Claim")
    override fun run() = runBlocking {
        var hash: HashFunctions.Hash = HashFunctions.SHA256()
        if(hash_fn == "SHA256") {
            hash = HashFunctions.SHA256()
        } else if ( hash_fn == "SHA512") {
            hash = HashFunctions.SHA512()
        }
        if (contractId == null || secret == null) {
            println("Arguments required: --contract-id and --secret.")
        } else {
            val rpc = NodeRPCConnection(
                    host = config["CORDA_HOST"]!!,
                    username = "clientUser1",
                    password = "test",
                    rpcPort = config["CORDA_PORT"]!!.toInt())
            try {
                val issuer = rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse("O=PartyA,L=London,C=GB"))!!
                hash.setPreimage(secret!!)
                val res = AssetManager.claimAssetInHTLC(
                    rpc.proxy, 
                    contractId!!, 
                    hash,
                    AssetContract.Commands.Issue(),
                    "com.cordaSimpleApplication.flow.UpdateAssetOwnerFromPointer",
                    issuer
                )
                println("Asset Claim Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Command to unlock a locked asset after timeout as per HTLC.
 */
class UnlockAssetCommand : CliktCommand(help = "Unlocks a locked asset after timeout. Only lockers's call will work.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for HTLC State")
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
                val res = AssetManager.reclaimAssetInHTLC(
                    rpc.proxy, 
                    contractId!!,
                    AssetContract.Commands.Issue(),
                    issuer
                )
                println("Asset Unlock Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Query lock status of an asset.
 */
class IsAssetLockedCommand : CliktCommand(help = "Query lock status of an asset, given contractId.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for HTLC State")
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
                val res = AssetManager.isAssetLockedInHTLC(
                    rpc.proxy, 
                    contractId!!
                )
                println("Is Asset Locked Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}
/**
 * Fetch HTLC State associated with contractId.
 */
class GetLockStateCommand : CliktCommand(help = "Fetch HTLC State associated with contractId.") {
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for HTLC State")
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
                val res = AssetManager.readHTLCStateByContractId(
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
 * Query lock hash of an HTLC.
 */
class GetHTLCHashCommand : CliktCommand(name = "get-htlc-hash",
    help = "Query lock hash of a locked asset using HTLC, given contractId.")
{
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for HTLC State")
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
                val res = AssetManager.getHTLCHashById(
                    rpc.proxy, 
                    contractId!!
                )
                println("GetHTLCHash Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}

/**
 * Query claim hash preimage of an HTLC.
 */
class GetHTLCPreImageCommand : CliktCommand(name = "get-htlc-preimage",
    help = "Query hash preimage of a claimed asset using HTLC, given contractId.")
{
    val config by requireObject<Map<String, String>>()
    val contractId: String? by option("-cid", "--contract-id", help="Contract/Linear Id for HTLC State")
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
                val res = AssetManager.getHTLCHashPreImageById(
                    rpc.proxy, 
                    contractId!!
                )
                println("GetHTLCPreImage Response: ${res}")
            } catch (e: Exception) {
              println("Error: ${e.toString()}")
            } finally {
                rpc.close()
            }
        }
    }
}