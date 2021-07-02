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
import com.cordaInteropApp.states.AccessControlPolicyState
import com.cordaInteropApp.flows.*
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import com.google.gson.Gson
import java.io.File
import java.lang.Exception
import kotlinx.coroutines.runBlocking
import net.corda.core.messaging.startFlow

/**
 * TODO: Documentation
 */
class CreateAccessControlPolicyCommand : CliktCommand(
        help = "Creates an Access Control Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    override fun run() = runBlocking {
        val result = createAccessControlPolicyFromFile(network, config)
        println(result)
    }
}

/**
 * Helper function to create Access Control Policy for an external network
 */
fun createAccessControlPolicyFromFile(network: String, config: Map<String, String>): Either<Error, String> {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config"
    val filepath = "${credentialPath}/${network}/access-control.json"
    return try {
        val file = File(filepath).readText(Charsets.UTF_8)
        val accessControlPolicy = Gson().fromJson(file, AccessControlPolicyState::class.java)
        println("Access control policy from file: $accessControlPolicy")
        writeAccessControlPolicyStateToVault(
                accessControlPolicy,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt()
        )
    } catch (e: Exception) {
      println("Error: Credentials directory ${filepath} not found.")
      Left(Error("Error: Credentials directory ${filepath} not found."))
    }
}


/**
 * Helper function used by createAccessControlPolicyFromFile to interact with the Corda network
 */
fun writeAccessControlPolicyStateToVault(
        accessControlPolicy: AccessControlPolicyState,
        host: String,
        port: Int
): Either<Error, String> {
    println("Storing access control policy in the vault")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Storing access control policy in the vault")
        val proxy = rpc.proxy
        runCatching {
            proxy.startFlow(::CreateAccessControlPolicy, accessControlPolicy)
                    .returnValue.get()
        }.fold({
            it.flatMap {
                println("Access Control Policy stored with linearId $it")
                Right(it.toString())
            }
        }, {
            println("Error running CreateAccessControlPolicy flow: ${it.message}")
            Left(Error("Error running CreateAccessControlPolicy flow: ${it.message}"))
        })
    } catch (e: Exception) {
        Left(Error("${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class UpdateAccessControlPolicyCommand : CliktCommand(help = "Updates an Access Control Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    override fun run() = TODO("Not yet implemented")
}

/**
 * TODO: Documentation
 */
class DeleteAccessControlPolicyCommand : CliktCommand(help = "Deletes an Access Control Policy for an external network. Requires the securityDomain. ") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val eitherErrorStateId = deleteAccessControlPolicyState(
                securityDomain,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Corda network returned: $eitherErrorStateId")
    }
}

/**
 * Helper function used by DeleteAccessControlPolicyStateCommand to interact with the Corda network
 */
fun deleteAccessControlPolicyState(
        securityDomain: String,
        host: String,
        port: Int): Either<Error, String> {
    println("Deleting access control policy for securityDomain $securityDomain")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Deleting access control policy for securityDomain $securityDomain")
        val proxy = rpc.proxy
        val result = runCatching {
            proxy.startFlow(::DeleteAccessControlPolicyState, securityDomain)
                    .returnValue.get().flatMap {
                        println("Access Control Policy for securityDomain $securityDomain deleted\n")
                        Right(it.toString())
                    }
        }.fold({ it }, { Left(Error(it.message)) })
        result
    } catch (e: Exception) {
        Left(Error("Corda Network Error: ${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class GetAccessControlPolicyCommand : CliktCommand(help = "Gets Access Control Policy for the provided securityDomain.") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val eitherErrorStateId = getAccessControlPolicyState(
                securityDomain,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Get Access Control result: $eitherErrorStateId")
    }
}

/**
 * Helper function used by GetAccessControlPolicyStateCommand to interact with the Corda network
 */
fun getAccessControlPolicyState(
        securityDomain: String,
        host: String,
        port: Int): Either<Error, AccessControlPolicyState> {
    println("Getting access control policy for securityDomain $securityDomain")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Getting access control policy for securityDomain $securityDomain")
        val proxy = rpc.proxy
        val accessControlPolicy = runCatching {
            proxy.startFlow(::GetAccessControlPolicyBySecurityDomain, securityDomain)
                    .returnValue.get().fold({
                        println("Error getting access control policy from network: ${it.message}")
                        Left(Error("Corda Network Error: ${it.message}"))
                    }, {
                        println("Access Control Policy for securityDomain $securityDomain: ${it.state.data} \n")
                        Right(it.state.data)
                    })
        }.fold({ it }, {
            Left(Error("Corda Network Error: ${it.message}"))
        })
        accessControlPolicy
    } catch (e: Exception) {
        Left(Error("Error with network connection: ${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class GetAccessControlPoliciesCommand : CliktCommand(help = "Gets all Access Control Policies") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        val eitherErrorStateId = getAccessControlPolicies(
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Get Access Control result: $eitherErrorStateId")
    }
}

/**
 * Helper function used by GetAccessControlPoliciesCommand to interact with the Corda network
 */
fun getAccessControlPolicies(
    host: String,
    port: Int
): Either<Error, String> {
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Getting all access control policies")
        val proxy = rpc.proxy
        val accessControlPolicies = proxy.startFlow(::GetAccessControlPolicies)
                .returnValue.get()
        println("Access Control Policies: $accessControlPolicies\n")
        Right(accessControlPolicies.toString())
    } catch (e: Exception) {
        Left(Error("${e.message}"))
    } finally {
        rpc.close()
    }
}
