/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.flow

import co.paralleluniverse.fibers.Suspendable
import com.cordaSimpleApplication.state.AssetState
import com.cordaSimpleApplication.state.AssetStateJSON
import com.cordaSimpleApplication.contract.AssetContract
import javassist.NotFoundException
import net.corda.core.contracts.Command
import net.corda.core.contracts.ContractState
import net.corda.core.contracts.StateAndRef
import net.corda.core.identity.Party
import net.corda.core.contracts.StaticPointer
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.node.ServiceHub
import net.corda.core.flows.*
import net.corda.core.node.services.Vault
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.utilities.ProgressTracker
import net.corda.core.utilities.ProgressTracker.Step
import net.corda.core.contracts.requireThat
import sun.security.x509.UniqueIdentity
import java.util.*
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.weaver.corda.app.interop.flows.GetAssetClaimStatusState
import com.weaver.corda.app.interop.states.AssetPledgeState
import com.weaver.corda.app.interop.flows.GetAssetPledgeStatus
import com.weaver.corda.app.interop.flows.AssetPledgeStateToProtoBytes


/**
 * The IssueAssetState flow allows the party owning the fungible token assets perform actions on the assets.
 * @property numberOfTokens the number of fungible token assets to be part of the [AssetState] to be issued.
 * @property tokenType the type of the fungible token assets to be part of the [AssetState] to be issued.
 */
@InitiatingFlow
@StartableByRPC
class IssueAssetState(val numerOfTokens: Long, val tokenType: String) : FlowLogic<SignedTransaction>() {
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
        val assetState: AssetState = AssetState(numerOfTokens, tokenType, serviceHub.myInfo.legalIdentities.first())

        val commandData: AssetContract.Commands.Issue = AssetContract.Commands.Issue()
        val txCommand: Command<AssetContract.Commands.Issue> = Command(commandData, assetState.participants.map { it.owningKey })
        val txBuilder: TransactionBuilder = TransactionBuilder(notary)
                .addOutputState(assetState, AssetContract.ID)
                .addCommand(txCommand)

        // Stage 2.
        progressTracker.currentStep = VERIFYING_TRANSACTION
        // Verify that the transaction is valid.
        txBuilder.verify(serviceHub)

        // Stage 3.
        progressTracker.currentStep = SIGNING_TRANSACTION
        // Sign the transaction.
        val signedTx: SignedTransaction = serviceHub.signInitialTransaction(txBuilder)

        // Stage 4.
        progressTracker.currentStep = FINALISING_TRANSACTION
        val session = listOf<FlowSession>()
        // Notarise and record the transaction in both parties' vaults.
        return subFlow(FinalityFlow(signedTx, session, FINALISING_TRANSACTION.childProgressTracker()))
    }
}

/*
 * This flow only updates the owner field of the AssetState pointed by Static Pointer 
 * argument. This flow doesn't creates any transaction or updates the states in vault.
 * @property inputStatePointer [StaticPointer<AssetState>]
 */
