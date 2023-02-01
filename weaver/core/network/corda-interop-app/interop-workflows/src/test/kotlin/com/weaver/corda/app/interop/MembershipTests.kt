/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import arrow.core.Either
import com.weaver.corda.app.interop.flows.*
import com.weaver.corda.app.interop.states.AccessControlPolicyState
import com.weaver.corda.app.interop.states.Member
import com.weaver.corda.app.interop.states.MembershipState
import com.weaver.corda.app.interop.states.Rule
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.node.services.queryBy
import net.corda.core.utilities.getOrThrow
import net.corda.testing.node.MockNetwork
import net.corda.testing.node.MockNetworkParameters
import net.corda.testing.node.StartedMockNode
import net.corda.testing.node.TestCordapp
import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MembershipTests {
    companion object {
        lateinit var network: MockNetwork
        lateinit var partyA: StartedMockNode

        @BeforeClass
        @JvmStatic
        fun setup() {
            network = MockNetwork(MockNetworkParameters(cordappsForAllNodes = listOf(
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.contracts"),
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.flows")
            )))
            partyA = network.createPartyNode()
            network.runNetwork()
        }

        @AfterClass
        @JvmStatic
        fun tearDown() {
            network.stopNodes()
            System.setProperty("net.corda.node.dbtransactionsresolver.InMemoryResolutionLimit", "0")
        }
    }


    @Test
    fun `CreateMembershipState tests`() {
        val membershipForCreate = MembershipState(
                securityDomain = "network1",
                members = mapOf("member1" to Member(
                        value = "fjdkslfjakslfjd",
                        type = "ca",
                        chain = listOf("")
                ))
        )

        // Happy case. No existing access control policy exists.
        val future = partyA.startFlow(CreateMembershipState(membershipForCreate))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "CreateMembershipState should return a Right(UniqueIdentifier)" }

        val states = partyA.services.vaultService
                .queryBy<MembershipState>().states
                .filter { it.state.data.securityDomain == membershipForCreate.securityDomain }
                .map { it.state.data }
        println(states.single().toString())
        assertEquals(1, states.size)
        assertEquals(membershipForCreate.securityDomain, states.single().securityDomain)

        // Case where access control policy already exists
        val futureTwo = partyA.startFlow(CreateMembershipState(membershipForCreate))
        network.runNetwork()
        val error = futureTwo.getOrThrow()
        assert(error.isLeft()) { "CreateMembershipState should return a Left(Error) when access control policy already exists." }
    }

    @Test
    fun `UpdateMembershipState updates an MembershipState in the vault`() {
        val membershipForUpdate = MembershipState(
                securityDomain = "network2",
                members = mapOf("member1" to Member(
                        value = "fjdkslfjakslfjd",
                        type = "ca",
                        chain = listOf("")
                ))
        )

        // Happy case where access control policy already exists.
        createMembership(membershipForUpdate).map { _ ->
            val updatedMembership = membershipForUpdate.copy(members = mapOf("newMember" to Member(
                    value = "jfkdlsjf",
                    type = "ca",
                    chain = listOf("")
            )))
            val future = partyA.startFlow(UpdateMembershipState(updatedMembership))
            network.runNetwork()
            val newLinearId = future.getOrThrow()
            assert(newLinearId.isRight()) { "UpdateMembership should return a Right(UniqueIdentifier)" }
            val states = partyA.services.vaultService
                    .queryBy<MembershipState>().states
                    .filter { it.state.data.securityDomain == membershipForUpdate.securityDomain }
                    .map { it.state.data }

            assertEquals(1, states.size)
            assertEquals(updatedMembership.securityDomain, states.single().securityDomain)
        }

        // Unhappy case where access control policy for that security group does not exist.
        val invalidMembership = membershipForUpdate.copy(securityDomain = "invalid security domain")
        val future = partyA.startFlow(UpdateMembershipState(invalidMembership))
        network.runNetwork()
        val error = future.getOrThrow()
        assert(error.isLeft()) { "UpdateMembershipState should return Left(Error) when access control policy does not already exist." }
    }

    @Test
    fun `DeleteMembershipState deletes an MembershipState in the vault`() {
        val membershipForDelete = MembershipState(
                securityDomain = "network3",
                members = mapOf("member1" to Member(
                        value = "fjdkslfjakslfjd",
                        type = "ca",
                        chain = listOf("")
                ))
        )

        // Happy case where access control policy already exists.
        createMembership(membershipForDelete).map { _ ->
            val future = partyA.startFlow(DeleteMembershipState(membershipForDelete.securityDomain))
            network.runNetwork()
            val newLinearId = future.getOrThrow()
            assert(newLinearId.isRight()) { "DeleteMembershipState should return a Right(UniqueIdentifier)" }
            val states = partyA.services.vaultService
                    .queryBy<MembershipState>().states
                    .filter { it.state.data.securityDomain == membershipForDelete.securityDomain }
                    .map { it.state.data }

            assertEquals(0, states.size)
        }

        // Unhappy case where access control policy for that membership does not exist.
        val future = partyA.startFlow(DeleteMembershipState("invalid membership"))
        network.runNetwork()
        val error = future.getOrThrow()
        assert(error.isLeft()) { "DeleteMembershipState should return Left(Error) when access control policy does not exist." }
    }

    @Test
    fun `GetMembershipStateBySecurityDomain tests`() {
        val membershipForGet = MembershipState(
                securityDomain = "network4",
                members = mapOf("member1" to Member(
                        value = "fjdkslfjakslfjd",
                        type = "ca",
                        chain = listOf("")
                ))
        )

        // Happy path where access control policy exists.
        createMembership(membershipForGet).map { _ ->
            val future = partyA.startFlow(GetMembershipStateBySecurityDomain(membershipForGet.securityDomain))
            network.runNetwork()

            val membershipStateAndRef = future.getOrThrow()
            assert(membershipStateAndRef.isRight())
            membershipStateAndRef.map {
                assertEquals(membershipForGet.securityDomain, it.state.data.securityDomain)
            }
        }

        // Unhappy path where access control policy does not exist
        val unhappyFuture = partyA.startFlow(GetMembershipStateBySecurityDomain("invalidId"))
        network.runNetwork()

        val error = unhappyFuture.getOrThrow()
        assert(error.isLeft())
    }

    @Test
    fun `GetMembershipStates tests`() {
        val future = partyA.startFlow(GetMembershipStates())
        network.runNetwork()

        val stateList = future.getOrThrow()
        assertTrue(stateList.size >= 0)
    }

    @Test
    fun `verifyMemberInSecurityDomain tests`() {
        // Unhappy case where certificate is outside expiry

        // Unhappy case where requesting org doesn't match any security group member

        // Unhappy case where security group member uses ca for validation
        // and requester's certificate isn't issued by member's ca

        // Unhappy case where security group member uses certificate for validation
        // and certificate of requester doesn't match
    }

    @Test
    fun `isCertificateWithinExpiry tests`() {
        // Happy case where certificate is within expiry

        // Unhappy case where certificate is outside expiry
    }

    fun createMembership(membership: MembershipState): Either<Error, UniqueIdentifier> {
        val future = partyA.startFlow(CreateMembershipState(membership))
        network.runNetwork()
        return future.getOrThrow()
    }
}


