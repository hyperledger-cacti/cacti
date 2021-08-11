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

import com.weaver.corda.app.interop.states.VerificationPolicyState
import com.weaver.corda.app.interop.flows.*


class VerificationPolicyManager {
    companion object {
        private val logger = LoggerFactory.getLogger(InteroperableHelper::class.java)
        
        /**
         * Function to create an verification policy state in Vault
         */
        @JvmStatic
        fun createVerificationPolicyState(
            proxy: CordaRPCOps,
            verificationPolicy: String
        ): Either<Error, String> {
            var verificationPolicyJSON = JSONObject(verificationPolicy)
            val linearId = UniqueIdentifier()
            verificationPolicyJSON.put("linearId", JSONObject().put("id", linearId))
            verificationPolicyJSON.put("participants", JSONArray())
            
            val verificationPolicyState = Gson().fromJson(
                verificationPolicyJSON.toString(), 
                VerificationPolicyState::class.java
            )
            logger.info("Writing VerificationPolicyState: ${verificationPolicyState}")
            return try {
                runCatching {
                    proxy.startFlow(::CreateVerificationPolicyState, verificationPolicyState)
                            .returnValue.get()
                }.fold({
                    it.flatMap {
                        Right(it.toString())
                    }
                }, {
                    Left(Error("Error running CreateVerificationPolicy flow: ${it.message}"))
                })
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }

        /**
         * Function to update an verification policy state in Vault
         */
        @JvmStatic
        fun updateVerificationPolicyState(
            proxy: CordaRPCOps,
            verificationPolicy: String
        ): Either<Error, String> {
            var verificationPolicyJSON = JSONObject(verificationPolicy)
            verificationPolicyJSON.put("linearId", JSONObject())
            verificationPolicyJSON.put("participants", JSONArray())
            
            val verificationPolicyState = Gson().fromJson(
                verificationPolicyJSON.toString(), 
                VerificationPolicyState::class.java
            )
            logger.info("Update VerificationPolicyState: ${verificationPolicyState}")
            return try {
                runCatching {
                    proxy.startFlow(::UpdateVerificationPolicyState, verificationPolicyState)
                            .returnValue.get()
                }.fold({
                    it.flatMap {
                        Right(it.toString())
                    }
                }, {
                    Left(Error("Error running UpdateVerificationPolicyState flow: ${it.message}"))
                })
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }

        /**
         * Function to delete an verification policy state from Vault
         */
        @JvmStatic
        fun deleteVerificationPolicyState(
            proxy: CordaRPCOps,
            securityDomain: String
        ): Either<Error, String> {
            logger.info("Deleting verification policy for securityDomain $securityDomain")
            return try {
                logger.info("Deleting verification policy for securityDomain $securityDomain")
                val result = runCatching {
                    proxy.startFlow(::DeleteVerificationPolicyState, securityDomain)
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
         * Function to get an verification policy state from Vault
         */
        @JvmStatic
        fun getVerificationPolicyState(
            proxy: CordaRPCOps,
            securityDomain: String
        ): Either<Error, VerificationPolicyState> {
            return try {
                logger.debug("Getting verification policy for securityDomain $securityDomain")
                val verificationPolicy = runCatching {
                    proxy.startFlow(::GetVerificationPolicyStateBySecurityDomain, securityDomain)
                            .returnValue.get().fold({
                                logger.error("Error getting verification policy from network: ${it.message}")
                                Left(Error("Corda Network Error: ${it.message}"))
                            }, {
                                logger.debug("Access Control Policy for securityDomain $securityDomain: ${it.state.data} \n")
                                Right(it.state.data)
                            })
                }.fold({ it }, {
                    Left(Error("Corda Network Error: ${it.message}"))
                })
                verificationPolicy
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
        ): Either<Error, List<VerificationPolicyState>> {
            return try {
                logger.debug("Getting all verification policies")
                val verificationPolicies = proxy.startFlow(::GetVerificationPolicies)
                        .returnValue.get()
                        
                var verificationPolicyList: List<VerificationPolicyState> = listOf()
                for (vp in verificationPolicies) {
                    verificationPolicyList += vp.state.data
                }
                logger.debug("Access Control Policies: $verificationPolicyList\n")
                Right(verificationPolicyList)
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }
    }
}