@InitiatingFlow
@StartableByRPC
class UpdateAssetOwnerFromPointer(
    private val inputStatePointer: StaticPointer<AssetState>
) : FlowLogic<AssetState>() {
    /*
     * @Returns AssetState
     */
    override fun call(): AssetState {
        val inputState = inputStatePointer.resolve(serviceHub).state.data
        // return AssetState(inputState.quantity, inputState.tokenType, serviceHub.myInfo.legalIdentities.first())
        // below creates an asset state with the same linearId
        return inputState.copy(owner=ourIdentity)
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
 * The GetAssetStateByLinearId flow is used to retrieve a [AssetState] from the vault based on its linearId.
 *
 * @property linearId the linearId for the [AssetState] to be retrieved.
 */
@StartableByRPC
class GetAssetStateByLinearId(val linearId: String) : FlowLogic<String>() {
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
        val notary: Party = serviceHub.networkMapCache.notaryIdentities.single()

        // Stage 1.
        progressTracker.currentStep = GENERATING_TRANSACTION
        // Generate an unsigned transaction.

        val uuid: UniqueIdentifier = UniqueIdentifier.Companion.fromString(linearId)
        val criteria: QueryCriteria.LinearStateQueryCriteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
            Vault.StateStatus.UNCONSUMED, null)
        val assetStates: List<StateAndRef<AssetState>> = serviceHub.vaultService.queryBy<AssetState>(criteria).states
        val pointedToState: StateAndRef<AssetState> = assetStates.first()
        println("Retrieved asset state with linearId $linearId: $pointedToState\n")

        val stateStaticPointer: StaticPointer<AssetState> = StaticPointer(pointedToState.ref, pointedToState.state.data.javaClass)
        //val pointedToStateCopy = stateStaticPointer.resolve(serviceHub).state.data
        //val assetState = AssetState(pointedToStateCopy.quantity, pointedToStateCopy.tokenType, serviceHub.myInfo.legalIdentities.first())

        val assetState: AssetState = subFlow(UpdateAssetOwnerFromPointer(stateStaticPointer))

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
 * @property quantity the number of fungible token assets to be part of the [AssetState] to be retrieved.
 */
@InitiatingFlow
@StartableByRPC
class RetrieveStateAndRef(private val tokenType: String, private val quantity: Long) : FlowLogic<StateAndRef<AssetState>?>() {

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
class SplitAssetState(val linearId: String, val quantity1: Long, val quantity2: Long) : FlowLogic<SignedTransaction>() {
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

/**
 * The getAssetJsonStringFromStatePointer function fetches the asset state from its state pointer [AssetPledgeState].assetStatePointer
 * and creates marshalled JSON encoded object which is returned.
 * This function is called by the exporting network in the context of interop-query from the importing network
 * to the exporting network before performing claim on remote asset.
 *
 * @property assetPledgeState The (interop) vault state that represents the pledge details on the ledger.
 */
fun getAssetJsonStringFromStatePointer(assetPledgeState: AssetPledgeState, serviceHub: ServiceHub) : String {

    if (assetPledgeState.assetStatePointer == null) {
        // Typically, [AssetPledgeState].assetStatePointer will be null only in the case of pledge details not
        // being available for a given pledgeId. The flow GetAssetPledgeStatus in AssetTransferFlows sets this
        // pointer to null if the pledge-state is not available in the context of the interop-query from the
        // importing n/w to the exporting n/w. Hence return empty string, and this will not be passed to the
        // JSON unmarshalling method GetSimpleAssetStateAndContractId since the expiryTime will be elapsed for the
        // claim to happen (i.e., if assetStatePointer is null, then expiryTimeSecs will be set to past time).
        return ""
    }

    val assetStatePointer: StaticPointer<ContractState> = assetPledgeState.assetStatePointer!!
    val assetState = assetStatePointer.resolve(serviceHub).state.data as AssetState

    println("Creating simple asset JSON from StatePointer.")
    var marshalledAssetJson =
        marshalFungibleAsset(assetState.tokenType, assetState.quantity, assetPledgeState.lockerCert)

    return marshalledAssetJson
}

/**
 * The GetAssetPledgeStatusByPledgeId flow fetches the fungible asset pledge status in the exporting network and returns as byte array.
 * It is called during the interop query by importing network before performing the claim on fungible asset pledged in exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property recipientNetworkId The id of the network in which the pledged asset will be claimed.
 */
@InitiatingFlow
@StartableByRPC
class GetAssetPledgeStatusByPledgeId(
    val pledgeId: String,
    val recipientNetworkId: String
) : FlowLogic<ByteArray>() {
    @Suspendable
    override fun call(): ByteArray {

        var assetPledgeState: AssetPledgeState = subFlow(GetAssetPledgeStatus(pledgeId, recipientNetworkId))
        println("Obtained [AssetPledgeState] vault state: ${assetPledgeState}.\n")
        val marshalledAssetJson = getAssetJsonStringFromStatePointer(assetPledgeState, serviceHub)

        return subFlow(AssetPledgeStateToProtoBytes(assetPledgeState, marshalledAssetJson))
    }
}

/**
 * The GetAssetClaimStatusByPledgeId flow fetches the asset claim status in the importing network and returns as byte array.
 * It is called during the interop query by exporting network before performing the re-claim on asset pledged in exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property expiryTimeSecs The time epoch seconds after which re-claim of the asset is allowed.
 */
@InitiatingFlow
@StartableByRPC
class GetAssetClaimStatusByPledgeId(
    val pledgeId: String,
    val expiryTimeSecs: String
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to fetch [AssetClaimStatusState] vault state from importing n/w.
     *
     * @return Returns ByteArray.
     */
    @Suspendable
    override fun call(): ByteArray {

        println("Inside GetAssetClaimStatusByPledgeId(), pledgeId: $pledgeId and expiryTimeSecs: $expiryTimeSecs.")

        println("Creating empty simple asset JSON.")
        var marshalledBlankAssetJson = marshalFungibleAsset("dummy-simple-asset", 0L, "dummy-owner-cert")

        return subFlow(GetAssetClaimStatusState(pledgeId, expiryTimeSecs, marshalledBlankAssetJson))
    }
}

/**
 * The GetSimpleAssetStateAndContractId flow first checks if the JSON encoded object corresponds to the specified simple asset attribute values.
 * It first unmarshalls the passed JSON encoded object and verifies if the attribte values match with the input values. Then, it creates
 * the asset state object corresponding to the JSON object passed as input.
 *
 * Note: This function is passed as an argument to resolveGetAssetStateAndContractIdFlow() during reclaim-pledged asset transaction.
 * This function has five arguements. A similar function is implemented for FungibleHouseToken and SimpleBondAsset with
 * the "same number and type" of arguements. Based on the function name passed, <ContractId, State> will be fetched at runtime.
 *
 * @property marshalledAsset The JSON encoded fungible simple asset.
 * @property type The fungible simple asset type.
 * @property quantity The number of units of the fungible simple asset, passed as String.
 * @property lockerCert The owner (certificate in base64 of the exporting network) of the fungible asset before asset-transfer.
 * @property holder The party that owns the fungible simple asset after asset-transfer.
 */
@InitiatingFlow
@StartableByRPC
class GetSimpleAssetStateAndContractId(
    val marshalledAsset: String,
    val type: String,
    val quantity: Long,
    val lockerCert: String,
    val holder: Party
): FlowLogic<Pair<String, AssetState>>() {
    @Suspendable
    override fun call(): Pair<String, AssetState> {

        println("Inside GetSimpleAssetStateAndContractId().")

        // must have used GsonBuilder().create().toJson() at the time of serialization of the JSON
        val pledgedFungibleAsset = Gson().fromJson(marshalledAsset, AssetStateJSON::class.java)
        println("Unmarshalled fungible simple asset is: $pledgedFungibleAsset")

        if (pledgedFungibleAsset.tokenType != type) {
            println("pledgedFungibleAsset.tokenType(${pledgedFungibleAsset.tokenType}) need to match with type(${type}).")
            throw Exception("pledgedFungibleAsset.tokenType(${pledgedFungibleAsset.tokenType}) need to match with type(${type}).")
        } else if (pledgedFungibleAsset.quantity != quantity) {
            println("pledgedFungibleAsset.numUnits(${pledgedFungibleAsset.quantity}) need to match with quantity(${quantity}).")
            throw Exception("pledgedFungibleAsset.numUnits(${pledgedFungibleAsset.quantity}) need to match with quantity(${quantity}).")
        } else if (pledgedFungibleAsset.ownerCert != lockerCert) {
            println("pledgedFungibleAsset.ownerCert(${pledgedFungibleAsset.ownerCert}) need to match with lockerCert(${lockerCert}).")
            throw Exception("pledgedFungibleAsset.ownerCert(${pledgedFungibleAsset.ownerCert}) need to match with lockerCert(${lockerCert}).")
        }

        val simpleasset = AssetState(
            pledgedFungibleAsset.quantity, // @property quantity
            pledgedFungibleAsset.tokenType, // @property tokenType
            holder // @property owner
        )

        return Pair(AssetContract.ID, simpleasset)
    }
}

/**
 * The marshalFungibleAsset function is used to obtain the JSON encoding of the fungible asset of interest to the user.
 * This function is typically called by the application client which may not know the full details of the asset.
 *
 * @property type type The fungible asset type.
 * @property quantity The number of units of the fungible asset.
 * @property onwerCert The certificate of the owner of asset in base64 form
 */
fun marshalFungibleAsset(type: String, quantity: Long, ownerCert: String) : String {

    val assetJson = AssetStateJSON(
        tokenType = type,
        quantity = quantity,
        ownerCert = ownerCert
    )

    println("Inside marshalFungibleAsset(), created fungible asset: $assetJson\n.")
    val gson = GsonBuilder().create();
    // must use Gson().fromJson() at the time of deserialization of the JSON
    var marshalledAssetJson = gson.toJson(assetJson, AssetStateJSON::class.java)

    return marshalledAssetJson
}

