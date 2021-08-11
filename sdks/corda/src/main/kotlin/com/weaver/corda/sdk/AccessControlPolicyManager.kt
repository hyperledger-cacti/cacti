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
import com.google.gson.Gson
import org.json.*

import net.corda.core.messaging.startFlow
import net.corda.core.messaging.CordaRPCOps
import net.corda.core.contracts.UniqueIdentifier

import com.weaver.corda.app.interop.states.AccessControlPolicyState
import com.weaver.corda.app.interop.flows.*


class AccessControlPolicyManager {
    companion object {
        private val logger = LoggerFactory.getLogger(InteroperableHelper::class.java)
        
        /**
         * Function to create an access control policy state in Vault
         */
        @JvmStatic
        fun createAccessControlPolicyState(
            proxy: CordaRPCOps,
            accessControlPolicy: String
        ): Either<Error, String> {
            var accessControlPolicyJSON = JSONObject(accessControlPolicy)
            val linearId = UniqueIdentifier()
            accessControlPolicyJSON.put("linearId", linearId)
            accessControlPolicyJSON.put("participants", JSONArray())
            
            val accessControlPolicyState = Gson().fromJson(
                accessControlPolicyJSON.toString(), 
                AccessControlPolicyState::class.java
            )
            logger.info("Writing AccessControlPolicyState: ${accessControlPolicyState}")
            return try {
                runCatching {
                    proxy.startFlow(::CreateAccessControlPolicy, accessControlPolicyState)
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
            accessControlPolicy: String
        ): Either<Error, String> {
            var accessControlPolicyJSON = JSONObject(accessControlPolicy)
            accessControlPolicyJSON.put("linearId", JSONObject())
            accessControlPolicyJSON.put("participants", JSONArray())
            
            val accessControlPolicyState = Gson().fromJson(
                accessControlPolicyJSON.toString(), 
                AccessControlPolicyState::class.java
            )
            logger.info("Update AccessControlPolicyState: ${accessControlPolicyState}")
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
            logger.info("Deleting access control policy for securityDomain $securityDomain")
            return try {
                logger.info("Deleting access control policy for securityDomain $securityDomain")
                val result = runCatching {
                    proxy.startFlow(::DeleteAccessControlPolicyState, securityDomain)
                            .returnValue.get().flatMap {
                                logger.info("Access Control Policy for securityDomain $securityDomain deleted\n")
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
        ): Either<Error, AccessControlPolicyState> {
            logger.info("Getting access control policy for securityDomain $securityDomain")
            return try {
                logger.info("Getting access control policy for securityDomain $securityDomain")
                val accessControlPolicy = runCatching {
                    proxy.startFlow(::GetAccessControlPolicyBySecurityDomain, securityDomain)
                            .returnValue.get().fold({
                                logger.info("Error getting access control policy from network: ${it.message}")
                                Left(Error("Corda Network Error: ${it.message}"))
                            }, {
                                logger.info("Access Control Policy for securityDomain $securityDomain: ${it.state.data} \n")
                                Right(it.state.data)
                            })
                }.fold({ it }, {
                    Left(Error("Corda Network Error: ${it.message}"))
                })
                accessControlPolicy
            } catch (e: Exception) {
                Left(Error("Error with network connection: ${e.message}"))
            }
        }

        /**
         * Helper function used by GetAccessControlPoliciesCommand to interact with the Corda network
         */
        @JvmStatic
        fun getAccessControlPolicies(
            proxy: CordaRPCOps
        ): Either<Error, String> {
            return try {
                logger.info("Getting all access control policies")
                val accessControlPolicies = proxy.startFlow(::GetAccessControlPolicies)
                        .returnValue.get()
                logger.info("Access Control Policies: $accessControlPolicies\n")
                Right(accessControlPolicies.toString())
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }
    }
}
