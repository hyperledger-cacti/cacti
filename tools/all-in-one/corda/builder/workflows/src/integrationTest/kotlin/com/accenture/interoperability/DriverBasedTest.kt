package com.accenture.interoperability

import net.corda.core.identity.CordaX500Name
import net.corda.core.utilities.getOrThrow
import net.corda.testing.core.TestIdentity
import net.corda.testing.driver.DriverDSL
import net.corda.testing.driver.DriverParameters
import net.corda.testing.driver.NodeHandle
import net.corda.testing.driver.driver
import org.junit.Test
import java.util.concurrent.Future
import kotlin.test.assertEquals

class DriverBasedTest {
    private val bankA = TestIdentity(CordaX500Name("BankA", "", "GB"))
    private val bankB = TestIdentity(CordaX500Name("BankB", "", "US"))

    @Test
    fun `node test`() = withDriver {
        // Start a pair of nodes and wait for them both to be ready.
        val (partyAHandle, partyBHandle) = startNodes(bankA, bankB)

        // From each node, make an RPC call to retrieve another node's name from the network map, to verify that the
        // nodes have started and can communicate.

        // This is a very basic test: in practice tests would be starting flows, and verifying the states in the vault
        // and other important metrics to ensure that your CorDapp is working as intended.
        assertEquals(bankB.name, partyAHandle.resolveName(bankB.name))
        assertEquals(bankA.name, partyBHandle.resolveName(bankA.name))
    }

    // Runs a test inside the Driver DSL, which provides useful functions for starting nodes, etc.
    private fun withDriver(test: DriverDSL.() -> Unit) = driver(
        DriverParameters(isDebug = true, startNodesInProcess = true)
    ) { test() }

    // Makes an RPC call to retrieve another node's name from the network map.
    private fun NodeHandle.resolveName(name: CordaX500Name) = rpc.wellKnownPartyFromX500Name(name)!!.name

    // Resolves a list of futures to a list of the promised values.
    private fun <T> List<Future<T>>.waitForAll(): List<T> = map { it.getOrThrow() }

    // Starts multiple nodes simultaneously, then waits for them all to be ready.
    private fun DriverDSL.startNodes(vararg identities: TestIdentity) = identities
        .map { startNode(providedName = it.name) }
        .waitForAll()
}