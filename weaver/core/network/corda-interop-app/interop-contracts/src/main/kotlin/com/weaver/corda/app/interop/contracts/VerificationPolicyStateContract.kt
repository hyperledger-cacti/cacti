/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.contracts

import com.weaver.corda.app.interop.states.VerificationPolicyState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction

/**
 * VerificationPolicyStateContract defines the rules for managing a [VerificationPolicyState].
 *
 * For a new [VerificationPolicyState] to be issued, a transaction is required that fulfills the following:
 * - The Issue() command with the public keys of all the participants.
 * - No input states.
 * - One output state of type [VerificationPolicyState].
 */
class VerificationPolicyStateContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "com.weaver.corda.app.interop.contracts.VerificationPolicyStateContract"
    }

    /**
     * The verify() function determines a transaction is valid if it does not throw and exception.
     * It takes a ledger transaction that represents a state transition, and ensures the inputs/outputs/commands make sense.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Issue -> requireThat {
                "There should be no input states" using (tx.inputs.isEmpty())
                "There should be one output state" using (tx.outputs.size == 1)
                "The output state should be of type VerificationPolicy" using (tx.outputs[0].data is VerificationPolicyState)
                val participantKeys = tx.outputs[0].data.participants.map { it.owningKey }
                "The required signers of the transaction must include all participants" using (command.signers.containsAll(participantKeys))
            }
            is Commands.Update -> requireThat {
                "There should be one input state" using (tx.inputs.size == 1)
                "The input state should be of type VerificationPolicy" using (tx.inputs[0].state.data is VerificationPolicyState)
                "There should be one output state" using (tx.outputs.size == 1)
                "The output state should be of type VerificationPolicy" using (tx.outputs[0].data is VerificationPolicyState)
                val out = tx.outputsOfType<VerificationPolicyState>().single()
                "The participant must be the signer." using (command.signers.containsAll(out.participants.map { it.owningKey }))
            }
            is Commands.Delete -> requireThat {
                "There should be one input state" using (tx.inputs.size == 1)
                "The input state should be of type VerificationPolicy" using (tx.inputs[0].state.data is VerificationPolicyState)
                val input = tx.inputs[0].state.data as VerificationPolicyState
                "There should be no output state" using (tx.outputs.isEmpty())
                "The participant must be the signer." using (command.signers.containsAll(input.participants.map { it.owningKey }))
            }
        }
    }

    /**
     * Commands are used to indicate the intent of a transaction.
     * Commands for [VerificationPolicyStateContract] are:
     * - Issue
     * - Update
     * - Delete
     */
    interface Commands : CommandData {
        class Issue : Commands
        class Update : Commands
        class Delete : Commands
    }
}