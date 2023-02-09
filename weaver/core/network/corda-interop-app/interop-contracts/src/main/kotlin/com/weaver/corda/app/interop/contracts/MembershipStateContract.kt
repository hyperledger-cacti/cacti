/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.contracts

import com.weaver.corda.app.interop.states.MembershipState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction

/**
 * MembershipStateContract defines the rules for managing a [MembershipState].
 *
 * For a new [MembershipState] to be issued, a transaction is required that fulfills the following:
 * - The Issue() command with the public keys of all the participants.
 * - No input states.
 * - One output state of type [MembershipState].
 */
class MembershipStateContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "com.weaver.corda.app.interop.contracts.MembershipStateContract"
    }

    /**
     * A transaction is valid if the verify() function of the contract of all the transaction's
     * input and output states does not throw an exception.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Issue -> requireThat {
                "There should be no input states" using (tx.inputs.isEmpty())
                "There should be one output state" using (tx.outputs.size == 1)
                "The output state should be of type MembershipState" using (tx.outputs[0].data is MembershipState)
                val participantKeys = tx.outputs[0].data.participants.map { it.owningKey }
                "The required signers of the transaction must include all participants" using (command.signers.containsAll(participantKeys))
            }
            is Commands.Update -> requireThat {
                "There should be one input state" using (tx.inputs.size == 1)
                "The input state should be of type MembershipState" using (tx.inputs[0].state.data is MembershipState)
                "There should be one output state" using (tx.outputs.size == 1)
                "The output state should be of type MembershipState" using (tx.outputs[0].data is MembershipState)
                val out = tx.outputsOfType<MembershipState>().single()
                "The participant must be the signer." using (command.signers.containsAll(out.participants.map { it.owningKey }))
            }
            is Commands.Delete -> requireThat {
                "There should be one input state" using (tx.inputs.size == 1)
                "The input state should be of type MembershipState" using (tx.inputs[0].state.data is MembershipState)
                val input = tx.inputs[0].state.data as MembershipState
                "There should be no output state" using (tx.outputs.isEmpty())
                "The participant must be the signer." using (command.signers.containsAll(input.participants.map { it.owningKey }))
            }
        }
    }

    /**
     * Commands are used to indicate the intent of a transaction.
     * Commands for [MembershipStateStateContract] are:
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
