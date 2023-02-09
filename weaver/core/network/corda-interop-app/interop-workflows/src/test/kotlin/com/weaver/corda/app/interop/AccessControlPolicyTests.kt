/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import arrow.core.Either
import com.weaver.corda.app.interop.flows.*
import com.weaver.corda.app.interop.states.AccessControlPolicyState
import com.weaver.corda.app.interop.states.Rule
import com.weaver.protos.common.query.QueryOuterClass
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.node.services.queryBy
import net.corda.core.utilities.getOrThrow
import net.corda.testing.node.*
import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AccessControlPolicyTests {
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
    fun `CreateAccessControlPolicy tests`() {
        val accessControlPolicyForCreate = AccessControlPolicyState(
                securityDomain = "network1",
                rules = listOf(
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowName:flowArg",
                                read = true
                        ),
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowTwoName",
                                read = true
                        ))
        )

        // Happy case. No existing access control policy exists.
        val future = partyA.startFlow(CreateAccessControlPolicy(accessControlPolicyForCreate))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "CreateAccessControlPolicy should return a Right(UniqueIdentifier)" }

        val states = partyA.services.vaultService
                .queryBy<AccessControlPolicyState>().states
                .filter { it.state.data.securityDomain == accessControlPolicyForCreate.securityDomain }
                .map { it.state.data }
        println(states.single().toString())
        assertEquals(1, states.size)
        assertEquals(accessControlPolicyForCreate.securityDomain, states.single().securityDomain)

        // Unhappy case where access control policy already exists
        val futureTwo = partyA.startFlow(CreateAccessControlPolicy(accessControlPolicyForCreate))
        network.runNetwork()
        val error = futureTwo.getOrThrow()
        assert(error.isLeft()) { "CreateAccessControlPolicy should return a Left(Error) when access control policy already exists." }
    }

    @Test
    fun `UpdateAccessControlPolicy updates an AccessControlPolicyState in the vault`() {
        val accessControlPolicyForUpdate = AccessControlPolicyState(
                securityDomain = "network2",
                rules = listOf(
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowName:flowArg",
                                read = true
                        ),
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowTwoName",
                                read = true
                        ))
        )

        // Happy case where access control policy already exists.
        createAccessControlPolicy(accessControlPolicyForUpdate).map { _ ->
            val updatedAccessControlPolicy = accessControlPolicyForUpdate.copy(rules = listOf(Rule(
                    principal = "fjdkslfjakslfjd",
                    principalType = "publicKey",
                    resource = "state:001",
                    read = true)))
            val future = partyA.startFlow(UpdateAccessControlPolicyState(updatedAccessControlPolicy))
            network.runNetwork()
            val newLinearId = future.getOrThrow()
            assert(newLinearId.isRight()) { "UpdateAccessControlPolicy should return a Right(UniqueIdentifier)" }
            val states = partyA.services.vaultService
                    .queryBy<AccessControlPolicyState>().states
                    .filter { it.state.data.securityDomain == accessControlPolicyForUpdate.securityDomain }
                    .map { it.state.data }

            assertEquals(1, states.size)
            assertEquals(updatedAccessControlPolicy.securityDomain, states.single().securityDomain)
        }

        // Unhappy case where access control policy for that security domain does not exist.
        val invalidAccessControlPolicy = accessControlPolicyForUpdate.copy(securityDomain = "invalid security domain")
        val future = partyA.startFlow(UpdateAccessControlPolicyState(invalidAccessControlPolicy))
        network.runNetwork()
        val error = future.getOrThrow()
        assert(error.isLeft()) { "UpdateAccessControlPolicy should return Left(Error) when access control policy does not already exist." }
    }

    @Test
    fun `DeleteAccessControlPolicy deletes an AccessControlPolicyState in the vault`() {
        val accessControlPolicyForDelete = AccessControlPolicyState(
                securityDomain = "network3",
                rules = listOf(
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowName:flowArg",
                                read = true
                        ),
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowTwoName",
                                read = true
                        ))
        )

        // Happy case where access control policy already exists.
        createAccessControlPolicy(accessControlPolicyForDelete).map { _ ->
            val future = partyA.startFlow(DeleteAccessControlPolicyState(accessControlPolicyForDelete.securityDomain))
            network.runNetwork()
            val newLinearId = future.getOrThrow()
            assert(newLinearId.isRight()) { "DeleteAccessControlPolicy should return a Right(UniqueIdentifier)" }
            val states = partyA.services.vaultService
                    .queryBy<AccessControlPolicyState>().states
                    .filter { it.state.data.securityDomain == accessControlPolicyForDelete.securityDomain }
                    .map { it.state.data }

            assertEquals(0, states.size)
        }

        // Unhappy case where access control policy for that security group does not exist.
        val future = partyA.startFlow(DeleteAccessControlPolicyState("invalid security domain"))
        network.runNetwork()
        val error = future.getOrThrow()
        assert(error.isLeft()) { "DeleteAccessControlPolicy should return Left(Error) when access control policy does not exist." }
    }

    @Test
    fun `GetAccessControlPolicyBySecurityDomain should return access control policy`() {
        val accessControlPolicyForGet = AccessControlPolicyState(
                securityDomain = "network4",
                rules = listOf(
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowName:flowArg",
                                read = true
                        ),
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowTwoName",
                                read = true
                        ))
        )

        // Happy path where access control policy exists.
        createAccessControlPolicy(accessControlPolicyForGet).map { _ ->
            val future = partyA.startFlow(GetAccessControlPolicyBySecurityDomain(accessControlPolicyForGet.securityDomain))
            network.runNetwork()

            val accessControlPolicyStateAndRef = future.getOrThrow()
            assert(accessControlPolicyStateAndRef.isRight())
            accessControlPolicyStateAndRef.map {
                assertEquals(accessControlPolicyForGet.securityDomain, it.state.data.securityDomain)
            }
        }

        // Unhappy path where access control policy does not exist
        val unhappyFuture = partyA.startFlow(GetAccessControlPolicyBySecurityDomain("invalidId"))
        network.runNetwork()

        val error = unhappyFuture.getOrThrow()
        assert(error.isLeft())
    }

    @Test
    fun `GetAccessControlPolicies should return all access control policies`() {
        val future = partyA.startFlow(GetAccessControlPolicies())
        network.runNetwork()

        val stateList = future.getOrThrow()
        assertTrue(stateList.size >= 0)
    }

    @Test
    fun `verifyAccessToFlow function`() {
        val accessControlPolicyForVerify = AccessControlPolicyState(
                securityDomain = "network5",
                rules = listOf(
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowName:flowArg",
                                read = true
                        ),
                        Rule(
                                principal = "network1-certificate",
                                principalType = "certificate",
                                resource = "node1:10006#flowTwoName:*",
                                read = true
                        ))
        )
        createAccessControlPolicy(accessControlPolicyForVerify)

        // Valid query
        val validQuery = QueryOuterClass.Query.newBuilder()
                .addAllPolicy(listOf())
                .setAddress("localhost:9080/network2/node1:10006#flowName:flowArg")
                .setRequestingRelay("")
                .setRequestingNetwork("network5")
                .setCertificate("network1-certificate")
                .setRequestorSignature("")
                .setNonce("")
                .setRequestId("")
                .setRequestingOrg("Org1MSP")
                .build()
        val unit = verifyAccessToFlow(validQuery, partyA.services)
        assertTrue(unit.isRight())

        // Valid query for access control policy with pattern resource
        val validQueryForACPNoFlowArgs = validQuery.toBuilder()
                .setAddress("localhost:9080/network2/node1:10006#flowTwoName:flowArgs")
                .build()
        val validResponseForACPNoFlowArgs = verifyAccessToFlow(validQueryForACPNoFlowArgs, partyA.services)
        assertTrue(validResponseForACPNoFlowArgs.isRight())

        // No access control policy for requesting network
        val invalidNetworkQuery = validQuery.toBuilder()
                .setRequestingNetwork("invalidNetwork")
                .build()
        val invalidNetworkError = verifyAccessToFlow(invalidNetworkQuery, partyA.services)
        assertTrue(invalidNetworkError.isLeft())

        // Invalid address
        val invalidAddressQuery = validQuery.toBuilder()
                .setAddress("invalidAddress")
                .build()
        val invalidAddressError = verifyAccessToFlow(invalidAddressQuery, partyA.services)
        assertTrue(invalidAddressError.isLeft())

        // Invalid Corda view address
        val nonMatchingAddressQuery = validQuery.toBuilder()
                .setAddress("localhost:9080/network2/node1:10006#invalidFlowName")
                .build()
        val nonMatchingAddressError = verifyAccessToFlow(nonMatchingAddressQuery, partyA.services)
        assertTrue(nonMatchingAddressError.isLeft())

        // Invalid certificate
        val invalidCertificateQuery = validQuery.toBuilder()
                .setCertificate("invalidCertificate")
                .build()
        val invalidCertificateError = verifyAccessToFlow(invalidCertificateQuery, partyA.services)
        assertTrue(invalidCertificateError.isLeft())
    }

    fun createAccessControlPolicy(accessControlPolicy: AccessControlPolicyState): Either<Error, UniqueIdentifier> {
        val future = partyA.startFlow(CreateAccessControlPolicy(accessControlPolicy))
        network.runNetwork()
        return future.getOrThrow()
    }
}


