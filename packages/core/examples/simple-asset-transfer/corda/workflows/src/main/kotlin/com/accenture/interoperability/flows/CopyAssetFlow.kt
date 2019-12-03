package com.accenture.interoperability.flows

import co.paralleluniverse.fibers.Suspendable
import com.accenture.interoperability.contracts.AssetContract
import com.accenture.interoperability.contracts.ForeignAssetFactory
import com.accenture.interoperability.states.AssetState
import com.accenture.interoperability.states.VerifyState
import net.corda.core.contracts.ReferencedStateAndRef
import net.corda.core.contracts.StateRef
import net.corda.core.contracts.TransactionState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.crypto.SecureHash
import net.corda.core.flows.*
import net.corda.core.identity.Party
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker

object CopyAssetFlow {
    @InitiatingFlow
    @StartableByRPC
    class Initiator(
        private val stateRef: StateRef,
        private val participants: List<Party>
    ) : FlowLogic<SecureHash>() {

        companion object {
            object VerifyStateReferenceStep : ProgressTracker.Step("Verifying State Reference")
            object BuildTransactionStep : ProgressTracker.Step("Building the transaction")
            object VerifyTransactionStep : ProgressTracker.Step("Verifying the transaction proposal")
            object SignTransactionStep : ProgressTracker.Step("Signing transaction proposal")
            object CollectSignaturesStep : ProgressTracker.Step("Collecting signatures from other parties") {
                override fun childProgressTracker() = CollectSignaturesFlow.tracker()
            }

            object FinalizeTransactionStep : ProgressTracker.Step("Notarise and record the transaction") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                VerifyStateReferenceStep,
                BuildTransactionStep,
                VerifyTransactionStep,
                SignTransactionStep,
                CollectSignaturesStep,
                FinalizeTransactionStep
            )
        }

        override val progressTracker = tracker()

        @Suspendable
        override fun call(): SecureHash {
            progressTracker.currentStep = VerifyStateReferenceStep
            val verifyState = serviceHub.vaultService.queryBy(
                criteria = QueryCriteria.VaultQueryCriteria(
                    stateRefs = listOf(stateRef)
                ),
                contractStateType = VerifyState::class.java
            ).states.singleOrNull()
                ?: throw FlowException("Wrong reference on VerifyState")

            progressTracker.currentStep = BuildTransactionStep
            val message = ForeignAssetFactory.parseMessage(verifyState.state.data.message)
            require(subFlow(GetAssetFlow(assetId = message.assetId)) == null)
            { "Asset with assetId = \"${message.assetId}\" already created" }

            val asset = AssetState(
                participants = (participants.toSet() + ourIdentity).toList(),
                linearId = UniqueIdentifier(message.assetId),
                origin = message.origin.map(ForeignAssetFactory::origin2Pair),
                property1 = message.properties.property1,
                property2 = message.properties.property2
            )
            val sessions = asset.participants
                .filter { it != ourIdentity }
                .map { initiateFlow(it) }

            val notary = verifyState.state.notary
            val utx = TransactionBuilder(notary)
                .addReferenceState(ReferencedStateAndRef(verifyState))
                .addOutputState(TransactionState(data = asset, notary = notary))
                .addCommand(AssetContract.Commands.Copy(), asset.participants.map { it.owningKey })

            progressTracker.currentStep = VerifyTransactionStep
            utx.verify(serviceHub)

            progressTracker.currentStep = SignTransactionStep
            val ptx = serviceHub.signInitialTransaction(utx, ourIdentity.owningKey)

            progressTracker.currentStep = CollectSignaturesStep
            val stx = subFlow(
                CollectSignaturesFlow(ptx, sessions, CollectSignaturesStep.childProgressTracker())
            )

            progressTracker.currentStep = FinalizeTransactionStep
            val ftx = subFlow(
                FinalityFlow(stx, sessions, FinalizeTransactionStep.childProgressTracker())
            )

            return ftx.id
        }
    }


    /**
     * This flow checks the transaction proposal, adds its own signature and records the AssetState to the vault.
     */
    @InitiatedBy(Initiator::class)
    class Responder(private val counterPartySession: FlowSession) : FlowLogic<Unit>() {
        @Suspendable
        override fun call() {
            subFlow(
                object : SignTransactionFlow(counterPartySession) {
                    override fun checkTransaction(stx: SignedTransaction) {

                        if (stx.tx.commands.filter { it.value is AssetContract.Commands.Copy }.size != 1)
                            throw FlowException("Wrong AssetContract command")

                        try {
                            require(ourIdentity in stx.tx.outputsOfType<AssetState>().single().participants)
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