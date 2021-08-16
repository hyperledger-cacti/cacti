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
import com.weaver.corda.app.interop.states.*
import com.weaver.corda.app.interop.flows.*
import org.json.JSONObject
import java.util.*
import org.slf4j.LoggerFactory

import com.weaver.protos.common.access_control.AccessControl
import com.weaver.protos.common.membership.MembershipOuterClass
import com.weaver.protos.common.verification_policy.VerificationPolicyOuterClass


  
class CredentialsCreator(
    baseNodesPath: String,
    securityDomain: String,
    nodesList: String,
    remoteFlow: String,
    locFlow: String
) {
    val cert_chain: List<String>
    val nodeid_cert: String
    val nodes = nodesList.split(",").toTypedArray()
    val baseNodesPath = baseNodesPath
    val securityDomain = securityDomain
    val remoteFlow = remoteFlow
    val locFlow = locFlow
    private val logger = LoggerFactory.getLogger(CredentialsCreator::class.java)
    init {
        // Extracting Network certs
        val config = CredentialsExtractor.getConfig(baseNodesPath, nodes)
        val jsonConfig = JSONObject(config)
        val node0Json = jsonConfig.getJSONObject(nodes[0])
        val root_cert = Base64.getDecoder().decode(node0Json.getJSONArray("root_certs").getString(0)).toString(Charsets.UTF_8)
        val doorman_cert = Base64.getDecoder().decode(node0Json.getJSONArray("doorman_certs").getString(0)).toString(Charsets.UTF_8)
        val nodeca_cert = Base64.getDecoder().decode(node0Json.getJSONArray("nodeca_certs").getString(0)).toString(Charsets.UTF_8)
        
        // Initialising class variables
        this.nodeid_cert = Base64.getDecoder().decode(node0Json.getJSONArray("nodeid_cert").getString(0)).toString(Charsets.UTF_8)
        this.cert_chain = listOf(root_cert, doorman_cert, nodeca_cert)
        logger.debug("Cert Chain: ${this.cert_chain}")
    }
    
    fun createAccessControlPolicy(): AccessControl.AccessControlPolicy {
        val rule = Rule(this.nodeid_cert, "certificate", this.remoteFlow, true)
        val accessControlPolicyState = AccessControlPolicyState(
            this.securityDomain, 
            listOf(rule)
        )
        return AccessControlPolicyManager.stateToProto(accessControlPolicyState)
    }
    
    fun createMembershipState(): MembershipOuterClass.Membership {
        val memberNode0 = Member("", "certificate", this.cert_chain)
        val memberMap = mapOf(this.nodes[0] to memberNode0)
        val membershipState = MembershipState(
            this.securityDomain, 
            memberMap
        )
        return MembershipManager.stateToProto(membershipState)
    }
    
    fun createVerificationPolicyState(): VerificationPolicyOuterClass.VerificationPolicy {
        val verificationPolicyCriteria = this.nodes.toList()
        val policy = Policy("Signature", verificationPolicyCriteria)
        val identifier = Identifier(this.locFlow, policy)
        val verificationPolicyState = VerificationPolicyState(
            this.securityDomain, 
            listOf(identifier)
        )
        return VerificationPolicyManager.stateToProto(verificationPolicyState)
    }
}