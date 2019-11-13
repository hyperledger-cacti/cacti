package com.accenture.interoperability.flows

import co.paralleluniverse.fibers.Suspendable
import com.accenture.interoperability.contracts.ActorContract
import com.accenture.interoperability.contracts.ForeignAssetFactory
import com.accenture.interoperability.contracts.ForeignPubKey
import com.accenture.interoperability.states.ActorState
import com.accenture.interoperability.states.ActorType
import com.accenture.interoperability.states.VerifyState
import net.corda.core.contracts.ReferencedStateAndRef
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.StateRef
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.*
import net.corda.core.identity.Party
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker

object VerifySignedMessageFlow {

    fun verifyStateExternalId(message: String): String = try{
        ForeignAssetFactory.parseMessage(message).assetId
    } catch (ex: Throwable) {
        ""
    }

    /**
     *  This flow returns a list of verification results and references to VerifyStates that have already been verified.
     */
    @StartableByRPC
    class QueryAlreadyBeenValidated(
        private val message: String,
        signatures: Collection<String>
    ) : FlowLogic<List<Pair<List<Boolean>, StateRef>>>() {

        private val signaturesSet = signatures.toSet()

        @Suspendable
        override fun call(): List<Pair<List<Boolean>, StateRef>> =
            serviceHub.vaultService.queryBy<VerifyState>(
                QueryCriteria.LinearStateQueryCriteria(
                    externalId = listOf(verifyStateExternalId(message))
                )
            ).states.mapNotNull {
                with(it.state.data) {
                    if (message == this.message &&  signaturesSet == this.signatures.toSet())
                        Pair(this.verifications, it.ref)
                    else
                        null

                }

            }
    }

    /**
     *  This flow creates a new VerifyState for the message with at least one valid signature.
     *  Return verification result and StateRef of the created VerifyState..
     */
    @InitiatingFlow
    @StartableByRPC
    class Initiator(
        private val message: String,
        private val signatures: List<String>
    ) : FlowLogic<Pair<List<Boolean>, StateRef?>>() {

        companion object {
            object VerifyMessageStep : ProgressTracker.Step("Verify message")
            object BuildTransactionStep : ProgressTracker.Step("Building the transaction")
            object SignTransactionStep : ProgressTracker.Step("Signing transaction proposal")

            object FinalizeTransactionStep : ProgressTracker.Step("Notarise and record the transaction") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                VerifyMessageStep,
                BuildTransactionStep,
                SignTransactionStep,
                FinalizeTransactionStep
            )
        }

        override val progressTracker = tracker()

        @Suspendable
        override fun call(): Pair<List<Boolean>, StateRef?> {
            progressTracker.currentStep = VerifyMessageStep
            if (signatures.isEmpty())
                throw FlowException("The list of signatures must not be empty.")

            try {
                ForeignAssetFactory.parseMessage(message)
            } catch (ex: Throwable) {
                throw FlowException("The message must be an Asset JSON serialization.", ex)
            }

            if (subFlow(QueryAlreadyBeenValidated(message, signatures)).isNotEmpty())
                throw FlowException("The message has already been verified.")

            return createVerifyState()
                ?.let { Pair(it.state.data.verifications, it.ref) }
                ?: Pair(signatures.map { false }, null) // the message have no valid signatures. return [false, ..., false], null
        }

        @Suspendable
        private fun createVerifyState(): StateAndRef<VerifyState>? {
            // Request a list of actors who have validator rights. viz type == FOREIGN_VALIDATOR
            val validators = serviceHub.vaultService.queryBy(
                ActorState::class.java
            ).states.filter {
                with(it.state.data) {
                    (type == ActorType.FOREIGN_VALIDATOR)
                }
            }
            if (validators.isEmpty()) // no validator found
                return null

            val messageHash = ForeignPubKey.messageHash(message)
            val searchResult = signatures.map {
                Pair(it, seekForSigner(it, messageHash, validators))
            }
            if (searchResult.all { it.second == null })
                return null

            progressTracker.currentStep = BuildTransactionStep
            val utx = TransactionBuilder(validators.first().state.notary)
            // Adding signers as reference states
            searchResult.mapNotNull { it.second?.let { actor -> Pair(actor.ref, actor) } } // filtering null and duplicates
                .toMap().values
                .forEach {
                    utx.addReferenceState(
                        ReferencedStateAndRef(it)
                    )
                }

            // participants is a collection of actor state's participants
            val participants = searchResult
                .fold(LinkedHashSet<Party>()) { set, add -> add.second?.let { set.addAll(it.state.data.participants) }; set }.toList()

            // Adding single VerifyState
            val verifyState = VerifyState(
                participants = participants,
                linearId = UniqueIdentifier(verifyStateExternalId(message)),
                message = message,
                verifyResult = searchResult.map { Pair(it.first, it.second?.ref) }
            )
            utx.addOutputState(verifyState)

            // Adding appropriately command
            utx.addCommand(ActorContract.Commands.Verify(), ourIdentity.owningKey)

            progressTracker.currentStep = SignTransactionStep
            val ptx = serviceHub.signInitialTransaction(utx, ourIdentity.owningKey)

            progressTracker.currentStep = FinalizeTransactionStep
            val sessions = participants
                .filter { it != ourIdentity }
                .map { initiateFlow(it) }
            val ftx = subFlow(
                FinalityFlow(
                    ptx, sessions, FinalizeTransactionStep.childProgressTracker()
                )
            )
            return ftx.tx.outRef(verifyState)
        }

        /**
         * The attempt to find actor with public key witch used to make the signature.
         */
        @Suspendable
        private fun seekForSigner(signatureText: String, messageHash: ByteArray, validators: List<StateAndRef<ActorState>>): StateAndRef<ActorState>? {
            try {
                val signature = ForeignPubKey.parse256k1Signature(signatureText)
                validators.forEach {
                    if (ForeignPubKey.verify256k1Signature(hash = messageHash, signature = signature, pubKey = it.state.data.pubKey))
                        return it
                }

            } catch (ex: Exception) {
                logger.error(signatureText, ex)
            }
            return null
        }
    }

    /**
     * This flow does nothing. This is required to record VerifyState to vaults of participants.
     */
    @InitiatedBy(Initiator::class)
    class Responder(val counterPartySession: FlowSession) : FlowLogic<Unit>() {
        @Suspendable
        override fun call() {
            subFlow(ReceiveFinalityFlow(otherSideSession = counterPartySession))
        }
    }
}