package com.accenture.interoperability.contracts

import com.accenture.interoperability.states.ActorState
import com.accenture.interoperability.states.VerifyState
import net.corda.core.contracts.*
import net.corda.core.transactions.LedgerTransaction

/**
 * Actor contract.
 */
class ActorContract : Contract {

    interface Commands : CommandData {
        class Verify : TypeOnlyCommandData(), Commands
        class Create : TypeOnlyCommandData(), Commands
    }

    override fun verify(tx: LedgerTransaction) {
        val cmd = tx.commands.requireSingleCommand(Commands::class.java)
        when (cmd.value) {
            is Commands.Verify ->
                verifyVerifyState(cmd, tx)

            is Commands.Create ->
                verifyCreateActor(cmd, tx)

            else -> throw IllegalArgumentException("Unrecognised command ${cmd.value}")
        }
    }

    private fun verifyVerifyState(cmd: CommandWithParties<Commands>, tx: LedgerTransaction) {
        require(tx.inputs.isEmpty())
        { "Input must be empty" }
        require(tx.outputs.size == 1)
        { "Output state must be one" }
        val verifyState = tx.outputs.first().data as? VerifyState
            ?: throw IllegalArgumentException("Output state must be VerifyState")

        require(verifyState.signatures.toSet().size == verifyState.signatures.size)
        { "Verify state cannot contain duplicate signatures." }

        val signers = tx.referenceInputRefsOfType(ActorState::class.java).map { Pair(it.ref, it.state.data) }.toMap()

        val messageHash = ForeignPubKey.messageHash(verifyState.message)
        verifyState.verifyResult.forEach {
            val signerRef = it.second
            if (signerRef != null) {
                val signer = signers[signerRef]
                    ?: throw IllegalArgumentException("Can't find actor state $signerRef")
                require(
                    ForeignPubKey.verify256k1Signature(hash = messageHash, signature = it.first, pubKey = signer.pubKey)
                ) { "Unverified signature $it" }
            }
        }

        require(verifyState.participants.any {
            it.owningKey in cmd.signers
        }) { "Need signature from one of participants" }
    }

    private fun verifyCreateActor(cmd: CommandWithParties<Commands>, tx: LedgerTransaction) {
        require(tx.inputs.isEmpty())
        { "Input must be empty" }
        require(tx.outputs.size == 1)
        { "Output state must be one" }
        with(tx.outputsOfType(ActorState::class.java).single()) {
            participants.forEach {
                require(it.owningKey in cmd.signers)
                { "Need signatures from all participants" }
            }
        }
    }

}