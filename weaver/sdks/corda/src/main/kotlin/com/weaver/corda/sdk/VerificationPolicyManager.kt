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

import com.weaver.corda.app.interop.states.VerificationPolicyState
import com.weaver.corda.app.interop.states.Identifier
import com.weaver.corda.app.interop.states.Policy
import com.weaver.corda.app.interop.flows.*
import com.weaver.protos.common.verification_policy.VerificationPolicyOuterClass


class VerificationPolicyManager {
    companion object {
        private val logger = LoggerFactory.getLogger(VerificationPolicyManager::class.java)
        
        /**
         * Function to create an verification policy state in Vault
         */
        @JvmStatic
        @JvmOverloads fun createVerificationPolicyState(
            proxy: CordaRPCOps,
            verificationPolicyProto: VerificationPolicyOuterClass.VerificationPolicy,
            sharedParties: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            val verificationPolicyState = protoToState(verificationPolicyProto)
            logger.debug("Writing VerificationPolicyState: ${verificationPolicyState}")
            return try {
                runCatching {
                    proxy.startFlow(::CreateVerificationPolicyState, verificationPolicyState, sharedParties)
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
            verificationPolicyProto: VerificationPolicyOuterClass.VerificationPolicy
        ): Either<Error, String> {
            val verificationPolicyState = protoToState(verificationPolicyProto)
            logger.debug("Update VerificationPolicyState: ${verificationPolicyState}")
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
            logger.debug("Deleting verification policy for securityDomain $securityDomain")
            return try {
                logger.debug("Deleting verification policy for securityDomain $securityDomain")
                val result = runCatching {
                    proxy.startFlow(::DeleteVerificationPolicyState, securityDomain)
                            .returnValue.get().flatMap {
                                logger.debug("Verification Policy for securityDomain $securityDomain deleted\n")
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
        ): Either<Error, VerificationPolicyOuterClass.VerificationPolicy> {
            return try {
                logger.debug("Getting verification policy for securityDomain $securityDomain")
                val verificationPolicy = runCatching {
                    proxy.startFlow(::GetVerificationPolicyStateBySecurityDomain, securityDomain)
                            .returnValue.get().fold({
                                logger.error("Error getting verification policy from network: ${it.message}")
                                Left(Error("Corda Network Error: ${it.message}"))
                            }, {
                                logger.debug("Verification Policy for securityDomain $securityDomain: ${it.state.data} \n")
                                Right(stateToProto(it.state.data))
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
         * Function to get all verification policies from Vault
         */
        @JvmStatic
        fun getVerificationPolicies(
            proxy: CordaRPCOps
        ): Either<Error, List<VerificationPolicyOuterClass.VerificationPolicy>> {
            return try {
                logger.debug("Getting all verification policies")
                val verificationPolicies = proxy.startFlow(::GetVerificationPolicies)
                        .returnValue.get()
                        
                var verificationPolicyList: List<VerificationPolicyOuterClass.VerificationPolicy> = listOf()
                for (vp in verificationPolicies) {
                    verificationPolicyList += stateToProto(vp.state.data)
                }
                logger.debug("Verification Policies: $verificationPolicyList\n")
                Right(verificationPolicyList)
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }
        
        /**
         * Function to convert proto VerificationPolicyOuterClass.VerificationPolicy
         * to  state VerificationPolicyState
         */
        @JvmStatic
        fun protoToState(
            verificationPolicyProto: VerificationPolicyOuterClass.VerificationPolicy
        ): VerificationPolicyState {
            var identifiers: List<Identifier> = listOf()
            for (identifierProto in verificationPolicyProto.identifiersList) {
                val identifier = Identifier(
                    pattern = identifierProto.pattern,
                    policy = Policy(identifierProto.policy.type, identifierProto.policy.criteriaList)
                )
                identifiers += identifier
            }
            
            return VerificationPolicyState(
                securityDomain = verificationPolicyProto.securityDomain,
                identifiers = identifiers
            )
        }
        
        /**
         * Function to convert state VerificationPolicyState to
         * proto VerificationPolicyOuterClass.VerificationPolicy
         */
        @JvmStatic
        fun stateToProto(
            verificationPolicyState: VerificationPolicyState
        ): VerificationPolicyOuterClass.VerificationPolicy {
            var identifiersList: List<VerificationPolicyOuterClass.Identifier> = listOf()
            for (identifier in verificationPolicyState.identifiers) {
                val policyProto = VerificationPolicyOuterClass.Policy.newBuilder()
                    .setType(identifier.policy.type)
                    .addAllCriteria(identifier.policy.criteria)
                val identifierProto = VerificationPolicyOuterClass.Identifier.newBuilder()
                    .setPattern(identifier.pattern)
                    .setPolicy(policyProto)
                    .build()
                identifiersList += identifierProto
            }
                    
            return VerificationPolicyOuterClass.VerificationPolicy.newBuilder()
                    .setSecurityDomain(verificationPolicyState.securityDomain)
                    .addAllIdentifiers(identifiersList)
                    .build()
        }
    }
}
