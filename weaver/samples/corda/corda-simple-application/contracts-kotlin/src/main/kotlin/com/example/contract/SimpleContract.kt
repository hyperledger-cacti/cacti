/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.contract

import com.cordaSimpleApplication.state.SimpleState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction

/**
 * SimpleContract defines the rules for managing [SimpleState].
 *
 * Implements the Contract interface that is part of Corda core.
 *
 * [SimpleState] issue transaction rules:
 * - The Create() command with the public key of the owner node.
 * - No input states.
 * - One output state of type [SimpleState].
 *
 * [SimpleState] update transaction rules:
 * - The Update() command with the public key of the owner node.
 * - One input state of type [SimpleState].
 * - One output state of type [SimpleState].
 *
 *  [SimpleState] delete transaction rules:
 * - The Delete() command with the public key of the owner node.
 * - One input state of type [SimpleState].
 * - No output states.
 */
class SimpleContract : Contract {
    companion object {
        @JvmStatic
        val ID = "com.cordaSimpleApplication.contract.SimpleContract"
    }

    /**
     * The verify() function determines a transaction is valid if it does not throw and exception.
     * It takes a ledger transaction that represents a state transition, and ensures the inputs/outputs/commands make sense.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Create -> requireThat {
                "No inputs should be consumed when issuing a SimpleState." using (tx.inputs.isEmpty())
                "Only one output state should be created." using (tx.outputs.size == 1)
                val out = tx.outputsOfType<SimpleState>().single()
                "The participant must be the signer." using (command.signers.containsAll(out.participants.map { it.owningKey }))
            }
            is Commands.Update -> requireThat {
                "There should be one input state" using (tx.inputs.size == 1)
                "The input state should be of type SimpleState" using (tx.inputs[0].state.data is SimpleState)
                "There should be one output state" using (tx.outputs.size == 1)
                "The output state should be of type SimpleState" using (tx.outputs[0].data is SimpleState)
                val out = tx.outputsOfType<SimpleState>().single()
                "The participant must be the signer." using (command.signers.containsAll(out.participants.map { it.owningKey }))
            }
            is Commands.Delete -> requireThat {
                "There should be one input state" using (tx.inputs.size == 1)
                "The input state should be of type SimpleState" using (tx.inputs[0].state.data is SimpleState)
                val input = tx.inputs[0].state.data as SimpleState
                "There should be no output state" using (tx.outputs.isEmpty())
                "The participant must be the signer." using (command.signers.containsAll(input.participants.map { it.owningKey }))
            }
        }
    }

    /**
     * Commands are used to indicate the intent of a transaction.
     * Commands for ExternalStateContract are:
     * - Create
     * - Update
     * - Delete
     */
    interface Commands : CommandData {
        class Create : Commands
        class Update : Commands
        class Delete : Commands
    }
}
