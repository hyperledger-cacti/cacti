package com.cordaSimpleApplication.flow

import co.paralleluniverse.fibers.Suspendable
import com.cordaSimpleApplication.state.AssetState
import com.cordaSimpleApplication.contract.AssetContract
import javassist.NotFoundException
import net.corda.core.contracts.Command
import net.corda.core.contracts.StateAndRef
import net.corda.core.identity.Party
import net.corda.core.contracts.StaticPointer
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.flows.*
import net.corda.core.node.services.Vault
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker
import net.corda.core.utilities.ProgressTracker.Step
import net.corda.core.contracts.requireThat
import java.util.*


/**
 * The IssueAssetState flow allows the party owning the fungible token assets perform actions on the assets.
 * @property numberOfTokens the number of fungible token assets to be part of the [AssetState] to be issued.
 * @property tokenType the type of the fungible token assets to be part of the [AssetState] to be issued.
 */
object AssetFlow {
    @InitiatingFlow
    @StartableByRPC
    class IssueAssetState(val numerOfTokens: Int, val tokenType: String) : FlowLogic<SignedTransaction>() {
        /**
         * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
         * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
         */
        companion object {
            object GENERATING_TRANSACTION : Step("Generating transaction based on new fungible token asset state.")
            object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
            object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
            object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                    GENERATING_TRANSACTION,
                    VERIFYING_TRANSACTION,
                    SIGNING_TRANSACTION,
                    FINALISING_TRANSACTION
            )
        }

        override val progressTracker = tracker()

