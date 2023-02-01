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
import kotlinx.coroutines.runBlocking
import com.google.protobuf.util.JsonFormat
import java.io.File
import java.lang.Exception
import java.util.*
import java.nio.file.Files
import java.nio.file.Paths
import java.util.stream.Collectors
import net.corda.core.identity.Party

import com.weaver.corda.sdk.CredentialsCreator

class ConfigureCommand : CliktCommand(help ="Configure Command") {
    override fun run() {
    }
}


/**
 * TODO: Documentation
 */
class ConfigureAllCommand : CliktCommand(name="all",
        help = "Creates an Access Control Policy, Membership, and Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        configureCreateAllHelper()
        configDataHelper(config)
        configNetworkHelper(config)
    }
}

/**
 * TODO: Documentation
 */
class ConfigureDataCommand : CliktCommand(name="data",
        help = "Creates SimpleStates in network. ") {
    val config by requireObject<Map<String, String>>()
    override fun run() = runBlocking {
        configDataHelper(config)
    }
}

/**
 * TODO: Documentation
 */
class ConfigureNetworkCommand : CliktCommand(name="network",
        help = "Creates an Access Control Policy, Membership, and Verification Policy for an external network. ") {
    val config by requireObject<Map<String, String>>()
    val sharedPartiesNames by option("-p", "--parties", help="List of parties separated by \";\"")
    override fun run() = runBlocking {
        configNetworkHelper(config, sharedPartiesNames)
    }
}

/**
 * TODO: Documentation
 */
class ConfigureCreateAllCommand : CliktCommand(name="create-all",
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
fun configNetworkHelper(config: Map<String, String>, sharedPartiesNames: String? = null) {
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val myNetworkName = System.getenv("NETWORK_NAME") ?: "Corda_Network"
    val networkNames: Set<String> = Files.list(Paths.get(credentialPath))
        .filter { file -> Files.isDirectory(file) }
        .map { it -> it.fileName }
        .map { it -> it.toString() }
        .collect(Collectors.toSet());
    println("All network credentials found: ${networkNames}")
    for (networkName in networkNames) {
        if (networkName != myNetworkName) {
            println("Network ${networkName}")
            createMembershipFromFile(networkName, config, sharedPartiesNames)
            createAccessControlPolicyFromFile(networkName, config, sharedPartiesNames)
            createVerificationPolicyFromFile(networkName, config, sharedPartiesNames)
        }
    }
}

/**
 * Helper function used by ConfigureCreateAllCommand
 */
fun configureCreateAllHelper() {
    // Some variables specific to network
    val networkName = System.getenv("NETWORK_NAME") ?: "Corda_Network"
    val baseNodesPath = System.getenv("BASE_NODE_PATH") ?: "../../../tests/network-setups/corda/dev/" + networkName + "/build/nodes/"
    val nodesList = System.getenv("NODES_LIST") ?: "PartyA"

    val partyHost = System.getenv("CORDA_HOST") ?: "localhost"
    val partyPort = System.getenv("CORDA_PORT") ?: "10006"
    val defaultCordaFlow = partyHost + ":" + partyPort + "#com.cordaSimpleApplication.flow.GetStateByKey:*"

    val remoteFlow = System.getenv("REMOTE_FLOW") ?: "mychannel:simplestate:Read:*" 
    val locFlow = System.getenv("LOCAL_FLOW") ?: defaultCordaFlow
    
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config/credentials"
    val destPath = "${credentialPath}/${networkName}/"
    val jsonPrinter = JsonFormat.printer().includingDefaultValueFields()

    println("Base node path: ${baseNodesPath}")
    println("Flow: ${locFlow}")

    val destPathObj = File(destPath);
    if (!destPathObj.exists()){
        destPathObj.mkdir()
    }
    
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
