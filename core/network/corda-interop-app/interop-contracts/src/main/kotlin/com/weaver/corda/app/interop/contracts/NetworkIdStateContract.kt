/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.contracts

import com.weaver.corda.app.interop.states.NetworkIdState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.Requirements.using
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction

/**
 * NetworkIdStateContract defines the rules for managing [NetworkIdState].
 *
 * For a new [NetworkIdState] to be created, a transaction is required that fulfills the following:
 * - The Create() command with the public keys of all the participants.
 * - No input states.
 * - One output state of type [NetworkIdState].
*/
class NetworkIdStateContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "com.weaver.corda.app.interop.contracts.NetworkIdStateContract"
    }
    /**
     * The verify() function determines a transaction is valid if it does not throw and exception.
     * It takes a ledger transaction that represents a state transition, and ensures the inputs/outputs/commands make sense.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when(command.value) {
            is Commands.Create -> requireThat {
                "There should be no input states" using (tx.inputs.isEmpty())
                "There should be one output state" using (tx.outputs.size == 1)
                "The output state should be of type NetworkIdState" using (tx.outputs[0].data is NetworkIdState)
                val participantKeys = tx.outputs[0].data.participants.map { it.owningKey }
                "The required signers of the transaction must include all participants" using (command.signers.containsAll(participantKeys))
            }
        }
    }

    /**
     * Commands are used to indicate the intent of a transaction.
     * Commands for [NetworkIdState] are:
     * - Create
     */
    interface Commands : CommandData {
        class Create : Commands
    }
}