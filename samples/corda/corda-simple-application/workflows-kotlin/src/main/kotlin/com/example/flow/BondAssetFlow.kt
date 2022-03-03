/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.flow

import co.paralleluniverse.fibers.Suspendable
import com.cordaSimpleApplication.state.BondAssetState
import com.cordaSimpleApplication.state.BondAssetStateJSON
import com.cordaSimpleApplication.contract.BondAssetContract
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
 * The IssueBondAssetState flow allows the party owning the bond/non-fungible assets perform actions on the assets.
 * @property assetId the identifier of non-fungible asset to be part of the [BondAssetState] to be issued.
 * @property assetType the type of the non-fungible asset to be part of the [BondAssetState] to be issued.
 */
@InitiatingFlow
@StartableByRPC
class IssueBondAssetState(val assetId: String, val assetType: String) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new bond/non-fungible asset state.")
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
        val assetState: BondAssetState = BondAssetState(assetType, assetId, serviceHub.myInfo.legalIdentities.first())

        val commandData: BondAssetContract.Commands.Issue = BondAssetContract.Commands.Issue()
        val txCommand: Command<BondAssetContract.Commands.Issue> = Command(commandData, assetState.participants.map { it.owningKey })
        val txBuilder: TransactionBuilder = TransactionBuilder(notary)
                .addOutputState(assetState, BondAssetContract.ID)
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
 * This flow only updates the owner field of the [BondAssetState] pointed by Static Pointer 
 * argument. This flow doesn't creates any transaction or updates the states in vault.
 * @property inputStatePointer [StaticPointer<BondAssetState>]
 */
@InitiatingFlow
@StartableByRPC
class UpdateBondAssetOwnerFromPointer(
    private val inputStatePointer: StaticPointer<BondAssetState>
) : FlowLogic<BondAssetState>() {
    /*
     * @Returns [BondAssetState]
     */
    override fun call(): BondAssetState {
        val inputState = inputStatePointer.resolve(serviceHub).state.data
        // below creates an asset state with the same linearId
        // return BondAssetState(inputState.id, inputState.type, serviceHub.myInfo.legalIdentities.first())
        return inputState.copy(owner=ourIdentity)
    }
}

/**
 * The DeleteBondAssetState flow is used to delete an existing [BondAssetState].
 *
 * @property linearId the filter for the [BondAssetState] to be deleted.
 */
@InitiatingFlow
@StartableByRPC
class DeleteBondAssetState(val linearId: String) : FlowLogic<SignedTransaction>() {
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
     * The call() method captures the logic to build and sign a transaction that deletes an [BondAssetState].
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
        val assetStatesWithLinearId = serviceHub.vaultService.queryBy<BondAssetState>(criteria).states

        if (assetStatesWithLinearId.isEmpty()) {
            throw NotFoundException("BondssetState with linearId $linearId not found")
        }
        val inputState = assetStatesWithLinearId.first()
        println("Deleting bond asset state from the ledger: $inputState\n")
        val txCommand = Command(BondAssetContract.Commands.Delete(), listOf(inputState.state.data.owner.owningKey))
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
 * The GetStatesByBondAssetType flow is used to retrieve list of [BondAssetState]s from the vault based on the assetType.
 *
 * @property assetType the filter for the [BondAssetState] list to be retrieved.
 */
@StartableByRPC
class GetStatesByBondAssetType(val assetType: String) : FlowLogic<ByteArray>() {
    @Suspendable

    /**
     * The call() method captures the logic to find one or more [BondAssetState]s in the vault based on the assetType.
     *
     * @return returns list of [BondAssetState]s.
     */
    override fun call(): ByteArray {
        val states = serviceHub.vaultService.queryBy<BondAssetState>().states
            .filter { it.state.data.type == assetType }
            .map { it.state.data }
        println("Retrieved states with assetType $assetType: $states\n")
        return states.toString().toByteArray()
    }
}

/**
 * The GetBondAssetStateByLinearId flow is used to retrieve a [BondAssetState] from the vault based on its linearId.
 *
 * @property linearId the linearId for the [BondAssetState] to be retrieved.
 */
@StartableByRPC
class GetBondAssetStateByLinearId(val linearId: String) : FlowLogic<String>() {
    @Suspendable

