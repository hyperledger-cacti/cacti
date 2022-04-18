/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
 /**
  * Helper function used by ConfigureCreateAllCommand
  */
  
package com.weaver.corda.sdk;

import net.corda.core.contracts.UniqueIdentifier
import org.json.JSONObject
import java.util.*
import org.slf4j.LoggerFactory

import com.weaver.protos.common.access_control.AccessControl
import com.weaver.protos.common.membership.MembershipOuterClass
import com.weaver.protos.common.verification_policy.VerificationPolicyOuterClass


/**
 * The CredentialsCreator flow is used to create memberships, access control
 * and verification policies for your local network that can be consumed by
 * remote network.
 *
 * @property baseNodesPath Path to build/nodes directory of this corda network
 * @property securityDomain Security Domain Name for this Corda Network.
 * @property nodesList List of names of Nodes in this Corda Network.
 * @property remoteFlow Flow pattern for local flow to be used in access control policy.
 * @property locFlow Flow pattern for remote flow to be used in verification policy.
 */
class CredentialsCreator(
    baseNodesPath: String,
    securityDomain: String,
    nodesList: List<String>,
    remoteFlow: String,
    locFlow: String
) {
    var cert_chain: Map<String, List<String>> = mapOf()
    var nodeid_cert: Map<String, String> = mapOf()
    val nodes = nodesList.toTypedArray()
    val baseNodesPath = baseNodesPath
    val securityDomain = securityDomain
    val remoteFlow = remoteFlow
    val locFlow = locFlow
    private val logger = LoggerFactory.getLogger(CredentialsCreator::class.java)
    init {
        // Extracting Network certs
        val config = CredentialsExtractor.getConfig(baseNodesPath, nodes)
        val jsonConfig = JSONObject(config)
        for (i in 0..nodes.size-1) {
            val node0Json = jsonConfig.getJSONObject(nodes[i])
            val root_cert = Base64.getDecoder().decode(node0Json.getJSONArray("root_certs").getString(0)).toString(Charsets.UTF_8)
            val doorman_cert = Base64.getDecoder().decode(node0Json.getJSONArray("doorman_certs").getString(0)).toString(Charsets.UTF_8)
            val nodeca_cert = Base64.getDecoder().decode(node0Json.getJSONArray("nodeca_certs").getString(0)).toString(Charsets.UTF_8)
            
            // Initialising class variables
            this.nodeid_cert += mapOf(nodes[i] to Base64.getDecoder().decode(node0Json.getJSONArray("nodeid_cert").getString(0)).toString(Charsets.UTF_8))
            this.cert_chain += mapOf(nodes[i] to listOf(root_cert, doorman_cert, nodeca_cert))
        }
        logger.debug("Cert Chain: ${this.cert_chain}")
    }
    
    /*
     * @return Returns access control policy proto object.
     */
    fun createAccessControlPolicy(): AccessControl.AccessControlPolicy {
        var rulesList: List<AccessControl.Rule> = listOf()
        for (node in nodes) {
            val ruleProto = AccessControl.Rule.newBuilder()
                .setPrincipal(this.nodeid_cert.getValue(node))
                .setPrincipalType("certificate")
                .setResource(this.remoteFlow)
                .setRead(true)
                .build()
            rulesList += ruleProto            
        }
        return AccessControl.AccessControlPolicy.newBuilder()
                .setSecurityDomain(this.securityDomain)
                .addAllRules(rulesList)
                .build()
    }
    
    /*
     * @return Returns Membership proto object.
     */
    fun createMembership(): MembershipOuterClass.Membership {
        var membersMap: Map<String, MembershipOuterClass.Member> = mapOf()
        for ((memberId,  member_cert_chain) in this.cert_chain) {
            val memberProto = MembershipOuterClass.Member.newBuilder()
                .setValue("")
                .setType("certificate")
                .addAllChain(member_cert_chain)
                .build()
            membersMap += mapOf(memberId to memberProto)
        }
        return MembershipOuterClass.Membership.newBuilder()
                .setSecurityDomain(this.securityDomain)
                .putAllMembers(membersMap)
                .build()
    }
    
    /*
     * @return Returns Verification policy proto object.
     */
    fun createVerificationPolicy(): VerificationPolicyOuterClass.VerificationPolicy {
        val policyProto = VerificationPolicyOuterClass.Policy.newBuilder()
            .setType("Signature")
            .addAllCriteria(this.nodes.toList())
        val identifierProto = VerificationPolicyOuterClass.Identifier.newBuilder()
            .setPattern(this.locFlow)
            .setPolicy(policyProto)
            .build()
        return VerificationPolicyOuterClass.VerificationPolicy.newBuilder()
                .setSecurityDomain(this.securityDomain)
                .addAllIdentifiers(listOf(identifierProto))
                .build()
    }
}
