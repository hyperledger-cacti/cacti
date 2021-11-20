/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.contracts

import com.weaver.corda.app.interop.states.AssetPledgeState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StaticPointer
import net.corda.core.transactions.LedgerTransaction
import java.time.Instant
import java.util.*

/**
 * AssetTransferContract defines the rules for managing a [AssetPledgeState].
 *
 */
class AssetTransferContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "com.weaver.corda.app.interop.contracts.AssetTransferContract"
    }

    /**
     * A transaction is valid if the verify() function of the contract of all the transaction's
     * input and output states does not throw an exception.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Pledge -> requireThat {
                "There should be one input state." using (tx.inputs.size == 1)
                "There should be one output state." using (tx.outputs.size == 1)
                "The output state should be of type AssetPledgeState." using (tx.outputs[0].data is AssetPledgeState)
                
                // Get the Asset Pledge State
                val pledgeState = tx.outputs[0].data as AssetPledgeState
                
                // Check if timeout is beyond current time
                "Timeout after current time" using (pledgeState.expiryTime > Instant.now())
                
                // Check if the asset owner is the locker
                val inputState = tx.inputs[0].state.data
                "Locker must be the owner of pledged asset" using inputState.participants.containsAll(listOf(pledgeState.locker))
                
                // Check if asset consumed in input is same as in HTLC State
                val assetPointer = StaticPointer(tx.inputs[0].ref, tx.inputs[0].state.data.javaClass)
                "Asset State match with input state" using (assetPointer.equals(pledgeState.assetStatePointer))
                
                // Check if the locker is a signer
                val requiredSigners = pledgeState.participants.map { it.owningKey }
                "The required signers of the transaction must include the locker." using (command.signers.containsAll(requiredSigners))
            }
            is Commands.ReclaimPledgedAsset -> requireThat {
                "There should be one input state." using (tx.inputs.size == 1)
                "The input state should be of type AssetPledgeState." using (tx.inputs[0].state.data is AssetPledgeState)
                "There should be one output state." using (tx.outputs.size == 1)
                
                // Get the input asset pledge state
                val pledgeState = tx.inputs[0].state.data as AssetPledgeState
                
                // Check if timeWindow > expiryTime
                val fromTime = tx.timeWindow!!.fromTime!!
                "TimeWindow for reclaim pledged asset should be after expiry time." using (fromTime.isAfter(pledgeState.expiryTime))
                
                // Check if the asset owner is the locker
                val outputState = tx.outputs[0].data
                "Locker must be the owner of pledged asset" using outputState.participants.containsAll(listOf(pledgeState.locker))
                
                // Verify if locker is the signer
                val requiredSigners = listOf(pledgeState.locker.owningKey)
                "The required signers of the transaction must include the locker." using (command.signers.containsAll(requiredSigners))
            }
        }
    }

    /**
     * Commands are used to indicate the intent of a transaction.
     * Commands for [AssetExchangeHTLCStateContract] are:
     * - Lock
     * - Unlock
     * - Claim (preImage)
     */
    interface Commands : CommandData {
        class Pledge : Commands
        class ReclaimPledgedAsset : Commands
        // class ClaimPledgedAsset(val assetClaimHTLC: AssetClaimHTLCData) : Commands
        //class ReclaimPledgedAsset : Commands
    }
}
