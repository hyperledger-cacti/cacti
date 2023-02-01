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

import com.weaver.corda.app.interop.states.MembershipState
import com.weaver.corda.app.interop.states.Member
import com.weaver.corda.app.interop.flows.*
import com.weaver.protos.common.membership.MembershipOuterClass


class MembershipManager {
    companion object {
        private val logger = LoggerFactory.getLogger(MembershipManager::class.java)
        
        /**
         * Function to create an membership state in Vault
         */
        @JvmStatic
        @JvmOverloads fun createMembershipState(
            proxy: CordaRPCOps,
            membershipProto: MembershipOuterClass.Membership,
            sharedParties: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            val membershipState = protoToState(membershipProto)
            logger.debug("Writing MembershipState: ${membershipState}")
            return try {
                runCatching {
                    proxy.startFlow(::CreateMembershipState, membershipState, sharedParties)
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
            membershipProto: MembershipOuterClass.Membership
        ): Either<Error, String> {
            val membershipState = protoToState(membershipProto)
            logger.debug("Update MembershipState: ${membershipState}")
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
            logger.debug("Deleting membership for securityDomain $securityDomain")
            return try {
                logger.debug("Deleting membership for securityDomain $securityDomain")
                val result = runCatching {
                    proxy.startFlow(::DeleteMembershipState, securityDomain)
                            .returnValue.get().flatMap {
                                logger.debug("Membership for securityDomain $securityDomain deleted\n")
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
        ): Either<Error, MembershipOuterClass.Membership> {
            return try {
                logger.debug("Getting membership for securityDomain $securityDomain")
                val membership = runCatching {
                    proxy.startFlow(::GetMembershipStateBySecurityDomain, securityDomain)
                            .returnValue.get().fold({
                                logger.error("Error getting membership from network: ${it.message}")
                                Left(Error("Corda Network Error: ${it.message}"))
                            }, {
                                logger.debug("Access Control Policy for securityDomain $securityDomain: ${it.state.data} \n")
                                Right(stateToProto(it.state.data))
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
         * Function to get all memberships from Vault
         */
        @JvmStatic
        fun getMemberships(
            proxy: CordaRPCOps
        ): Either<Error, List<MembershipOuterClass.Membership>> {
            return try {
                logger.debug("Getting all memberships")
                val memberships = proxy.startFlow(::GetMembershipStates)
                        .returnValue.get()
                        
                var membershipList: List<MembershipOuterClass.Membership> = listOf()
                for (membershipItem in memberships) {
                    membershipList += stateToProto(membershipItem.state.data)
                }
                logger.debug("Access Control Policies: $membershipList\n")
                Right(membershipList)
            } catch (e: Exception) {
                Left(Error("${e.message}"))
            }
        }
        
        /**
         * Function to convert proto MembershipOuterClass.Membership to state MembershipState
         */
        @JvmStatic
        fun protoToState(
            membershipProto: MembershipOuterClass.Membership
        ): MembershipState {
            var members: Map<String, Member> = mapOf()
            for ((memberId, memberProto) in membershipProto.membersMap) {
                val member = Member(
                    value = memberProto.value,
                    type = memberProto.type,
                    chain = memberProto.chainList
                )
                members += mapOf(memberId to member)
            }
            
            return MembershipState(
                securityDomain = membershipProto.securityDomain,
                members = members
            )
        }
        
        /**
         * Function to convert state MembershipState to proto MembershipOuterClass.Membership
         */
        @JvmStatic
        fun stateToProto(
            membershipState: MembershipState
        ): MembershipOuterClass.Membership {
            var membersMap: Map<String, MembershipOuterClass.Member> = mapOf()
            for ((memberId,  member) in membershipState.members) {
                val memberProto = MembershipOuterClass.Member.newBuilder()
                    .setValue(member.value)
                    .setType(member.type)
                    .addAllChain(member.chain)
                    .build()
                membersMap += mapOf(memberId to memberProto)
            }
                    
            return MembershipOuterClass.Membership.newBuilder()
                    .setSecurityDomain(membershipState.securityDomain)
                    .putAllMembers(membersMap)
                    .build()
        }
    }
}
