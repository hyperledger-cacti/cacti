/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.test

import net.corda.core.identity.CordaX500Name
import net.corda.core.utilities.getOrThrow
import net.corda.testing.driver.DriverParameters
import net.corda.testing.driver.driver
import net.corda.testing.node.User

/**
 * This file is exclusively for being able to run your nodes through an IDE.
 * Do not use in a production environment.
 */
fun main(args: Array<String>) {
    val user = User("user1", "test", permissions = setOf("ALL"))
    driver(DriverParameters(waitForAllNodesToFinish = true)) {
        val nodeFutures = listOf(
                startNode(
                        providedName = CordaX500Name("PartyA", "London", "GB"),
                        rpcUsers = listOf(user)))

        nodeFutures.map { it.getOrThrow() }
    }
}
