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
import com.cordaInteropApp.states.MembershipState
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
class CreateMembershipCommand : CliktCommand(help = "Creates a Membership for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network by argument()
    override fun run() = runBlocking {
        val result = when (network) {
            "Corda_Network" -> {
                Right(File("clients/src/main/resources/config/CordaNetworkMembership.json")
                        .readText(Charsets.UTF_8))
            }
            "Fabric_Network" -> {
                Right(File("clients/src/main/resources/config/FabricNetworkMembership.json")
                        .readText(Charsets.UTF_8))
            }
            else -> Left(Error("Only Fabric and Corda network memberships are defined"))
        }.flatMap {
            val membership = Gson().fromJson(it, MembershipState::class.java)
            println("Membership from file: $membership")
            writeMembershipToVault(
                    membership,
                    config["CORDA_HOST"]!!,
                    config["CORDA_PORT"]!!.toInt()
            )
        }
    }
}

/**
 * Helper function used by CreateMembershipCommand to interact with the Corda network
 */
fun writeMembershipToVault(
        membership: MembershipState,
        host: String,
        port: Int): Either<Error, String> {
    println("Storing membership in the vault")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Storing membership in the vault")
        val proxy = rpc.proxy
        val stateId = proxy.startFlow(::CreateMembershipState, membership)
                .returnValue.get()
        println("Membership stored with linearId $stateId")
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
class UpdateMembershipCommand : CliktCommand(help = "Updates a Membership for an external network. ") {
    val config by requireObject<Map<String, String>>()
    override fun run() = TODO("Not yet implemented")
}

/**
 * TODO: Documentation
 */
class DeleteMembershipCommand : CliktCommand(help = "Deletes a Membership for an external network. Requires the securityDomain. ") {
    val config by requireObject<Map<String, String>>()

    //    TODO: make this a flag instead of positional arguments
    val securityDomain by argument()
    override fun run() = runBlocking {
        val eitherErrorStateId = deleteMembership(
                securityDomain,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Corda network returned: $eitherErrorStateId")
    }
}

/**
 * Helper function used by DeleteMembershipCommand to interact with the Corda network
 */
fun deleteMembership(
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
        println("Deleting membership for securityDomain $securityDomain")
        val proxy = rpc.proxy
        val result = runCatching {
            proxy.startFlow(::DeleteMembershipState, securityDomain)
                    .returnValue.get().flatMap {
                        println("Membership for securityDomain $securityDomain deleted\n")
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
class GetMembershipCommand : CliktCommand(help = "Gets a Membership for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val securityDomain by argument()
    override fun run() = runBlocking {
        val eitherErrorStateId = getMembership(
                securityDomain,
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Get Membership result: $eitherErrorStateId")
    }
}

/**
 * Helper function used by GetMembershipCommand to interact with the Corda network
 */
fun getMembership(
        securityDomain: String,
        host: String,
        port: Int): Either<Error, MembershipState> {
    println("Getting membership for securityDomain $securityDomain")
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Getting membership for securityDomain $securityDomain")
        val proxy = rpc.proxy
        val membership = runCatching {
            proxy.startFlow(::GetMembershipStateBySecurityDomain, securityDomain)
                    .returnValue.get().fold({
                        println("Error getting membership from network: ${it.message}")
                        Left(Error("Corda Network Error: ${it.message}"))
                    }, {
                        println("Membership for network $securityDomain: ${it.state.data} \n")
                        Right(it.state.data)
                    })
        }.fold({ it }, {
            Left(Error("Corda Network Error: ${it.message}"))
        })
        membership
    } catch (e: Exception) {
        Left(Error("Error with network connection: ${e.message}"))
    } finally {
        rpc.close()
    }
}

/**
 * TODO: Documentation
 */
class GetMembershipsCommand : CliktCommand(help = "Gets all Memberships.") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        val eitherErrorStateId = getMemberships(
                config["CORDA_HOST"]!!,
                config["CORDA_PORT"]!!.toInt())
        println("Get Memberships result: $eitherErrorStateId")
    }
}

/**
 * Helper function used by GetMembershipsCommand to interact with the Corda network
 */
fun getMemberships(
    host: String,
    port: Int
): Either<Error, String> {
    val rpc = NodeRPCConnection(
            host = host,
            username = "clientUser1",
            password = "test",
            rpcPort = port)
    return try {
        println("Getting all memberships")
        val proxy = rpc.proxy
        val memberships = proxy.startFlow(::GetMembershipStates)
                .returnValue.get()
        println("Memberships: $memberships\n")
        Right(memberships.toString())
    } catch (e: Exception) {
        Left(Error("${e.message}"))
    } finally {
        rpc.close()
    }
}
