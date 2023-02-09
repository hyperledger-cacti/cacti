/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.test.flow

import com.cordaSimpleApplication.flow.*
import com.cordaSimpleApplication.state.SimpleState
import javassist.NotFoundException
import net.corda.core.node.services.queryBy
import net.corda.core.utilities.getOrThrow
import net.corda.testing.core.singleIdentity
import net.corda.testing.node.MockNetwork
import net.corda.testing.node.MockNetworkParameters
import net.corda.testing.node.StartedMockNode
import net.corda.testing.node.TestCordapp
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SimpleFlowTests {
    private lateinit var network: MockNetwork
    private lateinit var partyA: StartedMockNode

    @Before
    fun setup() {
        network = MockNetwork(MockNetworkParameters(cordappsForAllNodes = listOf(
                TestCordapp.findCordapp("com.cordaSimpleApplication.contract"),
                TestCordapp.findCordapp("com.cordaSimpleApplication.flow")
        )))
        partyA = network.createPartyNode()
        network.runNetwork()
    }

    @After
    fun tearDown() {
        network.stopNodes()
    }

    @Test
    fun `CreateState flow returns a SignedTransaction signed by the initiator`() {
        val key = "H"
        val value = "1"
        val flow = CreateState(key, value)
        val future = partyA.startFlow(flow)
        network.runNetwork()

        val signedTx = future.getOrThrow()
        signedTx.verifyRequiredSignatures()
    }

    @Test
    fun `CreateState flow records a transaction the party's vault`() {
        val key = "H"
        val value = "1"
        val flow = CreateState(key, value)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val signedTx = future.getOrThrow()

        assertEquals(signedTx, partyA.services.validatedTransactions.getTransaction(signedTx.id))
    }

    @Test
    fun `CreateState flow creates a transaction that has no inputs and a single output`() {
        val key = "H"
        val value = "1"
        val flow = CreateState(key, value)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val signedTx = future.getOrThrow()

        val recordedTx = partyA.services.validatedTransactions.getTransaction(signedTx.id)
        val txOutputs = recordedTx!!.tx.outputs
        assert(txOutputs.size == 1)

        val recordedState = txOutputs[0].data as SimpleState
        assertEquals(recordedState.key, key)
        assertEquals(recordedState.value, value)
        assertEquals(recordedState.owner, partyA.info.singleIdentity())
    }

    @Test
    fun `CreateState flow records the correct state in the vault`() {
        val key = "H"
        val value = "1"
        val flow = CreateState(key, value)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        future.getOrThrow()

        val states = partyA.services.vaultService.queryBy<SimpleState>().states
        assertEquals(1, states.size)
        val recordedState = states.single().state.data
        assertEquals(recordedState.key, key)
        assertEquals(recordedState.value, value)
        assertEquals(recordedState.owner, partyA.info.singleIdentity())
    }

    @Test
    fun `UpdateState flow returns a SignedTransaction signed by the initiator`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val newValue = "2"
        val flow = UpdateState(key, newValue)
        val future = partyA.startFlow(flow)
        network.runNetwork()


        val signedTx = future.getOrThrow()
        signedTx.verifyRequiredSignatures()
    }

    @Test
    fun `UpdateState flow records a transaction the party's vault`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val newValue = "2"
        val flow = UpdateState(key, newValue)
        val future = partyA.startFlow(flow)
        network.runNetwork()

        val signedTx = future.getOrThrow()

        assertEquals(signedTx, partyA.services.validatedTransactions.getTransaction(signedTx.id))
    }

    @Test
    fun `UpdateState flow creates a transaction that has no inputs and a single output`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val newValue = "2"
        val flow = UpdateState(key, newValue)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val signedTx = future.getOrThrow()

        val recordedTx = partyA.services.validatedTransactions.getTransaction(signedTx.id)
        val txOutputs = recordedTx!!.tx.outputs
        assert(txOutputs.size == 1)

        val recordedState = txOutputs[0].data as SimpleState
        assertEquals(recordedState.key, key)
        assertEquals(recordedState.value, newValue)
        assertEquals(recordedState.owner, partyA.info.singleIdentity())
    }

    @Test
    fun `UpdateState flow records the correct state in the vault`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val newValue = "2"
        val flow = UpdateState(key, newValue)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        future.getOrThrow()

        val states = partyA.services.vaultService.queryBy<SimpleState>().states
        assertEquals(1, states.size)
        val updatedState = states.single().state.data
        assertEquals(updatedState.key, key)
        assertEquals(updatedState.value, newValue)
        assertEquals(updatedState.owner, partyA.info.singleIdentity())
    }

    @Test
    fun `UpdateState flow fails if state with given key not found`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val incorrectKey = "A"
        val newValue = "2"
        val flow = UpdateState(incorrectKey, newValue)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        assertFailsWith<NotFoundException> { future.getOrThrow() }
    }

    @Test
    fun `DeleteState flow returns a SignedTransaction signed by the initiator`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val newValue = "2"
        val flow = UpdateState(key, newValue)
        val future = partyA.startFlow(flow)
        network.runNetwork()

        val signedTx = future.getOrThrow()
        signedTx.verifyRequiredSignatures()
    }

    @Test
    fun `DeleteState flow records a transaction the party's vault`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val flow = DeleteState(key)
        val future = partyA.startFlow(flow)
        network.runNetwork()

        val signedTx = future.getOrThrow()

        assertEquals(signedTx, partyA.services.validatedTransactions.getTransaction(signedTx.id))
    }

    @Test
    fun `DeleteState flow creates a transaction that has no inputs and a single output`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val flow = DeleteState(key)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val signedTx = future.getOrThrow()

        val recordedTx = partyA.services.validatedTransactions.getTransaction(signedTx.id)
        val txOutputs = recordedTx!!.tx.outputs
        assert(txOutputs.isEmpty())
    }

    @Test
    fun `DeleteState flow deletes state in the vault`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val flow = DeleteState(key)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        future.getOrThrow()

        val states = partyA.services.vaultService.queryBy<SimpleState>().states
        assert(states.isEmpty())
    }

    @Test
    fun `DeleteState flow fails if state with given key not found`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val incorrectKey = "A"
        val flow = DeleteState(incorrectKey)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        assertFailsWith<NotFoundException> { future.getOrThrow() }
    }

    @Test
    fun `GetStateByKey returns a list of SimpleStates as byte array`() {
        val key = "H"
        val value = "1"
        createStateFlow(key, value)

        val flow = GetStateByKey(key)
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val states = future.getOrThrow()

        // TODO: NW - Write this test better, need to get gson toJSON/fromJSON working
        assertEquals(116, String(states).length)
//        assertEquals(states.first().key, key)
//        assertEquals(states.first().value, value)
//        assertEquals(states.first().owner, partyA.info.singleIdentity())
    }

    @Test
    fun `GetStateByKey returns an empty list (as byte array) if no states are found`() {
        val flow = GetStateByKey("H")
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val states = future.getOrThrow()

        assertEquals("[]", String(states))
    }

    @Test
    fun `GetStates returns a list of simple states`() {
        createStateFlow("H", "1")
        createStateFlow("He", "2")

        val flow = GetStates()
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val states = future.getOrThrow()

        assertEquals(2, states.size)
    }

    @Test
    fun `GetStates returns an empty list if vault contains no states`() {
        val flow = GetStates()
        val future = partyA.startFlow(flow)
        network.runNetwork()
        val states = future.getOrThrow()

        assert(states.isEmpty())
    }

    fun createStateFlow(key: String, value: String) {
        partyA.startFlow(CreateState(key, value))
        network.runNetwork()
    }
}