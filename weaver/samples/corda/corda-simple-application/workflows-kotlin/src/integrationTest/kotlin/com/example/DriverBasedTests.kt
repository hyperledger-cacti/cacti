/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication

import net.corda.core.identity.CordaX500Name
import net.corda.core.utilities.getOrThrow
import net.corda.testing.core.TestIdentity
import net.corda.testing.driver.DriverParameters
import net.corda.testing.driver.driver
import org.junit.Test
import kotlin.test.assertEquals

class DriverBasedTests {
    val partyA = TestIdentity(CordaX500Name("partyA", "", "GB"))

    @Test
    fun `node test`() {
        driver(DriverParameters(isDebug = true, startNodesInProcess = true)) {
            // This starts up a node with startNode, which returns a future that completes when the node
            // has completed startup. Then these are all resolved with getOrThrow which returns the NodeHandle list.
            val partyAHandle = startNode(providedName = partyA.name).getOrThrow()

            // This test makes an RPC call to retrieve the node's name from the network map, to verify that the
            // node has started and can communicate. This is a very basic test, in practice tests would be starting
            // flows, and verifying the states in the vault and other important metrics to ensure that your CorDapp is
            // working as intended.
            assertEquals(partyAHandle.rpc.wellKnownPartyFromX500Name(partyA.name)!!.name, partyA.name)
        }
    }
}
