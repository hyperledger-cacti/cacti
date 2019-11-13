package com.accenture.interoperability.contracts

import com.accenture.interoperability.states.AssetState
import com.accenture.interoperability.states.VerifyState
import net.corda.core.contracts.*
import net.corda.core.transactions.LedgerTransaction

/**
 * Asset contract.
 */
class AssetContract : Contract {

    interface Commands : CommandData {
        class Create : TypeOnlyCommandData(), Commands
        class Copy : TypeOnlyCommandData(), Commands
        class Lock : TypeOnlyCommandData(), Commands
    }

    // A transaction is valid if the verify() function of the contract of all the transaction's input and output states
    // does not throw an exception.
    override fun verify(tx: LedgerTransaction) {
        val cmd = tx.commands.requireSingleCommand(Commands::class.java)
        when (cmd.value) {
            is Commands.Copy -> {
                verifyCopyAsset(cmd, tx)
            }
            is Commands.Lock -> {
                verifyLockAsset(cmd, tx)
            }
            is Commands.Create -> {
                verifyCreateAsset(cmd, tx)
            }
            else -> throw IllegalArgumentException("Unrecognised command ${cmd.value}")
        }
    }

    private fun verifyLockAsset(cmd: CommandWithParties<Commands>, tx: LedgerTransaction) {
        require(tx.inputs.size == 1)
        { "Input state must be one" }
        require(tx.outputs.size == 1)
        { "Output state must be one" }

        val input = tx.inputsOfType(AssetState::class.java).single()
        with(input) {
            require(!locked)
            { "Input state must be unlocked" }
        }

        val output = tx.outputsOfType(AssetState::class.java).single()
        with(output) {
            require(linearId == input.linearId)
            { "linearId for input and output states must be same" }
            require(locked)
            { "Input state must be locked" }
            participants.forEach {
                require(it.owningKey in cmd.signers)
                { "Need signatures from all participants" }
            }
        }
    }

    private fun verifyCreateAsset(cmd: CommandWithParties<Commands>, tx: LedgerTransaction) {
        require(tx.inputs.isEmpty())
        { "Input must be empty" }
        require(tx.outputs.size == 1)
        { "Output state must be one" }
        with(tx.outputsOfType(AssetState::class.java).single()) {
            participants.forEach {
                require(it.owningKey in cmd.signers)
                { "Need signatures from all participants" }
            }
        }
    }

    private fun verifyCopyAsset(cmd: CommandWithParties<Commands>, tx: LedgerTransaction) {
        verifyCreateAsset(cmd, tx)
        val verifyState = tx.referenceInputRefsOfType(VerifyState::class.java).singleOrNull()?.state?.data
            ?: throw IllegalArgumentException("Transaction must have one reference to VerifyState")

        val accepted = verifyState.verifications.count { it }
        require(accepted == verifyState.verifications.size)
        { "All signatures must be valid" }
        require(accepted >= ForeignAssetFactory.MinNumberOfSignaturesPermitsCopy)
        { "Request to copy asset must have at least ${ForeignAssetFactory.MinNumberOfSignaturesPermitsCopy} valid signature" }

        val asset = tx.outputsOfType(AssetState::class.java).single()
        require(ForeignAssetFactory.parseMessage(verifyState.message) == ForeignAssetFactory.messageFromState(asset))
        { "VerifyState not matched to AssetState" }
    }
}