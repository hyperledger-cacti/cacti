/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import arrow.core.flatMap
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import com.google.gson.Gson
import java.io.File
import java.lang.Exception
import kotlinx.coroutines.runBlocking
import net.corda.core.messaging.startFlow

import com.weaver.corda.sdk.AccessControlPolicyManager

/**
 * TODO: Documentation
 * create-access-control-policy Dummy_Network
 */
class CreateAccessControlPolicyCommand : CliktCommand(
        help = "Creates an Access Control Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    override fun run() = runBlocking {
        createAccessControlPolicyFromFile(network, config)
    }
}

/**
 * Helper function to create Access Control Policy for an external network
 */
fun createAccessControlPolicyFromFile(network: String, config: Map<String, String>) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config"
    val filepath = "${credentialPath}/${network}/access-control.json"
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        val accessControlPolicy = File(filepath).readText(Charsets.UTF_8)
        println("Access control policy from file: $accessControlPolicy")
        println("Storing access control policy in the vault")
        val res = AccessControlPolicyManager.createAccessControlPolicyState(
            rpc.proxy,
            accessControlPolicy
        )
        println("Access Control Policy Create Result: $res")
    } catch (e: Exception) {
      println("Error: Credentials directory ${filepath} not found.")
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
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config"
    val filepath = "${credentialPath}/${network}/access-control.json"
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        val accessControlPolicy = File(filepath).readText(Charsets.UTF_8)
        println("Access control policy from file: $accessControlPolicy")
        println("Updating access control policy in the vault")
        val res = AccessControlPolicyManager.updateAccessControlPolicyState(
            rpc.proxy,
            accessControlPolicy
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
            AccessControlPolicyManager.deleteAccessControlPolicyState(
                rpc.proxy, 
                securityDomain
            ).fold({
                println("Error: ${it.message}")
            }, {
                println("Delete Access Control Policy State Result: ${it}")
            })
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
            AccessControlPolicyManager.getAccessControlPolicyState(
                rpc.proxy, 
                securityDomain
            ).fold({
                println("Error: ${it.message}")
            }, {
                println("Get Access Control Policy State Result: ${it}")
            })
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
            AccessControlPolicyManager.getAccessControlPolicies(rpc.proxy).fold(
                { println("Error: ${it.message}") },
                { println("All Access Control Policies: ${it}") }
            )
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}