    /**
     * The call() method captures the logic to find a [BondAssetState] in the vault based on its linearId.
     *
     * @return returns the [BondAssetState].
     */
    override fun call(): String {
        val uuid = UniqueIdentifier.Companion.fromString(linearId)
        val criteria = QueryCriteria.LinearStateQueryCriteria(null, Arrays.asList(uuid),
            Vault.StateStatus.UNCONSUMED, null)
        val assetStates = serviceHub.vaultService.queryBy<BondAssetState>(criteria).states
            .map { it.state.data }
        val assetState = assetStates.first()
        println("Retrieved asset state with linearId $linearId: $assetState\n")
        return assetState.toString()
    }
}

@StartableByRPC
class IssueBondAssetStateFromStateRef(val linearId: String) : FlowLogic<SignedTransaction>() {
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
        val assetStates: List<StateAndRef<BondAssetState>> = serviceHub.vaultService.queryBy<BondAssetState>(criteria).states
        val pointedToState: StateAndRef<BondAssetState> = assetStates.first()
        println("Retrieved bond asset state with linearId $linearId: $pointedToState\n")

        val stateStaticPointer: StaticPointer<BondAssetState> = StaticPointer(pointedToState.ref, pointedToState.state.data.javaClass)
        //val pointedToStateCopy = stateStaticPointer.resolve(serviceHub).state.data
        //val assetState = BondAssetState(pointedToStateCopy.id, pointedToStateCopy.type, serviceHub.myInfo.legalIdentities.first())

        val assetState: BondAssetState = subFlow(UpdateBondAssetOwnerFromPointer(stateStaticPointer))

        val txCommand = Command(BondAssetContract.Commands.Issue(), assetState.participants.map { it.owningKey })
        val txBuilder = TransactionBuilder(notary)
            .addOutputState(assetState, BondAssetContract.ID)
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
 * The RetrieveBondAssetStateAndRef flow is used to retrieve an [BondAssetState] from the vault based on the assetType and assetId.
 *
 * @property assetType the filter for the [BondAssetState] list to be retrieved.
 * @property assetId the identifier of non-fungible asset to be part of the [BondAssetState] to be retrieved.
 */
@InitiatingFlow
@StartableByRPC
class RetrieveBondAssetStateAndRef(private val assetType: String, private val assetId: String) : FlowLogic<StateAndRef<BondAssetState>?>() {

