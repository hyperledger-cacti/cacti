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

import com.weaver.corda.sdk.VerificationPolicyManager
import com.weaver.protos.common.verification_policy.VerificationPolicyOuterClass

/**
 * TODO: Documentation
 */
class CreateVerificationPolicyCommand : CliktCommand(help = "Creates a Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network by argument()
    val sharedPartiesNames by option("-p", "--parties", help="List of parties separated by \";\"")
    override fun run() = runBlocking {
        createVerificationPolicyFromFile(network, config, sharedPartiesNames)
    }
}

/**
 * Helper function to create a verification policy for an external network
 */
fun createVerificationPolicyFromFile(network: String, config: Map<String, String>, sharedPartiesNames: String? = null) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath = "${credentialPath}/${network}/verification-policy.json"
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
        val verificationPolicy = File(filepath).readText(Charsets.UTF_8)
        println("Verification policy from file: $verificationPolicy")
        var verificationPolicyBuilder = VerificationPolicyOuterClass.VerificationPolicy.newBuilder()
        JsonFormat.parser().merge(
            verificationPolicy, 
            verificationPolicyBuilder
        );
        println("Storing verification policy in the vault")
        val verificationPolicyProto = verificationPolicyBuilder.build()
        val res = VerificationPolicyManager.createVerificationPolicyState(
            rpc.proxy,
            verificationPolicyProto,
            sharedParties
        )
        if (res.isRight()) {
            println("Verification Policy Create Succesful Result: $res")            
        } else {
            val getRes = VerificationPolicyManager.getVerificationPolicyState(
                rpc.proxy, 
                verificationPolicyProto.securityDomain
            )
            if (getRes.isRight()) {
                updateVerificationPolicyFromFile(network, config)
            } else {
                println("Error: Verification Policy Create Failure Result: $res")    
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
class UpdateVerificationPolicyCommand : CliktCommand(help = "Updates a Verification Policy for an external network. Requires securityDomain, identifier and policy arguments") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    override fun run() = runBlocking {
        updateVerificationPolicyFromFile(network, config)
    }
}

/**
 * Helper function for UpdateVerificationPolicyCommand
 */
fun updateVerificationPolicyFromFile(network: String, config: Map<String, String>) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath = "${credentialPath}/${network}/verification-policy.json"
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        val verificationPolicy = File(filepath).readText(Charsets.UTF_8)
        println("Verification policy from file: $verificationPolicy")
        var verificationPolicyBuilder = VerificationPolicyOuterClass.VerificationPolicy.newBuilder()
        JsonFormat.parser().merge(
            verificationPolicy, 
            verificationPolicyBuilder
        );
        println("Updating verification policy for network")
        val res = VerificationPolicyManager.updateVerificationPolicyState(
            rpc.proxy,
            verificationPolicyBuilder.build()
        )
        println("Verification Policy Update Result: $res")
    } catch (e: Exception) {
        println("Error: ${e.toString()}")
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
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = VerificationPolicyManager.deleteVerificationPolicyState(
                rpc.proxy, 
                securityDomain
            )
            println("Delete Verification Policy State Result: ${res}")
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
class GetVerificationPolicyCommand : CliktCommand(help = "Gets Verification Policy for the provided securityDomain.") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = VerificationPolicyManager.getVerificationPolicyState(
                rpc.proxy, 
                securityDomain
            )
            println("Get Verification Policy State Result: ${res}")
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
class GetVerificationPoliciesCommand : CliktCommand(help = "Gets all Verification Policies") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = VerificationPolicyManager.getVerificationPolicies(
                rpc.proxy
            )
            println("Get All Verification Policies Result:\n${res}")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}
