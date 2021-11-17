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
import java.io.File
import java.lang.Exception
import kotlinx.coroutines.runBlocking
import net.corda.core.messaging.startFlow
import com.google.protobuf.util.JsonFormat
import net.corda.core.identity.CordaX500Name
import net.corda.core.identity.Party

import com.weaver.corda.sdk.AccessControlPolicyManager
import com.weaver.protos.common.access_control.AccessControl

/**
 * TODO: Documentation
 * create-access-control-policy Dummy_Network
 */
class CreateAccessControlPolicyCommand : CliktCommand(
        help = "Creates an Access Control Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    val sharedPartiesNames by option("-p", "--parties", help="List of parties separated by \";\"")
    override fun run() = runBlocking {
        createAccessControlPolicyFromFile(network, config, sharedPartiesNames)
    }
}

/**
 * Helper function to create Access Control Policy for an external network
 */
fun createAccessControlPolicyFromFile(network: String, config: Map<String, String>, sharedPartiesNames: String? = null) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath = "${credentialPath}/${network}/access-control.json"
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
            
    var sharedParties: List<Party> = listOf<Party>()
    if (sharedPartiesNames != null) {
        for (partyName in sharedPartiesNames.split(";")) {
            sharedParties += rpc.proxy.wellKnownPartyFromX500Name(CordaX500Name.parse(partyName))!!
        }
    }
    try {
        val accessControlPolicy = File(filepath).readText(Charsets.UTF_8)
        println("Access control policy from file: $accessControlPolicy")
        val accessControlPolicyBuilder = AccessControl.AccessControlPolicy.newBuilder()
        JsonFormat.parser().merge(
            accessControlPolicy, 
            accessControlPolicyBuilder
        );
        println("Storing access control policy in the vault")
        val accessControlPolicyProto = accessControlPolicyBuilder.build()
        val res = AccessControlPolicyManager.createAccessControlPolicyState(
            rpc.proxy,
            accessControlPolicyProto,
            sharedParties
        )
        if (res.isRight()) {
            println("Access Control Policy Create Succesful Result: $res")            
        } else {
            val getRes = AccessControlPolicyManager.getAccessControlPolicyState(
                rpc.proxy, 
                accessControlPolicyProto.securityDomain
            )
            if (getRes.isRight()) {
                updateAccessControlPolicyFromFile(network, config)
            } else {
                println("Error: Access Control Policy Create Failure Result: $res")    
            }
        }
    } catch (e: Exception) {
      println("Error: ${e.toString()}")
    } finally {
        rpc.close()
    }
}



/**
 * TODO: Documentation
 */
class UpdateAccessControlPolicyCommand : CliktCommand(help = "Updates an Access Control Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    override fun run() = runBlocking {
        updateAccessControlPolicyFromFile(network, config)
    }
}

/**
 * Helper function to update Access Control Policy for an external network
 */
fun updateAccessControlPolicyFromFile(network: String, config: Map<String, String>) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath = "${credentialPath}/${network}/access-control.json"
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        val accessControlPolicy = File(filepath).readText(Charsets.UTF_8)
        println("Access control policy from file: $accessControlPolicy")
        val accessControlPolicyBuilder = AccessControl.AccessControlPolicy.newBuilder()
        JsonFormat.parser().merge(
            accessControlPolicy, 
            accessControlPolicyBuilder
        );
        println("Updating access control policy in the vault")
        val res = AccessControlPolicyManager.updateAccessControlPolicyState(
            rpc.proxy,
            accessControlPolicyBuilder.build()
        )
        println("Access Control Policy Update Result: $res")
    } catch (e: Exception) {
      println("Error: ${e.toString()}")
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class DeleteAccessControlPolicyCommand : CliktCommand(help = "Deletes an Access Control Policy for an external network. Requires the securityDomain. ") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = AccessControlPolicyManager.deleteAccessControlPolicyState(
                rpc.proxy, 
                securityDomain
            )
            println("Delete Access Control Policy State Result: ${res}")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}

/**
 * TODO: Documentation
 * get-access-control-policy Dummy_Network
 */
class GetAccessControlPolicyCommand : CliktCommand(help = "Gets Access Control Policy for the provided securityDomain.") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = AccessControlPolicyManager.getAccessControlPolicyState(
                rpc.proxy, 
                securityDomain
            )
            println("Get Access Control Policy Result:\n${res}")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}

/**
 * TODO: Documentation
 */
class GetAccessControlPoliciesCommand : CliktCommand(help = "Gets all Access Control Policies") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = AccessControlPolicyManager.getAccessControlPolicies(rpc.proxy)
            println("Get All Access Control Policies Result:\n${res}")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}
