/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.contracts

import com.weaver.corda.app.interop.states.AssetExchangeHTLCState
import com.weaver.corda.app.interop.states.AssetClaimHTLCData
import com.weaver.corda.app.interop.states.AssetExchangeTxState
import com.weaver.corda.app.interop.states.sha512
import com.weaver.protos.common.asset_locks.AssetLocks.HashMechanism
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Contract
import net.corda.core.contracts.requireSingleCommand
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StaticPointer
import net.corda.core.transactions.LedgerTransaction
import net.corda.core.crypto.sha256
import java.time.Instant
import java.util.*

/**
 * AssetExchangeHTLCStateContract defines the rules for managing a [AssetExchangeHTLCState].
 *
 */
class AssetExchangeHTLCStateContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "com.weaver.corda.app.interop.contracts.AssetExchangeHTLCStateContract"
    }

    /**
     * A transaction is valid if the verify() function of the contract of all the transaction's
     * input and output states does not throw an exception.
     */
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.Lock -> requireThat {
                "There should be one input state." using (tx.inputs.size == 1)
                "There should be one output state." using (tx.outputs.size == 1)
                "The output state should be of type AssetExchangeHTLCState." using (tx.outputs[0].data is AssetExchangeHTLCState)
                
                // Get the HTLC State
                val htlcState = tx.outputs[0].data as AssetExchangeHTLCState
                
                // Check if timeout is beyond current time
                "Timeout after current time" using (htlcState.lockInfo.expiryTime > Instant.now())
                
                // Check if owner is locker
                val inputState = tx.inputs[0].state.data
                "Locker must be the owner of asset" using inputState.participants.containsAll(listOf(htlcState.locker))
                
                // Check if asset consumed in input is same as in HTLC State
                val assetPointer = StaticPointer(tx.inputs[0].ref, tx.inputs[0].state.data.javaClass)
                "Asset State match with input state" using (assetPointer.equals(htlcState.assetStatePointer))
                
                // Check if both locker and recipient are signers
                val participantKeys = htlcState.participants.map { it.owningKey }
                "The required signers of the transaction must include locker and recipient." using (command.signers.containsAll(participantKeys))
            }
            is Commands.Claim -> requireThat {
                "There should be one input state." using (tx.inputs.size == 1)
                "The input state should be of type AssetExchangeHTLCState." using (tx.inputs[0].state.data is AssetExchangeHTLCState)
                "There should be one output state." using (tx.outputs.size == 1)
                
                // Get the Claim Command
                val claimCmd = tx.commandsOfType<Commands.Claim>().single()
                
                // Get the input HTLC state
                val htlcState = tx.inputs[0].state.data as AssetExchangeHTLCState
                
                // Check if timeWindow <= expiryTime
                val untilTime = tx.timeWindow!!.untilTime!!
                "Time Window for claim should be before expiry time." using (untilTime.isBefore(htlcState.lockInfo.expiryTime) || untilTime.equals(htlcState.lockInfo.expiryTime))
                
                // Verify if (hash, preimage) pair matches
                "HashMechanism must be same in Lock and Claim." using (claimCmd.value.assetClaimHTLC.hashMechanism == htlcState.lockInfo.hashMechanism)
                var computedHash: ByteArray? = null
                if (claimCmd.value.assetClaimHTLC.hashMechanism == HashMechanism.SHA256) {
                    computedHash = claimCmd.value.assetClaimHTLC.hashPreimage.sha256().bytes
                } else if (claimCmd.value.assetClaimHTLC.hashMechanism == HashMechanism.SHA512) {
                    computedHash = claimCmd.value.assetClaimHTLC.hashPreimage.sha512().bytes
                }
                "Hash Mechanism must be among the supported mechanisms." using (computedHash != null)
                
                val expectedHash = htlcState.lockInfo.hash.bytes
                "Hash must match with hash of pre-image." using (Arrays.equals(computedHash!!, expectedHash))
                
                // Check if owner is recipient
                val outputState = tx.outputs[0].data
                "Recipient must be the owner of asset" using outputState.participants.containsAll(listOf(htlcState.recipient))
                
                // Verify if recipient is signer
                val participantKeys = listOf(htlcState.recipient.owningKey)
                "The required signers of the transaction must include recipient." using (command.signers.containsAll(participantKeys))
            }
            is Commands.Unlock -> requireThat {
                "There should be one input state." using (tx.inputs.size == 1)
                "The input state should be of type AssetExchangeHTLCState." using (tx.inputs[0].state.data is AssetExchangeHTLCState)
                "There should be one output state." using (tx.outputs.size == 1)
                
                // Get the input HTLC state
                val htlcState = tx.inputs[0].state.data as AssetExchangeHTLCState
                
                // Check if timeWindow > expiryTime
                val fromTime = tx.timeWindow!!.fromTime!!
                "TimeWindow for unlock should be after expiry time." using (fromTime.isAfter(htlcState.lockInfo.expiryTime))
                
                // Check if owner is locker
                val outputState = tx.outputs[0].data
                "Locker must be the owner of asset" using outputState.participants.containsAll(listOf(htlcState.locker))
                
                // Verify if locker is signer
                val participantKeys = listOf(htlcState.locker.owningKey)
                "The required signers of the transaction must include locker." using (command.signers.containsAll(participantKeys))
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
        class Lock : Commands
        class Unlock : Commands
        class Claim(val assetClaimHTLC: AssetClaimHTLCData) : Commands
    }
}
/**
 * AssetExchangeTxStateContract defines the rules for managing a [AssetExchangeTxState].
 *
 */
class AssetExchangeTxStateContract : Contract {
    companion object {
        // Used to identify our contract when building a transaction.
        const val ID = "com.weaver.corda.app.interop.contracts.AssetExchangeTxStateContract"
    }
    override fun verify(tx: LedgerTransaction) {
        val command = tx.commands.requireSingleCommand<Commands>()
        when (command.value) {
            is Commands.SaveClaimTx -> requireThat {
                "There should be 0 input state." using (tx.inputs.size == 0)
                "There should be one output state." using (tx.outputs.size == 1)
                "The output state should be of type AssetExchangeTxState." using (tx.outputs[0].data is AssetExchangeTxState)
                
                // Check if locker is the signer
                val participantKeys = tx.outputs[0].data.participants.map { it.owningKey }
                "The required signers of the transaction must include locker." using (command.signers.containsAll(participantKeys))
            }
        }
    }
    interface Commands : CommandData {
        class SaveClaimTx : Commands
    }
}

