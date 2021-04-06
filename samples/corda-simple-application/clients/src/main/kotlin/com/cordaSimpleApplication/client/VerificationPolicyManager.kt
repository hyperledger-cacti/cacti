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
import com.cordaInteropApp.flows.*
import com.cordaInteropApp.states.VerificationPolicyState
import com.cordaInteropApp.states.Policy
import com.cordaInteropApp.states.Identifier
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
class CreateVerificationPolicyCommand : CliktCommand(help = "Creates a Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network by argument()
    override fun run() = runBlocking {
        val result = when (network) {
            "Corda_Network" -> {
                Right(File("clients/src/main/resources/config/CordaNetworkVerificationPolicy.json")
                        .readText(Charsets.UTF_8))
            }
            "Fabric_Network" -> {
                Right(File("clients/src/main/resources/config/FabricNetworkVerificationPolicy.json")
                        .readText(Charsets.UTF_8))
            }
            "Dummy_Network" -> {
                Right(File("clients/src/main/resources/config/DummyNetworkVerificationPolicy.json")
                        .readText(Charsets.UTF_8))
            }
            else -> Left(Error("Only Fabric and Corda network verification policies are defined"))
        }.flatMap {
            val verificationPolicy = Gson().fromJson(it, VerificationPolicyState::class.java)
            println("Verification policy from file: $verificationPolicy")
            writeVerificationPolicyToVault(
                    verificationPolicy,
                    config["CORDA_HOST"]!!,
                    config["CORDA_PORT"]!!.toInt()
            )
        }
    }
}

/**
 * Helper function used by CreateVerificationPolicyCommand to interact with the Corda network
 */
fun writeVerificationPolicyToVault(
        verificationPolicy: VerificationPolicyState,
        host: String,
        port: Int): Either<Error, String> {
    println("Storing verification policy in the vault")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Storing verification policy in the vault")
        val proxy = rpc.proxy
        val stateId = proxy.startFlow(::CreateVerificationPolicyState, verificationPolicy)
                .returnValue.get()
        println("Verification Policy stored with linearId $stateId")
        Right(stateId.toString())
    } catch (e: Exception) {
        Left(Error("${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class UpdateVerificationPolicyCommand : CliktCommand(help = "Updates a Verification Policy for an external network. Requires securityDomain, identifier and policy arguments") {
    val config by requireObject<Map<String, String>>()

    //    TODO: make these flags instead of positional arguments
    val securityDomain by argument()
    val identifier by argument()
    val policyType by argument()
    val policyCriteria by argument()
    override fun run() = runBlocking {
        // TODO: Lookup local config file for network based on provided securityDomain
        val verificationPolicy = VerificationPolicyState(
                securityDomain = securityDomain,
                identifiers = listOf(Identifier(
                        pattern = identifier,
                        policy = Policy(policyType, listOf(policyCriteria)))
                )
        )
        val eitherErrorStateId = updateVerificationPolicy(
                verificationPolicy,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Corda network returned: $eitherErrorStateId")
    }
}

/**
 * Helper function used by UpdateVerificationPolicyCommand to interact with the Corda network
 */
fun updateVerificationPolicy(
        verificationPolicy: VerificationPolicyState,
        host: String,
        port: Int): Either<Error, String> {
    println("Updating verification policy for network ${verificationPolicy.securityDomain}")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Updating verification policy for network ${verificationPolicy.securityDomain}")
        val proxy = rpc.proxy
        val stateId = proxy.startFlow(::UpdateVerificationPolicyState, verificationPolicy)
                .returnValue.get()
        println("Verification Policy stored with linearId $stateId")
        Right(stateId.toString())
    } catch (e: Exception) {
        Left(Error("${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class DeleteVerificationPolicyCommand : CliktCommand(help = "Deletes a Verification Policy for an external network. Requires the securityDomain") {
    val config by requireObject<Map<String, String>>()

    //    TODO: make this a flag instead of positional arguments
    val securityDomain by argument()
    override fun run() = runBlocking {
        val eitherErrorStateId = deleteVerificationPolicy(
                securityDomain,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Corda network returned: $eitherErrorStateId")
    }
}

/**
 * Helper function used by DeleteVerificationPolicyCommand to interact with the Corda network
 */
fun deleteVerificationPolicy(
    securityDomain: String,
    host: String,
    port: Int
): Either<Error, String> {
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Deleting verification policy for securityDomain $securityDomain")
        val proxy = rpc.proxy
        val result = runCatching {
            proxy.startFlow(::DeleteVerificationPolicyState, securityDomain)
                    .returnValue.get().flatMap {
                        println("Verification Policy for securityDomain $securityDomain deleted\n")
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
class GetVerificationPolicyCommand : CliktCommand(help = "Gets Verification Policy for the provided securityDomain.") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val eitherErrorStateId = getVerificationPolicy(
                securityDomain,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Get Verification Policy result: $eitherErrorStateId")
    }
}

/**
 * Helper function used by GetVerificationPolicyCommand to interact with the Corda network
 */
fun getVerificationPolicy(
        securityDomain: String,
        host: String,
        port: Int): Either<Error, VerificationPolicyState> {
    println("Getting verification policy for securityDomain $securityDomain")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Getting verification policy for securityDomain $securityDomain")
        val proxy = rpc.proxy
        val verificationPolicy = runCatching {
            proxy.startFlow(::GetVerificationPolicyStateBySecurityDomain, securityDomain)
                    .returnValue.get().fold({
                        println("Error getting policy from network: ${it.message}")
                        Left(Error("Corda Network Error: ${it.message}"))
                    }, {
                        println("Verification Policy for securityDomain $securityDomain: ${it.state.data} \n")
                        Right(it.state.data)
                    })
        }.fold({ it }, {
            Left(Error("Corda Network Error: ${it.message}"))
        })
        verificationPolicy
    } catch (e: Exception) {
        Left(Error("Error with network connection: ${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class GetVerificationPoliciesCommand : CliktCommand(help = "Gets all Verification Policies") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        val eitherErrorStateId = getVerificationPolicies(
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Get Verification Policy result: $eitherErrorStateId")
    }
}

/**
 * Helper function used by GetVerificationPoliciesCommand to interact with the Corda network
 */
fun getVerificationPolicies(
    host: String,
    port: Int
): Either<Error, String> {
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Getting all verification policies")
        val proxy = rpc.proxy
        val verificationPolicies = proxy.startFlow(::GetVerificationPolicies)
                .returnValue.get()
        println("Verification Policies: $verificationPolicies\n")
        Right(verificationPolicies.toString())
    } catch (e: Exception) {
        Left(Error("${e.message}"))
    } finally {
        rpc.close()
    }
}