    override fun call(): StateAndRef<BondAssetState>? {

        val states = serviceHub.vaultService.queryBy<BondAssetState>().states
            .filter { it.state.data.type == assetType }
            .filter { it.state.data.id == assetId }

        var fetchedState: StateAndRef<BondAssetState>? = null

        if (states.isNotEmpty()) {
            fetchedState = states.first()
            println("Retrieved state with assetType $assetType: $fetchedState\n")
        } else {
            println("No state found with assetType $assetType\n")
        }

        return fetchedState
    }
}

@InitiatingFlow
@StartableByRPC
class TransferBondAssetStateInitiator(val linearId: String, val otherParty: Party) : FlowLogic<SignedTransaction>() {
    /**
     * The progress tracker checkpoints each stage of the flow and outputs the specified messages when each
     * checkpoint is reached in the code. See the 'progressTracker.currentStep' expressions within the call() function.
     */
    companion object {
        object GENERATING_TRANSACTION : Step("Generating transaction based on new bond/non-fungible asset state.")
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
        val assetStatesWithLinearId = serviceHub.vaultService.queryBy<BondAssetState>(criteria).states
        if (assetStatesWithLinearId.isEmpty()) {
            throw NotFoundException("BondAssetState with linearId $linearId not found")
        }
        val inputState = assetStatesWithLinearId.first()

        println("The bond asset that will be transferred is: $inputState.state.data\n")

        val outputState = inputState.state.data.copy(owner = otherParty)
        println("Updated bond asset state in the ledger is: $outputState\n")

        val signers = listOf(inputState.state.data.owner.owningKey, outputState.owner.owningKey)
        val txCommand = Command(BondAssetContract.Commands.Transfer(), signers)
        val txBuilder = TransactionBuilder(notary)
            .addInputState(inputState)
            .addOutputState(outputState, BondAssetContract.ID)
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
 * This flow enables the [AcceptorOfBondTransfer] to respond to the asset transfer initiated by [TransferAssetStateInitiator]
 */
@InitiatedBy(TransferBondAssetStateInitiator::class)
class AcceptorOfBondTransfer(val otherPartySession: FlowSession) : FlowLogic<SignedTransaction>() {
    @Suspendable
    override fun call(): SignedTransaction {
        val signTransactionFlow = object : SignTransactionFlow(otherPartySession) {
            override fun checkTransaction(stx: SignedTransaction) = requireThat {
                val outputState = stx.tx.outputs.single().data
                "This must be an BondAssetState transaction." using (outputState is BondAssetState)
                val assetState = outputState as BondAssetState
                println("Bond asset state in the ledger that is to be transferred is: $assetState\n")
                "I must be the owner of the bond asset after transfer." using (assetState.owner == serviceHub.myInfo.legalIdentities.first())
            }
        }
        val txId = subFlow(signTransactionFlow).id

        return subFlow(ReceiveFinalityFlow(otherPartySession, expectedTxId = txId))
    }
}

/**
 * The getBondAssetJsonStringFromStatePointer function fetches the bond asset state from its state pointer [AssetPledgeState].assetStatePointer
 * and creates marshalled JSON encoded object which is returned.
 * This function is called by the exporting network in the context of interop-query from the importing network
 * to the exporting network before performing claim on remote bond asset.
 *
 * @property assetPledgeState The (interop) vault state that represents the pledge details on the ledger.
 */
fun getBondAssetJsonStringFromStatePointer(assetPledgeState: AssetPledgeState, serviceHub: ServiceHub) : String {

    if (assetPledgeState.assetStatePointer == null) {
        // Typically, [AssetPledgeState].assetStatePointer will be null only in the case of pledge details not
        // being available for a given pledgeId. The flow GetAssetPledgeStatus in AssetTransferFlows sets this
        // pointer to null if the pledge-state is not available in the context of the interop-query from the
        // importing n/w to the exporting n/w. Hence return empty string, and this will not be passed to the
        // JSON unmarshalling method GetSimpleBondAssetStateAndContractId since the expiryTime will be elapsed for the
        // claim to happen (i.e., if assetStatePointer is null, then expiryTimeSecs will be set to past time).
        return ""
    }

    val assetStatePointer: StaticPointer<ContractState> = assetPledgeState.assetStatePointer!!
    val assetState: BondAssetState = assetStatePointer.resolve(serviceHub).state.data as BondAssetState

    println("Creating simple bond asset JSON from StatePointer.")
    var marshalledAssetJson =
        marshalBondAsset(assetState.type, assetState.id, assetPledgeState.lockerCert)

    return marshalledAssetJson
}

/**
 * The GetBondAssetPledgeStatusByPledgeId flow fetches the non-fungible asset pledge status in the exporting network and returns as byte array.
 * It is called during the interop query by importing network before performing the claim on non-fungible asset pledged in exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on a bond asset for transfer, in the exporting n/w.
 * @property recipientNetworkId The id of the network in which the pledged bond asset will be claimed.
 */
@InitiatingFlow
@StartableByRPC
class GetBondAssetPledgeStatusByPledgeId(
    val pledgeId: String,
    val recipientNetworkId: String
) : FlowLogic<ByteArray>() {
    @Suspendable
    override fun call(): ByteArray {

        var assetPledgeState: AssetPledgeState = subFlow(GetAssetPledgeStatus(pledgeId, recipientNetworkId))
        println("Obtained [AssetPledgeState] vault state: ${assetPledgeState}.\n")
        val marshalledAssetJson = getBondAssetJsonStringFromStatePointer(assetPledgeState, serviceHub)

        return subFlow(AssetPledgeStateToProtoBytes(assetPledgeState, marshalledAssetJson))
    }
}

/**
 * The GetBondAssetClaimStatusByPledgeId flow fetches the bond asset claim status in the importing network and returns as byte array.
 * It is called during the interop query by exporting network before performing the re-claim on bond asset pledged in exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on a bond asset for transfer, in the exporting n/w.
 * @property expiryTimeSecs The time epoch seconds after which re-claim of the bond asset is allowed.
 */
@InitiatingFlow
@StartableByRPC
class GetBondAssetClaimStatusByPledgeId(
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

        println("Inside GetBondAssetClaimStatusByPledgeId(), pledgeId: $pledgeId and expiryTimeSecs: $expiryTimeSecs.")

        println("Creating empty simple asset JSON.")
        var marshalledBlankAssetJson = marshalBondAsset("dummy-simple-asset", "dummy-id", "dummy-owner-cert")

        return subFlow(GetAssetClaimStatusState(pledgeId, expiryTimeSecs, marshalledBlankAssetJson))
    }
}

/**
 * The GetSimpleBondAssetStateAndContractId flow first checks if the JSON encoded object corresponds to the specified simple bond asset attribute values.
 * It first unmarshalls the passed JSON encoded object and verifies if the attribte values match with the input values. Then, it creates
 * the asset state object corresponding to the JSON object passed as input.
 *
 * Note: This function is passed as an argument to resolveGetAssetStateAndContractIdFlow() during reclaim-pledged asset transaction.
 * This function has five arguements. A similar function is implemented for FungibleHouseToken and SimpleAsset with
 * the "same number and type" of arguements. Based on the function name passed, <ContractId, State> will be fetched at runtime.
 *
 * @property marshalledAsset The JSON encoded non-fungible simple asset.
 * @property type The non-fungible simple asset type.
 * @property assetId The identifier of the non-fungible simple asset, passed as String.
 * @property lockerCert The owner (certificate in base64 of the exporting network) of the non-fungible asset before asset-transfer.
 * @property holder The party that owns the non-fungible simple asset after asset-transfer.
 */
@InitiatingFlow
@StartableByRPC
class GetSimpleBondAssetStateAndContractId(
    val marshalledAsset: String,
    val type: String,
    val assetId: String,
    val lockerCert: String,
    val holder: Party
): FlowLogic<Pair<String, BondAssetState>>() {
    @Suspendable
    override fun call(): Pair<String, BondAssetState> {

        println("Inside GetSimpleBondAssetStateAndContractId().")

        // must have used GsonBuilder().create().toJson() at the time of serialization of the JSON
        val pledgedBondAsset = Gson().fromJson(marshalledAsset, BondAssetStateJSON::class.java)
        println("Unmarshalled non-fungible simple asset is: $pledgedBondAsset")

        if (pledgedBondAsset.type != type) {
            println("pledgedBondAsset.type(${pledgedBondAsset.type}) need to match with type(${type}).")
            throw Exception("pledgedBondAsset.type(${pledgedBondAsset.type}) need to match with type(${type}).")
        } else if (pledgedBondAsset.id != assetId) {
            println("pledgedBondAsset.id(${pledgedBondAsset.id}) need to match with assetId($assetId).")
            throw Exception("pledgedBondAsset.id(${pledgedBondAsset.id}) need to match with assetId(${assetId}).")
        } else if (pledgedBondAsset.ownerCert != lockerCert) {
            println("pledgedBondAsset.ownerCert(${pledgedBondAsset.ownerCert}) need to match with lockerCert(${lockerCert}).")
            throw Exception("pledgedBondAsset.ownerCert(${pledgedBondAsset.ownerCert}) need to match with lockerCert(${lockerCert}).")
        }

        val simpleasset = BondAssetState(
            pledgedBondAsset.type, // @property type
            pledgedBondAsset.id, // @property id
            holder // @property owner
        )

        return Pair(BondAssetContract.ID, simpleasset)
    }
}

/**
 * The marshalFungibleAsset function is used to obtain the JSON encoding of the fungible asset of interest to the user.
 * This function is typically called by the application client which may not know the full details of the asset.
 *
 * @property type type The non-fungible asset type.
 * @property id The identifier of the non-fungible asset.
 * @property onwerCert The certificate of the owner of bond asset in base64 form
 */
fun marshalBondAsset(type: String, id: String, ownerCert: String) : String {

    val assetJson = BondAssetStateJSON(
        type = type,
        id = id,
        ownerCert = ownerCert
    )

    println("Inside marshalBondAsset(), created non-fungible asset: $assetJson\n.")
    val gson = GsonBuilder().create();
    // must use Gson().fromJson() at the time of deserialization of the JSON
    var marshalledAssetJson = gson.toJson(assetJson, BondAssetStateJSON::class.java)

    return marshalledAssetJson
}