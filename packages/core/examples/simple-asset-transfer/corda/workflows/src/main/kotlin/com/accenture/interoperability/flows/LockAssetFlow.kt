package com.accenture.interoperability.flows

import co.paralleluniverse.fibers.Suspendable
import com.accenture.interoperability.contracts.AssetContract
import net.corda.core.contracts.TransactionState
import net.corda.core.crypto.SecureHash
import net.corda.core.flows.*
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker

object LockAssetFlow {

    @InitiatingFlow
    @StartableByRPC
    class Initiator(
        private val assetId: String,
        private val targetDLTId: String,
        private val receiverPubKey: String
    ) : FlowLogic<SecureHash>() {
        companion object {
            object BuildTransactionStep : ProgressTracker.Step("Building the transaction")
            object SignTransactionStep : ProgressTracker.Step("Signing transaction proposal")
            object CollectSignaturesStep : ProgressTracker.Step("Collecting signatures from other parties") {
                override fun childProgressTracker() = CollectSignaturesFlow.tracker()
            }

            object FinalizeTransactionStep : ProgressTracker.Step("Notarise and record the transaction") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                BuildTransactionStep,
                SignTransactionStep,
                CollectSignaturesStep,
                FinalizeTransactionStep
            )
        }

        override val progressTracker = tracker()

        @Suspendable
        override fun call(): SecureHash {
            val stateAndRef = subFlow(GetAssetFlow(assetId = assetId))!!

            val asset = stateAndRef.state.data.copy(
                targetDltId = targetDLTId, receiverPK = receiverPubKey
            )

            val sessions = asset.participants
                .filter { it != ourIdentity }
                .map { initiateFlow(it) }

            progressTracker.currentStep = BuildTransactionStep
            val notary = stateAndRef.state.notary
            val utx = TransactionBuilder(notary)
                .addInputState(stateAndRef)
                .addOutputState(TransactionState(data = asset, notary = notary))
                .addCommand(AssetContract.Commands.Lock(), asset.participants.map { it.owningKey })

            progressTracker.currentStep = SignTransactionStep
            val ptx = serviceHub.signInitialTransaction(utx, ourIdentity.owningKey)

            progressTracker.currentStep = CollectSignaturesStep
            val stx = subFlow(
                CollectSignaturesFlow(ptx, sessions, CollectSignaturesStep.childProgressTracker())
            )

            progressTracker.currentStep = FinalizeTransactionStep
            val ftx = subFlow(
                FinalityFlow(
                    stx, sessions, FinalizeTransactionStep.childProgressTracker()
                )
            )

            return ftx.id
        }
    }

    @InitiatedBy(Initiator::class)
    class Responder(val counterPartySession: FlowSession) : FlowLogic<Unit>() {
        @Suspendable
        override fun call() {
            subFlow(
                object : SignTransactionFlow(counterPartySession) {
                    override fun checkTransaction(stx: SignedTransaction) {
                        if (stx.tx.commands.single().value !is AssetContract.Commands.Lock)
                            throw FlowException("Wrong command")

                        try {
                            require(ourIdentity in stx.tx.outputs.single().data.participants)
                        } catch (th: Throwable) {
                            throw FlowException("Wrong output state", th)
                        }

                    }
                }
            )
            subFlow(ReceiveFinalityFlow(otherSideSession = counterPartySession))
        }
    }

}