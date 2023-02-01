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

import com.weaver.corda.sdk.MembershipManager
import com.weaver.protos.common.membership.MembershipOuterClass

/**
 * TODO: Documentation
 */
class CreateMembershipCommand : CliktCommand(help = "Creates a Membership for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network by argument()
    val sharedPartiesNames by option("-p", "--parties", help="List of parties separated by \";\"")
    override fun run() = runBlocking {
        createMembershipFromFile(network, config, sharedPartiesNames)
    }
}

/**
 * Helper function for CreateMembershipCommand
 */
fun createMembershipFromFile(network: String, config: Map<String, String>, sharedPartiesNames: String? = null) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath = "${credentialPath}/${network}/membership.json"
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
        val membership = File(filepath).readText(Charsets.UTF_8)
        println("Membership from file: $membership")
        val membershipBuilder = MembershipOuterClass.Membership.newBuilder()
        JsonFormat.parser().merge(
            membership, 
            membershipBuilder
        );
        println("Storing membership in the vault")
        val membershipProto = membershipBuilder.build()
        val res = MembershipManager.createMembershipState(
            rpc.proxy,
            membershipProto,
            sharedParties
        )
        if (res.isRight()) {
            println("Membership Create Succesful Result: $res")            
        } else {
            val getRes = MembershipManager.getMembershipState(
                rpc.proxy, 
                membershipProto.securityDomain
            )
            if (getRes.isRight()) {
                updateMembershipFromFile(network, config)
            } else {
                println("Error: Membership Create Failure Result: $res")    
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
class UpdateMembershipCommand : CliktCommand(help = "Updates a Membership for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    override fun run() = runBlocking {
        updateMembershipFromFile(network, config)
    }
}

/**
 * Helper function for UpdateMembershipCommand
 */
fun updateMembershipFromFile(network: String, config: Map<String, String>) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val filepath = "${credentialPath}/${network}/membership.json"
    val rpc = NodeRPCConnection(
            host = config["CORDA_HOST"]!!,
            username = "clientUser1",
            password = "test",
            rpcPort = config["CORDA_PORT"]!!.toInt())
    try {
        val membership = File(filepath).readText(Charsets.UTF_8)
        println("Membership from file: $membership")
        val membershipBuilder = MembershipOuterClass.Membership.newBuilder()
        JsonFormat.parser().merge(
            membership, 
            membershipBuilder
        );
        println("Updating membership in the vault")
        val res = MembershipManager.updateMembershipState(
            rpc.proxy,
            membershipBuilder.build()
        )
        println("Membership Update Result: $res")
    } catch (e: Exception) {
        println("Error: ${e.toString()}")
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class DeleteMembershipCommand : CliktCommand(help = "Deletes a Membership for an external network. Requires the securityDomain. ") {
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
            val res = MembershipManager.deleteMembershipState(
                rpc.proxy, 
                securityDomain
            )
            println("Delete Membership State Result: ${res}")
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
class GetMembershipCommand : CliktCommand(help = "Gets a Membership for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = MembershipManager.getMembershipState(
                rpc.proxy, 
                securityDomain
            )
            println("Get Membership Result:\n${res}")
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
class GetMembershipsCommand : CliktCommand(help = "Gets all Memberships.") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        val rpc = NodeRPCConnection(
                host = config["CORDA_HOST"]!!,
                username = "clientUser1",
                password = "test",
                rpcPort = config["CORDA_PORT"]!!.toInt())
        try {
            val res = MembershipManager.getMemberships(rpc.proxy)
            println("Get All Memberships Result:\n${res}")
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        } finally {
            rpc.close()
        }
    }
}
