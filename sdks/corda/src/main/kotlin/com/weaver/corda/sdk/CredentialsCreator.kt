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
import com.google.gson.Gson
import com.google.gson.GsonBuilder;
import org.json.JSONObject
import java.util.*
import org.slf4j.LoggerFactory

  
class CredentialsCreator(
    baseNodesPath: String,
    securityDomain: String,
    nodesList: String,
    remoteFlow: String,
    locFlow: String
) {
    val cert_chain: List<String>
    val nodeid_cert: String
    val linearId = UniqueIdentifier()
    val nodes = nodesList.split(",").toTypedArray()
    val baseNodesPath = baseNodesPath
    val securityDomain = securityDomain
    val remoteFlow = remoteFlow
    val locFlow = locFlow
    val gson = GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create()
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
    
    fun createAccessControlPolicyState(): AccessControlPolicyState {
        val rule = Rule(this.nodeid_cert, "certificate", this.remoteFlow, true)
        return AccessControlPolicyState(this.securityDomain, listOf(rule), this.linearId, listOf())
    }
    fun createAccessControlPolicyJSON(corda: Boolean = true): String {
        val accessControlPolicy = this.createAccessControlPolicyState()
        val accessControlPolicyJSONString = this.gson.toJson(accessControlPolicy)
        if (corda) {
            return accessControlPolicyJSONString
        } else {
            val accessControlPolicyJSON = JSONObject(accessControlPolicyJSONString)
            accessControlPolicyJSON.remove("linearId")
            accessControlPolicyJSON.remove("participants")
            return accessControlPolicyJSON.toString()
        }
    }
    
    fun createMembershipState(): MembershipState {
        val memberNode0 = Member("", "certificate", this.cert_chain)
        val memberMap = mapOf(this.nodes[0] to memberNode0)
        return MembershipState(this.securityDomain, memberMap, this.linearId, listOf())
    }
    fun createMembershipJSON(corda: Boolean = true): String {
        val membership = this.createMembershipState()
        val membershipJSONString = this.gson.toJson(membership)
        if (corda) {
            return membershipJSONString
        } else {
            val membershipJSON = JSONObject(membershipJSONString)
            membershipJSON.remove("linearId")
            membershipJSON.remove("participants")
            return membershipJSON.toString()
        }
    }
    
    fun createVerificationPolicyState(): VerificationPolicyState {
        val verificationPolicyCriteria = this.nodes.toList()
        val policy = Policy("Signature", verificationPolicyCriteria)
        val identifier = Identifier(this.locFlow, policy)
        return VerificationPolicyState(this.securityDomain, listOf(identifier), this.linearId, listOf())
    }
    fun createVerificationPolicyJSON(corda: Boolean = true): String {
        val verificationPolicy = this.createVerificationPolicyState()
        val verificationPolicyJSONString = this.gson.toJson(verificationPolicy)
        if (corda) {
            return verificationPolicyJSONString
        } else {
            val verificationPolicyJSON = JSONObject(verificationPolicyJSONString)
            verificationPolicyJSON.remove("linearId")
            verificationPolicyJSON.remove("participants")
            return verificationPolicyJSON.toString()
        }
    }
}