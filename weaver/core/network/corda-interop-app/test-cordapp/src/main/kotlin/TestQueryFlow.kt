/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import co.paralleluniverse.fibers.Suspendable
import net.corda.core.flows.*
import net.corda.core.node.ServiceHub
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.StaticPointer
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.Command
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction
import net.corda.core.transactions.TransactionBuilder

/**
 * The QueryState flow allows for finding the LinearState's for are data in the vault
 *
 * This flow is currently only being used for testing purposes.
 */
@StartableByRPC
class QueryState() : FlowLogic<ByteArray>() {

    /**
     * The call() method runs the flow logic.
     *
     * @return returns the LinearState's corresponding to the state in the vault
     */
    @Suspendable
    override fun call(): ByteArray {
        println("Querying for states")
        var states: List<LinearState>?
        try {
            states = serviceHub.vaultService
                    .queryBy<LinearState>()
                    .states
                    .map { it.state.data }
            println("Found states $states")
        } catch (e: Exception) {
            println("Failed to retrieve states")
            states = null
        }
        return states.toString().toByteArray()
    }
}