        /**
         * The flow logic is encapsulated within the call() method.
         */
        @Suspendable
        override fun call(): SignedTransaction {

            // Obtain a reference from a notary we wish to use.
            val notary = serviceHub.networkMapCache.notaryIdentities.single()

            // Stage 1.
            progressTracker.currentStep = GENERATING_TRANSACTION
            // Generate an unsigned transaction.
            val assetState = AssetState(numerOfTokens, tokenType, serviceHub.myInfo.legalIdentities.first())

            val txCommand = Command(AssetContract.Commands.Issue(), assetState.participants.map { it.owningKey })
            val txBuilder = TransactionBuilder(notary)
                    .addOutputState(assetState, AssetContract.ID)
                    .addCommand(txCommand)

            // Stage 2.
            progressTracker.currentStep = VERIFYING_TRANSACTION
            // Verify that the transaction is valid.
            txBuilder.verify(serviceHub)

            // Stage 3.
            progressTracker.currentStep = SIGNING_TRANSACTION
            // Sign the transaction.
            val signedTx = serviceHub.signInitialTransaction(txBuilder)

            // Stage 4.
            progressTracker.currentStep = FINALISING_TRANSACTION
            val session = listOf<FlowSession>()
            // Notarise and record the transaction in both parties' vaults.
            return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
        }
    }

    @InitiatingFlow
    @StartableByRPC
    class IssueAssetStateFromStateRefHelper(private val inputStatePointer: StaticPointer<AssetState>) : FlowLogic<AssetState>() {

        override fun call(): AssetState {
            val inputState = inputStatePointer.resolve(serviceHub).state.data
            // below creates an asset state with a different linearId
            return AssetState(inputState.quantity, inputState.tokenType, serviceHub.myInfo.legalIdentities.first())
            // below creates an asset state with the same linearId
            //return inputState.copy(owner = serviceHub.myInfo.legalIdentities.first())
        }
    }

    /**
     * The DeleteAssetState flow is used to delete an existing [AssetState].
     *
     * @property linearId the filter for the [AssetState] to be deleted.
     */
    @InitiatingFlow
    @StartableByRPC
    class DeleteAssetState(val linearId: String) : FlowLogic<SignedTransaction>() {
        /**
         * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
         * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
         */
        companion object {
            object GENERATING_TRANSACTION : Step("Generating transaction based on the passed linearId.")
            object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
            object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
            object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }
            fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
            )
        }

        override val progressTracker = tracker()

        /**
         * The call() method captures the logic to build and sign a transaction that deletes an [AssetState].
         *
         * @return returns the signed transaction.
         */
        @Suspendable
        override fun call(): SignedTransaction {
            // Obtain a reference to the notary we want to use.
            val notary = serviceHub.networkMapCache.notaryIdentities[0]

            // Stage 1.
            progressTracker.currentStep = GENERATING_TRANSACTION
            // Generate an unsigned transaction.
            val uuid = UniqueIdentifier.Companion.fromString(linearId)
            val criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            val assetStatesWithLinearId = serviceHub.vaultService.queryBy<AssetState>(criteria).states

            if (assetStatesWithLinearId.isEmpty()) {
                throw NotFoundException("AssetState with linearId $linearId not found")
            }
            val inputState = assetStatesWithLinearId.first()
            println("Deleting asset state from the ledger: $inputState\n")
            val txCommand = Command(AssetContract.Commands.Delete(), listOf(inputState.state.data.owner.owningKey))
            val txBuilder = TransactionBuilder(notary)
                .addInputState(inputState)
                .addCommand(txCommand)

            // Stage 2.
            progressTracker.currentStep = VERIFYING_TRANSACTION
            // Verify that the transaction is valid.
            txBuilder.verify(serviceHub)

            // Stage 3.
            progressTracker.currentStep = SIGNING_TRANSACTION
            // Sign the transaction.
            val signedTx = serviceHub.signInitialTransaction(txBuilder)

            // Stage 4.
            progressTracker.currentStep = FINALISING_TRANSACTION
            val session = listOf<FlowSession>()
            // Notarise and record the transaction in the party's vault.
            return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
        }
    }

    /**
     * The GetStatesByTokenType flow is used to retrieve list of [AssetState]s from the vault based on the tokenType.
     *
     * @property tokenType the filter for the [AssetState] list to be retrieved.
     */
    @StartableByRPC
    class GetStatesByTokenType(val tokenType: String) : FlowLogic<ByteArray>() {
        @Suspendable

        /**
         * The call() method captures the logic to find one or more [AssetState]s in the vault based on the tokenType.
         *
         * @return returns list of [AssetState]s.
         */
        override fun call(): ByteArray {
            val states = serviceHub.vaultService.queryBy<AssetState>().states
                .filter { it.state.data.tokenType == tokenType }
                .map { it.state.data }
            println("Retrieved states with tokenType $tokenType: $states\n")
            return states.toString().toByteArray()
        }
    }

    /**
     * The GetAssetByLinearId flow is used to retrieve a [AssetState] from the vault based on its linearId.
     *
     * @property linearId the linearId for the [AssetState] to be retrieved.
     */
    @StartableByRPC
    class GetStateByLinearId(val linearId: String) : FlowLogic<String>() {
        @Suspendable

        /**
         * The call() method captures the logic to find a [AssetState] in the vault based on its linearId.
         *
         * @return returns the [AssetState].
         */
        override fun call(): String {
            val uuid = UniqueIdentifier.Companion.fromString(linearId)
            val criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            val assetStates = serviceHub.vaultService.queryBy<AssetState>(criteria).states
                .map { it.state.data }
            val assetState = assetStates.first()
            println("Retrieved asset state with linearId $linearId: $assetState\n")
            return assetState.toString()
        }
    }

    @StartableByRPC
    class IssueAssetStateFromStateRef(val linearId: String) : FlowLogic<SignedTransaction>() {
        /**
         * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
         * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
         */
        companion object {
            object GENERATING_TRANSACTION : Step("Generating transaction based on the linerId provided.")
            object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
            object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
            object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
            )
        }

        override val progressTracker = tracker()

        /**
         * The flow logic is encapsulated within the call() method.
         */
        @Suspendable
        override fun call(): SignedTransaction {

            // Obtain a reference from a notary we wish to use.
            val notary = serviceHub.networkMapCache.notaryIdentities.single()

            // Stage 1.
            progressTracker.currentStep = GENERATING_TRANSACTION
            // Generate an unsigned transaction.

            val uuid = UniqueIdentifier.Companion.fromString(linearId)
            val criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            val assetStates = serviceHub.vaultService.queryBy<AssetState>(criteria).states
            val pointedToState = assetStates.first()
            println("Retrieved asset state with linearId $linearId: $pointedToState\n")

            val stateStaticPointer = StaticPointer(pointedToState.ref, pointedToState.state.data.javaClass)
            //val pointedToStateCopy = stateStaticPointer.resolve(serviceHub).state.data
            //val assetState = AssetState(pointedToStateCopy.quantity, pointedToStateCopy.tokenType, serviceHub.myInfo.legalIdentities.first())

            val assetState = subFlow(IssueAssetStateFromStateRefHelper(stateStaticPointer))

            val txCommand = Command(AssetContract.Commands.Issue(), assetState.participants.map { it.owningKey })
            val txBuilder = TransactionBuilder(notary)
                .addOutputState(assetState, AssetContract.ID)
                .addCommand(txCommand)

            // Stage 2.
            progressTracker.currentStep = VERIFYING_TRANSACTION
            // Verify that the transaction is valid.
            txBuilder.verify(serviceHub)

            // Stage 3.
            progressTracker.currentStep = SIGNING_TRANSACTION
            // Sign the transaction.
            val signedTx = serviceHub.signInitialTransaction(txBuilder)

            // Stage 4.
            progressTracker.currentStep = FINALISING_TRANSACTION
            val session = listOf<FlowSession>()
            // Notarise and record the transaction in the party's vault.
            return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
        }
    }

    @InitiatingFlow
    @StartableByRPC
    class MergeAssetStates(val linearId1: String, val linearId2: String) : FlowLogic<SignedTransaction>() {
        /**
         * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
         * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
         */
        companion object {
            object GENERATING_TRANSACTION : Step("Generating transaction based on input fungible token asset states.")
            object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
            object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
            object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
            )
        }

        override val progressTracker = tracker()

        /**
         * The flow logic is encapsulated within the call() method.
         */
        @Suspendable
        override fun call(): SignedTransaction {

            // Obtain a reference from a notary we wish to use.
            val notary = serviceHub.networkMapCache.notaryIdentities.single()

            // Stage 1.
            progressTracker.currentStep = GENERATING_TRANSACTION
            // Generate an unsigned transaction.

            var uuid = UniqueIdentifier.Companion.fromString(linearId1)
            var criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            var assetStatesWithLinearId = serviceHub.vaultService.queryBy<AssetState>(criteria).states
            if (assetStatesWithLinearId.isEmpty()) {
                throw NotFoundException("AssetState with linearId $linearId1 not found")
            }
            val assetState1 = assetStatesWithLinearId.first()

            uuid = UniqueIdentifier.Companion.fromString(linearId2)
            criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            assetStatesWithLinearId = serviceHub.vaultService.queryBy<AssetState>(criteria).states
            if (assetStatesWithLinearId.isEmpty()) {
                throw NotFoundException("AssetState with linearId $linearId2 not found")
            }
            val assetState2 = assetStatesWithLinearId.first()

            println("Merging asset states from the ledger: ${assetState1.state.data} and ${assetState2.state.data}\n")

            val mergedState = AssetState(assetState1.state.data.quantity + assetState2.state.data.quantity, assetState1.state.data.tokenType, serviceHub.myInfo.legalIdentities.first())

            println("Merged asset state proposed: ${mergedState}\n")

            val txCommand = Command(AssetContract.Commands.Merge(), mergedState.participants.map { it.owningKey })
            val txBuilder = TransactionBuilder(notary)
                .addInputState(assetState1)
                .addInputState(assetState2)
                .addOutputState(mergedState, AssetContract.ID)
                .addCommand(txCommand)

            // Stage 2.
            progressTracker.currentStep = VERIFYING_TRANSACTION
            // Verify that the transaction is valid.
            txBuilder.verify(serviceHub)
            println("Transaction verified")

            // Stage 3.
            progressTracker.currentStep = SIGNING_TRANSACTION
            // Sign the transaction.
            val signedTx = serviceHub.signInitialTransaction(txBuilder)
            println("Transaction signed")

            // Stage 4.
            progressTracker.currentStep = FINALISING_TRANSACTION
            val session = listOf<FlowSession>()
            // Notarise and record the transaction in the party's vault.
            return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
        }
    }

    /**
     * The RetrieveStateAndRef flow is used to retrieve an [AssetState] from the vault based on the tokenType and quantity.
     *
     * @property tokenType the filter for the [AssetState] list to be retrieved.
     * @property quantity the number of fungible token assets to be part of the [AssetState] to be issued.
     */
    @InitiatingFlow
    @StartableByRPC
    class RetrieveStateAndRef(private val tokenType: String, private val quantity: Int) : FlowLogic<StateAndRef<AssetState>?>() {

        override fun call(): StateAndRef<AssetState>? {

            val states = serviceHub.vaultService.queryBy<AssetState>().states
                .filter { it.state.data.tokenType == tokenType }
                .filter { it.state.data.quantity == quantity }

            var fetchedState: StateAndRef<AssetState>? = null

            if (states.isNotEmpty()) {
                fetchedState = states.first()
                println("Retrieved state with tokenType $tokenType: $fetchedState\n")
            } else {
                println("No state found with tokenType $tokenType\n")
            }

            return fetchedState
        }
    }

    @InitiatingFlow
    @StartableByRPC
    class SplitAssetState(val linearId: String, val quantity1: Int, val quantity2: Int) : FlowLogic<SignedTransaction>() {
        /**
         * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
         * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
         */
        companion object {
            object GENERATING_TRANSACTION : Step("Generating transaction based on the fungible token asset state.")
            object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
            object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
            object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                FINALISING_TRANSACTION
            )
        }

        override val progressTracker = tracker()

        /**
         * The flow logic is encapsulated within the call() method.
         */
        @Suspendable
        override fun call(): SignedTransaction {

            // Obtain a reference from a notary we wish to use.
            val notary = serviceHub.networkMapCache.notaryIdentities.single()

            // Stage 1.
            progressTracker.currentStep = GENERATING_TRANSACTION
            // Generate an unsigned transaction.

            val uuid = UniqueIdentifier.Companion.fromString(linearId)
            val criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            val assetStatesWithLinearId = serviceHub.vaultService.queryBy<AssetState>(criteria).states
            if (assetStatesWithLinearId.isEmpty()) {
                throw NotFoundException("AssetState with linearId $linearId not found")
            }
            val splitState = assetStatesWithLinearId.first()

            println("Split asset state from the ledger: $splitState.state.data\n")

            val outputState1 = AssetState(quantity1, splitState.state.data.tokenType, serviceHub.myInfo.legalIdentities.first())
            val outputState2 = AssetState(quantity2, splitState.state.data.tokenType, serviceHub.myInfo.legalIdentities.first())
            println("Proposed states after split: ${outputState1} and ${outputState2}\n")

            val txCommand = Command(AssetContract.Commands.Split(), splitState.state.data.participants.map { it.owningKey })
            val txBuilder = TransactionBuilder(notary)
                .addInputState(splitState)
                .addOutputState(outputState1, AssetContract.ID)
                .addOutputState(outputState2, AssetContract.ID)
                .addCommand(txCommand)

            // Stage 2.
            progressTracker.currentStep = VERIFYING_TRANSACTION
            // Verify that the transaction is valid.
            txBuilder.verify(serviceHub)
            println("Transaction verified")

            // Stage 3.
            progressTracker.currentStep = SIGNING_TRANSACTION
            // Sign the transaction.
            val signedTx = serviceHub.signInitialTransaction(txBuilder)
            println("Transaction signed")

            // Stage 4.
            progressTracker.currentStep = FINALISING_TRANSACTION
            val session = listOf<FlowSession>()
            // Notarise and record the transaction in the party's vault.
            return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
        }
    }

    @InitiatingFlow
    @StartableByRPC
    class TransferAssetStateInitiator(val linearId: String, val otherParty: Party) : FlowLogic<SignedTransaction>() {
        /**
         * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
         * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
         */
        companion object {
            object GENERATING_TRANSACTION : Step("Generating transaction based on new fungible token asset state.")
            object VERIFYING_TRANSACTION : Step("Verifying contract constraints.")
            object SIGNING_TRANSACTION : Step("Signing transaction with our private key.")
            object GATHERING_SIGS : Step("Gathering the counterparty's signature.") {
                override fun childProgressTracker() = CollectSignaturesFlow.tracker()
            }
            object FINALISING_TRANSACTION : Step("Obtaining notary signature and recording transaction.") {
                override fun childProgressTracker() = FinalityFlow.tracker()
            }

            fun tracker() = ProgressTracker(
                GENERATING_TRANSACTION,
                VERIFYING_TRANSACTION,
                SIGNING_TRANSACTION,
                GATHERING_SIGS,
                FINALISING_TRANSACTION
            )
        }

        override val progressTracker = tracker()

        /**
         * The flow logic is encapsulated within the call() method.
         */
        @Suspendable
        override fun call(): SignedTransaction {

            // Obtain a reference from a notary we wish to use.
            val notary = serviceHub.networkMapCache.notaryIdentities.single()

            // Stage 1.
            progressTracker.currentStep = GENERATING_TRANSACTION
            // Generate an unsigned transaction.

            val uuid = UniqueIdentifier.Companion.fromString(linearId)
            val criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
                Vault.StateStatus.UNCONSUMED, null)
            val assetStatesWithLinearId = serviceHub.vaultService.queryBy<AssetState>(criteria).states
            if (assetStatesWithLinearId.isEmpty()) {
                throw NotFoundException("AssetState with linearId $linearId not found")
            }
            val inputState = assetStatesWithLinearId.first()

            println("The asset that will be transferred is: $inputState.state.data\n")

            val outputState = inputState.state.data.copy(owner = otherParty)
            println("Updated asset state in the ledger is: $outputState\n")

            val signers = listOf(inputState.state.data.owner.owningKey, outputState.owner.owningKey)
            val txCommand = Command(AssetContract.Commands.Transfer(), signers)
            val txBuilder = TransactionBuilder(notary)
                .addInputState(inputState)
                .addOutputState(outputState, AssetContract.ID)
                .addCommand(txCommand)

            // Stage 2.
            progressTracker.currentStep = VERIFYING_TRANSACTION
            // Verify that the transaction is valid.
            txBuilder.verify(serviceHub)
            println("Transaction verified")

            // Stage 3.
            progressTracker.currentStep = SIGNING_TRANSACTION
            // Sign the transaction.
            val partSignedTx = serviceHub.signInitialTransaction(txBuilder)
            println("Transaction signed")

            // Stage 4.
            progressTracker.currentStep = GATHERING_SIGS
            // Send the state to the counterparty, and receive it back with their signature.
            val otherPartySession = initiateFlow(otherParty)
            val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, setOf(otherPartySession), GATHERING_SIGS.childProgressTracker()))
            println("Transaction signed")

            // Stage 5.
            progressTracker.currentStep = FINALISING_TRANSACTION
            // Notarise and record the transaction in the party's vault.
            return subFlow(FinalityFlow(fullySignedTx, setOf(otherPartySession), FINALISING_TRANSACTION.childProgressTracker()))
        }
    }

    /**
     * This flow enables the [AcceptorOfTransfer] to respond to the asset transfer initiated by [TransferAssetStateInitiator]
     */
    @InitiatedBy(TransferAssetStateInitiator::class)
    class AcceptorOfTransfer(val otherPartySession: FlowSession) : FlowLogic<SignedTransaction>() {
        @Suspendable
        override fun call(): SignedTransaction {
            val signTransactionFlow = object : SignTransactionFlow(otherPartySession) {
                override fun checkTransaction(stx: SignedTransaction) = requireThat {
                    val outputState = stx.tx.outputs.single().data
                    "This must be an AssetState transaction." using (outputState is AssetState)
                    val assetState = outputState as AssetState
                    println("Transferred asset state in the ledger is: $assetState\n")
                    "I must be the owner of the asset after transfer." using (assetState.owner == serviceHub.myInfo.legalIdentities.first())
                }
            }
            val txId = subFlow(signTransactionFlow).id

            return subFlow(ReceiveFinalityFlow(otherPartySession, expectedTxId = txId))
        }
    }
}
