/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.client

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import kotlinx.coroutines.runBlocking
import com.google.protobuf.util.JsonFormat
import java.io.File
import java.lang.Exception
import java.util.*

import com.weaver.corda.sdk.CredentialsCreator

/**
 * TODO: Documentation
 */
class ConfigureAllCommand : CliktCommand(
        help = "Creates an Access Control Policy, Membership, and Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val networks: String by argument()
    override fun run() = runBlocking {
        configureCreateAllHelper()
        configDataHelper(config)
        for (network in networks.split(",")) {
            configNetworkHelper(network, config)
        }
    }
}

/**
 * TODO: Documentation
 */
class ConfigureDataCommand : CliktCommand(
        help = "Creates an Access Control Policy, Membership, and Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        configDataHelper(config)
    }
}

/**
 * TODO: Documentation
 */
class ConfigureNetworkCommand : CliktCommand(
        help = "Creates an Access Control Policy, Membership, and Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val network: String by argument()
    override fun run() = runBlocking {
        configNetworkHelper(network, config)
    }
}

/**
 * TODO: Documentation
 */
class ConfigureCreateAllCommand : CliktCommand(
        help = "Generate Access Control Policy, Membership, and Verification Policy for this network and stores in folder.") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        configureCreateAllHelper()
    }
}

/**
 * Helper function used by ConfigureDataCommand
 */
fun configDataHelper(config: Map<String, String>) {
    createStateHelper("H", "1", config)
    createStateHelper("C", "20", config)
}

/**
 * Helper function used by ConfigureNetworkCommand
 */
fun configNetworkHelper(network: String, config: Map<String, String>) {
    createMembershipFromFile(network, config)
    createAccessControlPolicyFromFile(network, config)
    createVerificationPolicyFromFile(network, config)
}

/**
 * Helper function used by ConfigureCreateAllCommand
 */
fun configureCreateAllHelper() {
    // Some variables specific to network
    val baseNodesPath = System.getenv("BASE_NODE_PATH") ?: "../../../tests/network-setups/corda/build/nodes/"
    val networkName = System.getenv("NETWORK_NAME") ?: "Corda_Network"
    val nodesList = System.getenv("NODES_LIST") ?: "PartyA"
    val remoteFlow = System.getenv("REMOTE_FLOW") ?: "mychannel:simplestate:Read:*"
    val locFlow = System.getenv("LOCAL_FLOW") ?: "localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:*"
    
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config"
    val destPath = "${credentialPath}/${networkName}/"
    val jsonPrinter = JsonFormat.printer().includingDefaultValueFields()
    
    val credentialsCreator = CredentialsCreator(
        baseNodesPath, 
        networkName, 
        nodesList.split(","), 
        remoteFlow, 
        locFlow
    )
    
    // Generate Membership
    val membership = credentialsCreator.createMembership()
    File(destPath + "/membership.json").bufferedWriter().use { out ->
      out.write(jsonPrinter.print(membership))
    }
    println("Membership written to ${destPath}/membership.json")

    // Generate Access Control Policy
    val accessControlPolicy = credentialsCreator.createAccessControlPolicy()
    File(destPath + "/access-control.json").bufferedWriter().use { out ->
      out.write(jsonPrinter.print(accessControlPolicy))
    }
    println("Access Control Policy written to ${destPath}/access-control.json")

    // Generate Verification Policy
    val verificationPolicy = credentialsCreator.createVerificationPolicy()
    File(destPath + "/verification-policy.json").bufferedWriter().use { out ->
      out.write(jsonPrinter.print(verificationPolicy))
    }
    println("Verification Policy written to ${destPath}/verification-policy.json")
}
