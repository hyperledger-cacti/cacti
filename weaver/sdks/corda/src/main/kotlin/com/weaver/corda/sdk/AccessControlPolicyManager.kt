/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.sdk;

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import arrow.core.flatMap
import kotlinx.coroutines.runBlocking
import java.lang.Exception
import org.slf4j.LoggerFactory

import net.corda.core.messaging.startFlow
import net.corda.core.messaging.CordaRPCOps
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party

import com.weaver.corda.app.interop.states.AccessControlPolicyState
import com.weaver.corda.app.interop.states.Rule
import com.weaver.corda.app.interop.flows.*
import com.weaver.protos.common.access_control.AccessControl


class AccessControlPolicyManager {
    companion object {
        private val logger = LoggerFactory.getLogger(AccessControlPolicyManager::class.java)
        
        /**
         * Function to create an access control policy state in Vault
         */
        @JvmStatic
        @JvmOverloads fun createAccessControlPolicyState(
            proxy: CordaRPCOps,
            accessControlPolicyProto: AccessControl.AccessControlPolicy,
            sharedParties: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            val accessControlPolicyState = protoToState(accessControlPolicyProto)
            logger.debug("Writing AccessControlPolicyState: ${accessControlPolicyState}")
            return try {
                runCatching {
                    proxy.startFlow(::CreateAccessControlPolicy, accessControlPolicyState, sharedParties)
                            .returnValue.get()
                }.fold({
                    it.flatMap {
                        Right(it.toString())
                    }
                }, {
                    Left(Error("Error running CreateAccessControlPolicy flow: ${it.message}"))
                })
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }

        /**
         * Function to update an access control policy state in Vault
         */
        @JvmStatic
        fun updateAccessControlPolicyState(
            proxy: CordaRPCOps,
            accessControlPolicyProto: AccessControl.AccessControlPolicy
        ): Either<Error, String> {
            val accessControlPolicyState = protoToState(accessControlPolicyProto)
            logger.debug("Update AccessControlPolicyState: ${accessControlPolicyState}")
            return try {
                runCatching {
                    proxy.startFlow(::UpdateAccessControlPolicyState, accessControlPolicyState)
                            .returnValue.get()
                }.fold({
                    it.flatMap {
                        Right(it.toString())
                    }
                }, {
                    Left(Error("Error running UpdateAccessControlPolicyState flow: ${it.message}"))
                })
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }

        /**
         * Function to delete an access control policy state from Vault
         */
        @JvmStatic
        fun deleteAccessControlPolicyState(
            proxy: CordaRPCOps,
            securityDomain: String
        ): Either<Error, String> {
            logger.debug("Deleting access control policy for securityDomain $securityDomain")
            return try {
                logger.debug("Deleting access control policy for securityDomain $securityDomain")
                val result = runCatching {
                    proxy.startFlow(::DeleteAccessControlPolicyState, securityDomain)
                            .returnValue.get().flatMap {
                                logger.debug("Access Control Policy for securityDomain $securityDomain deleted\n")
                                Right(it.toString())
                            }
                }.fold({ it }, { Left(Error(it.message)) })
                result
            } catch (e: Exception) {
                Left(Error("Corda Network Error: ${e.message}"))
            }
        }

        /**
         * Function to get an access control policy state from Vault
         */
        @JvmStatic
        fun getAccessControlPolicyState(
            proxy: CordaRPCOps,
            securityDomain: String
        ): Either<Error, AccessControl.AccessControlPolicy> {
            return try {
                logger.debug("Getting access control policy for securityDomain $securityDomain")
                val accessControlPolicyState = runCatching {
                    proxy.startFlow(::GetAccessControlPolicyBySecurityDomain, securityDomain)
                            .returnValue.get().fold({
                                logger.error("Error getting access control policy from network: ${it.message}")
                                Left(Error("Corda Network Error: ${it.message}"))
                            }, {
                                logger.debug("Access Control Policy for securityDomain $securityDomain: ${it.state.data} \n")
                                Right(stateToProto(it.state.data))
                            })
                }.fold({ it }, {
                    Left(Error("Corda Network Error: ${it.message}"))
                })
                accessControlPolicyState
            } catch (e: Exception) {
                Left(Error("Error with network connection: ${e.message}"))
            }
        }

        /**
         * Function to get all access control policies from Vault
         */
        @JvmStatic
        fun getAccessControlPolicies(
            proxy: CordaRPCOps
        ): Either<Error, List<AccessControl.AccessControlPolicy>> {
            return try {
                logger.debug("Getting all access control policies")
                val accessControlPolicies = proxy.startFlow(::GetAccessControlPolicies)
                        .returnValue.get()
                        
                var accessControlPolicyList: List<AccessControl.AccessControlPolicy> = listOf()
                for (acl in accessControlPolicies) {
                    accessControlPolicyList += stateToProto(acl.state.data)
                }
                logger.debug("Access Control Policies: $accessControlPolicyList\n")
                Right(accessControlPolicyList)
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }
        
        /**
         * Function to convert proto AccessControl.AccessControlPolicy to state AccessControlPolicyState
         */
        @JvmStatic
        fun protoToState(
            accessControlPolicyProto: AccessControl.AccessControlPolicy
        ): AccessControlPolicyState {
            var rules: List<Rule> = listOf()
            for (ruleProto in accessControlPolicyProto.rulesList) {
                val rule = Rule(
                    principal = ruleProto.principal,
                    principalType = ruleProto.principalType,
                    resource = ruleProto.resource,
                    read = ruleProto.read
                )
                rules += rule
            }
            
            return AccessControlPolicyState(
                securityDomain = accessControlPolicyProto.securityDomain,
                rules = rules
            )
        }
        
        /**
         * Function to convert state AccessControlPolicyState to proto AccessControl.AccessControlPolicy
         */
        @JvmStatic
        fun stateToProto(
            accessControlPolicyState: AccessControlPolicyState
        ): AccessControl.AccessControlPolicy {
            var rulesList: List<AccessControl.Rule> = listOf()
            for (rule in accessControlPolicyState.rules) {
                val ruleProto = AccessControl.Rule.newBuilder()
                    .setPrincipal(rule.principal)
                    .setPrincipalType(rule.principalType)
                    .setResource(rule.resource)
                    .setRead(rule.read)
                    .build()
                rulesList += ruleProto
            }
                    
            return AccessControl.AccessControlPolicy.newBuilder()
                    .setSecurityDomain(accessControlPolicyState.securityDomain)
                    .addAllRules(rulesList)
                    .build()
        }
    }
}
