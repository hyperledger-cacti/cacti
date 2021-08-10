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
import net.corda.core.contracts.UniqueIdentifier
import com.weaver.corda.app.interop.states.*
import com.weaver.corda.app.interop.flows.*
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.requireObject
import com.github.ajalt.clikt.parameters.arguments.argument
import com.google.gson.Gson
import com.google.gson.GsonBuilder;
import java.io.File
import java.lang.Exception
import kotlinx.coroutines.runBlocking
import net.corda.core.messaging.startFlow
import org.json.JSONObject
import java.util.*

import com.weaver.corda.sdk.CredentialsExtractor

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
    val result_membership = createMembershipFromFile(network, config)
    println(result_membership)
    val result_access_control = createAccessControlPolicyFromFile(network, config)
    println(result_access_control)
    val result_verification_policy = createVerificationPolicyFromFile(network, config)
    println(result_verification_policy)
}

/**
 * Helper function used by ConfigureCreateAllCommand
 */
fun configureCreateAllHelper() {
    // Some variables specific to network
    val baseNodesPath = System.getenv("BASE_NODE_PATH") ?: "../../../tests/network-setups/corda/build/nodes/"
    val networkName = System.getenv("NETWORK_NAME") ?: "Corda_Network"
    val credentialPath = System.getenv("MEMBER_CREDENTIAL_FOLDER") ?: "clients/src/main/resources/config"
    val nodesList = System.getenv("NODES_LIST") ?: "PartyA"
    val remoteFlow = System.getenv("REMOTE_FLOW") ?: "mychannel:simplestate:Read:*"
    val locFlow = System.getenv("LOCAL_FLOW") ?: "localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:*"

    val destPath = "${credentialPath}/${networkName}/"
    val nodes = nodesList.split(",").toTypedArray()
    val verificationPolicyCriteria = nodes.toList()

    val linearId = UniqueIdentifier()
    val gson = GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

    // Extracting Network certs
    val config = CredentialsExtractor.getConfig(baseNodesPath, nodes)
    val jsonConfig = JSONObject(config)
    val node0Json = jsonConfig.getJSONObject(nodes[0])
    val root_cert = Base64.getDecoder().decode(node0Json.getJSONArray("root_certs").getString(0)).toString(Charsets.UTF_8)
    val doorman_cert = Base64.getDecoder().decode(node0Json.getJSONArray("doorman_certs").getString(0)).toString(Charsets.UTF_8)
    val nodeca_cert = Base64.getDecoder().decode(node0Json.getJSONArray("nodeca_certs").getString(0)).toString(Charsets.UTF_8)
    val nodeid_cert = Base64.getDecoder().decode(node0Json.getJSONArray("nodeid_cert").getString(0)).toString(Charsets.UTF_8)
    val cert_chain = listOf(nodeca_cert, doorman_cert, root_cert)

    // Generate Membership
    val memberNode0 = Member("", "certificate", cert_chain)
    val memberMap = mapOf(nodes[0] to memberNode0)
    val membership = MembershipState(networkName, memberMap, linearId, listOf())
    File(destPath + "/membership.json").bufferedWriter().use { out ->
      out.write(gson.toJson(membership))
    }
    println("Membership written to ${destPath}/membership.json")

    // Generate Access Control Policy
    val rule = Rule(nodeid_cert, "certificate", remoteFlow, true)
    val accessControlPolicy = AccessControlPolicyState(networkName, listOf(rule), linearId, listOf())
    File(destPath + "/access-control.json").bufferedWriter().use { out ->
      out.write(gson.toJson(accessControlPolicy))
    }
    println("Access Control Policy written to ${destPath}/access-control.json")

    // Generate Verification Policy
    val policy = Policy("Signature", verificationPolicyCriteria)
    val identifier = Identifier(locFlow, policy)
    val verificationPolicy = VerificationPolicyState(networkName, listOf(identifier), linearId, listOf())
    File(destPath + "/verification-policy.json").bufferedWriter().use { out ->
      out.write(gson.toJson(verificationPolicy))
    }
    println("Verification Policy written to ${destPath}/verification-policy.json")
}
