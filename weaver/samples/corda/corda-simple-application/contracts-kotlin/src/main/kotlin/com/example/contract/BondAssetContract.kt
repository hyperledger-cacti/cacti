/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.contract

import com.cordaSimpleApplication.state.BondAssetState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.transactions.LedgerTransaction

/**
 * An implementation of a sample bond (non-fungible) asset in Corda.
 *
 * This contract enforces rules regarding the creation of a valid [BondAssetState], and operations on [BondAssetState].
 *
 * For a new [BondAssetState] to be issued onto the ledger, a transaction is required which takes:
 * - Zero input states.
 * - One output state: the new [BondAssetState].
 * - An Create() command with the public keys of the owner of the asset.
 *
 */
class BondAssetContract : Contract {
    companion object {
        @JvmStatic
        val ID = "com.cordaSimpleApplication.contract.BondAssetContract"
    }

    /**
     * The verify() function of any of the states' contracts must not throw an exception for a transaction to be
     * considered valid.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<BondAssetContract.Commands>()
        when (command.value) {
            is BondAssetContract.Commands.Issue -> requireThat {
                // Generic constraints around the fungible token asset issuance transaction.
                "No inputs should be consumed when issuing an asset." using (tx.inputsOfType<BondAssetState>().isEmpty())
                "Only one output state should be created." using (tx.outputsOfType<BondAssetState>().size == 1)
                val outputState = tx.outputsOfType<BondAssetState>().single()
                val requiredSigners = outputState.participants.map { it.owningKey }
                "The participants must be the signers." using (command.signers.containsAll(requiredSigners))
            }
            is BondAssetContract.Commands.Delete -> requireThat {
                // Generic constraints around the asset deletion transaction
                "Only one input state should be consumed with deletion of an asset." using (tx.inputsOfType<BondAssetState>().size == 1)
                "No output state should be created." using (tx.outputsOfType<BondAssetState>().isEmpty())
                val inputState = tx.inputsOfType<BondAssetState>()[0]
                val requiredSigners = listOf(inputState.owner.owningKey)
                "The asset owner must be the signer." using (command.signers.containsAll(requiredSigners))
            }
            is BondAssetContract.Commands.Transfer -> requireThat {
                // Generic constraints around the transaction that transfers ownership of an asset from one Party to other Party
                "One input state should be consumed for transferring." using (tx.inputsOfType<BondAssetState>().size == 1)
                val inputState = tx.inputsOfType<BondAssetState>()[0]
                "One output state only should be created." using (tx.outputsOfType<BondAssetState>().size == 1)
                val outputState = tx.outputsOfType<BondAssetState>()[0]
                "The input and output states part of the transfer should have the same id." using (inputState.id == outputState.id)
                "The input and output states part of the transfer should be of same bond/non-fungible asset type." using (inputState.type == outputState.type)
                "The input and output states part of the transfer should not belong to the same owner." using (inputState.owner != outputState.owner)
                val requiredSigners = listOf(inputState.owner.owningKey, outputState.owner.owningKey)
                "The owners of the input and output assets must be the signers." using (command.signers.containsAll(requiredSigners))
            }
        }
    }

    /**
     * This contract implements the commands: Issue, Delete and Transfer.
     */
    interface Commands : CommandData {
        class Issue : Commands
        class Delete : Commands
        class Transfer : Commands
    }
}
