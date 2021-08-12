/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import arrow.core.Either
import com.weaver.corda.app.interop.flows.CreateVerificationPolicyState
import com.weaver.corda.app.interop.flows.DeleteVerificationPolicyState
import com.weaver.corda.app.interop.flows.UpdateVerificationPolicyState
import com.weaver.corda.app.interop.states.Policy
import com.weaver.corda.app.interop.states.VerificationPolicyState
import com.weaver.corda.app.interop.states.Identifier
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

class VerificationPolicyTests {
    companion object {
        lateinit var network: MockNetwork
        lateinit var partyA: StartedMockNode

        @BeforeClass @JvmStatic
        fun setup() {
            network = MockNetwork(MockNetworkParameters(cordappsForAllNodes = listOf(
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.contracts"),
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.flows")
            )))
            partyA = network.createPartyNode()
            network.runNetwork()
        }

        @AfterClass @JvmStatic
        fun tearDown() {
            network.stopNodes()
            System.setProperty("net.corda.node.dbtransactionsresolver.InMemoryResolutionLimit", "0")
        }
    }

    @Test
    fun `CreateVerificationPolicy tests`() {
        val verificationPolicyForCreating = VerificationPolicyState(
                securityDomain = "network1",
                identifiers = listOf(Identifier(
                        "exampleId",
                        Policy("type", listOf("org1"))
                ))
        )

        // Happy case. No existing verification policy exists.
        val future = partyA.startFlow(CreateVerificationPolicyState(verificationPolicyForCreating))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "CreateVerificationPolicy should return a Right(UniqueIdentifier)" }

        val states = partyA.services.vaultService
                .queryBy<VerificationPolicyState>().states
                .filter { it.state.data.securityDomain == verificationPolicyForCreating.securityDomain }
                .map { it.state.data }
        println(states.single().toString())
        assertEquals(1, states.size)
        assertEquals(verificationPolicyForCreating.securityDomain, states.single().securityDomain)

        // Case where verification policy already exists
        val futureTwo = partyA.startFlow(CreateVerificationPolicyState(verificationPolicyForCreating))
        network.runNetwork()
        val error = futureTwo.getOrThrow()
        assert(error.isLeft()) { "CreateVerificationPolicy should return a Left(Error) when verification policy already exists." }
    }

    @Test
    fun `UpdateVerificationPolicy updates an VerificationPolicyState in the vault`() {
        val verificationPolicyForUpdating = VerificationPolicyState(
                securityDomain = "network2",
                identifiers = listOf(Identifier(
                        "exampleId",
                        Policy("type", listOf("org1"))
                ))
        )

        // Happy case where verification policy already exists.
        createVerificationPolicy(verificationPolicyForUpdating).map { _ ->
            val updatedVerificationPolicy = verificationPolicyForUpdating.copy(
                    identifiers = listOf(Identifier(
                    "newExampleId",
                            Policy("type", listOf("org1"))
                    ))
            )
            val future = partyA.startFlow(UpdateVerificationPolicyState(updatedVerificationPolicy))
            network.runNetwork()
            val newLinearId = future.getOrThrow()
            assert(newLinearId.isRight()) { "UpdateVerificationPolicy should return a Right(UniqueIdentifier)" }
            val states = partyA.services.vaultService
                    .queryBy<VerificationPolicyState>().states
                    .filter { it.state.data.securityDomain == verificationPolicyForUpdating.securityDomain }
                    .map { it.state.data }
            assertEquals(1, states.size)
            assertEquals(updatedVerificationPolicy.securityDomain, states.single().securityDomain)
        }

        // Unhappy case where verification policy for that security domain does not exist.
        val invalidVerificationPolicy = verificationPolicyForUpdating.copy(securityDomain = "invalid security domain")
        val future = partyA.startFlow(UpdateVerificationPolicyState(invalidVerificationPolicy))
        network.runNetwork()
        val error = future.getOrThrow()
        assert(error.isLeft()) { "UpdateVerificationPolicy should return Left(Error) when verification policy does not already exist." }
    }

    @Test
    fun `DeleteVerificationPolicy deletes an VerificationPolicyState in the vault`() {
        val verificationPolicyForDeleting = VerificationPolicyState(
                securityDomain = "network3",
                identifiers = listOf(Identifier(
                        "exampleId",
                        Policy("type", listOf("org1"))
                ))
        )

        // Happy case where verification policy already exists.
        createVerificationPolicy(verificationPolicyForDeleting).map { _ ->
            val future = partyA.startFlow(DeleteVerificationPolicyState(verificationPolicyForDeleting.securityDomain))
            network.runNetwork()
            val newLinearId = future.getOrThrow()
            assert(newLinearId.isRight()) { "DeleteVerificationPolicy should return a Right(UniqueIdentifier)" }
            val states = partyA.services.vaultService
                    .queryBy<VerificationPolicyState>().states
                    .filter { it.state.data.securityDomain == verificationPolicyForDeleting.securityDomain }
                    .map { it.state.data }

            assertEquals(0, states.size)
        }

        // Unhappy case where verification policy for that security domain does not exist.
        val future = partyA.startFlow(DeleteVerificationPolicyState("invalid security domain"))
        network.runNetwork()
        val error = future.getOrThrow()
        assert(error.isLeft()) { "DeleteVerificationPolicy should return Left(Error) when verification policy does not exist." }
    }

    @Test
    fun `resolvePolicy tests`() {

    }

    fun createVerificationPolicy(verificationPolicy: VerificationPolicyState): Either<Error, UniqueIdentifier> {
        val future = partyA.startFlow(CreateVerificationPolicyState(verificationPolicy))
        network.runNetwork()
        return future.getOrThrow()
    }
}


