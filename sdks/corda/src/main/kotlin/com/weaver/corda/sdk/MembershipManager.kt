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

import com.weaver.corda.app.interop.states.MembershipState
import com.weaver.corda.app.interop.flows.*


class MembershipManager {
    companion object {
        private val logger = LoggerFactory.getLogger(InteroperableHelper::class.java)
        
        /**
         * Function to create an membership state in Vault
         */
        @JvmStatic
        fun createMembershipState(
            proxy: CordaRPCOps,
            membership: String
        ): Either<Error, String> {
            var membershipJSON = JSONObject(membership)
            val linearId = UniqueIdentifier()
            membershipJSON.put("linearId", JSONObject().put("id", linearId))
            membershipJSON.put("participants", JSONArray())
            
            val membershipState = Gson().fromJson(
                membershipJSON.toString(), 
                MembershipState::class.java
            )
            logger.info("Writing MembershipState: ${membershipState}")
            return try {
                runCatching {
                    proxy.startFlow(::CreateMembershipState, membershipState)
                            .returnValue.get()
                }.fold({
                    it.flatMap {
                        Right(it.toString())
                    }
                }, {
                    Left(Error("Error running CreateMembership flow: ${it.message}"))
                })
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }

        /**
         * Function to update an membership state in Vault
         */
        @JvmStatic
        fun updateMembershipState(
            proxy: CordaRPCOps,
            membership: String
        ): Either<Error, String> {
            var membershipJSON = JSONObject(membership)
            membershipJSON.put("linearId", JSONObject())
            membershipJSON.put("participants", JSONArray())
            
            val membershipState = Gson().fromJson(
                membershipJSON.toString(), 
                MembershipState::class.java
            )
            logger.info("Update MembershipState: ${membershipState}")
            return try {
                runCatching {
                    proxy.startFlow(::UpdateMembershipState, membershipState)
                            .returnValue.get()
                }.fold({
                    it.flatMap {
                        Right(it.toString())
                    }
                }, {
                    Left(Error("Error running UpdateMembershipState flow: ${it.message}"))
                })
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }

        /**
         * Function to delete an membership state from Vault
         */
        @JvmStatic
        fun deleteMembershipState(
            proxy: CordaRPCOps,
            securityDomain: String
        ): Either<Error, String> {
            logger.info("Deleting membership for securityDomain $securityDomain")
            return try {
                logger.info("Deleting membership for securityDomain $securityDomain")
                val result = runCatching {
                    proxy.startFlow(::DeleteMembershipState, securityDomain)
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
         * Function to get an membership state from Vault
         */
        @JvmStatic
        fun getMembershipState(
            proxy: CordaRPCOps,
            securityDomain: String
        ): Either<Error, MembershipState> {
            return try {
                logger.debug("Getting membership for securityDomain $securityDomain")
                val membership = runCatching {
                    proxy.startFlow(::GetMembershipStateBySecurityDomain, securityDomain)
                            .returnValue.get().fold({
                                logger.error("Error getting membership from network: ${it.message}")
                                Left(Error("Corda Network Error: ${it.message}"))
                            }, {
                                logger.debug("Access Control Policy for securityDomain $securityDomain: ${it.state.data} \n")
                                Right(it.state.data)
                            })
                }.fold({ it }, {
                    Left(Error("Corda Network Error: ${it.message}"))
                })
                membership
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
        ): Either<Error, List<MembershipState>> {
            return try {
                logger.debug("Getting all memberships")
                val memberships = proxy.startFlow(::GetMembershipStates)
                        .returnValue.get()
                        
                var membershipList: List<MembershipState> = listOf()
                for (membershipItem in memberships) {
                    membershipList += membershipItem.state.data
                }
                logger.debug("Access Control Policies: $membershipList\n")
                Right(membershipList)
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }
    }
}
