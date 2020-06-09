package com.accenture.interoperability.flows

import co.paralleluniverse.fibers.Suspendable
import com.accenture.interoperability.contracts.ActorContract
import com.accenture.interoperability.states.ActorState
import com.accenture.interoperability.states.ActorType
import net.corda.core.contracts.TransactionState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.crypto.SecureHash
import net.corda.core.flows.*
import net.corda.core.identity.Party
import net.corda.core.node.ServiceHub
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker

object CreateActorFlow {

    @InitiatingFlow
    @StartableByRPC
    class Initiator(
        private val pubKey: String,
        private val participants: List<Party> = listOf(),
        private val name: String,
        private val type: ActorType
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

            if (serviceHub.isActorExistByPublicKey(pubKey))
                throw FlowException("Actor with pubKey = $pubKey already exist")

            val asset = ActorState(
                participants = (participants.toSet() + ourIdentity).toList(),
                linearId = UniqueIdentifier(pubKey),
                name = name,
                type = type
            )
            val sessions = asset.participants
                .filter { it != ourIdentity }
                .map { initiateFlow(it) }

            progressTracker.currentStep = BuildTransactionStep
            val notary = serviceHub.networkMapCache.notaryIdentities.first()
            val utx = TransactionBuilder(notary)
                .addOutputState(TransactionState(data = asset, notary = notary))
                .addCommand(ActorContract.Commands.Create(), asset.participants.map { it.owningKey })

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

                        if (stx.tx.commands.single().value !is ActorContract.Commands.Create)
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

/**
 * Return boolean about actor' existence, using it's public key
 */
fun ServiceHub.isActorExistByPublicKey(
    pubKey: String
) = vaultService.queryBy<ActorState> (
    QueryCriteria.LinearStateQueryCriteria(
        externalId = listOf(pubKey)
    )
).states.isNotEmpty()
