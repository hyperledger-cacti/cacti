/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.*
import co.paralleluniverse.fibers.Suspendable
import com.weaver.corda.app.interop.contracts.AssetTransferContract
import com.weaver.corda.app.interop.states.AssetPledgeState
import com.weaver.corda.app.interop.states.AssetClaimStatusState
import com.weaver.corda.app.interop.states.NetworkIdState
import com.weaver.protos.common.asset_transfer.AssetTransfer
import com.weaver.protos.corda.ViewDataOuterClass
import com.google.protobuf.ByteString

import net.corda.core.contracts.ContractState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.TimeWindow
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.ReferencedStateAndRef
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StaticPointer

import net.corda.core.identity.Party

import net.corda.core.flows.*
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.node.ServiceHub
import net.corda.core.node.StatesToRecord
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.transactions.SignedTransaction
import net.corda.core.transactions.LedgerTransaction
import net.corda.core.utilities.OpaqueBytes
import net.corda.core.utilities.unwrap
import net.corda.core.serialization.CordaSerializable
import java.time.Instant
import java.util.Base64
import java.util.Calendar

/**
 * Enum for communicating the role of the responder from initiator flow to responder flow.
 */
@CordaSerializable
enum class AssetTransferResponderRole {
    PLEDGER, ISSUER, OBSERVER
}

/**
 * The PledgeAsset flow is used to create a pledge on an asset ready for transfer to remote network.
 *
 * @property expiryTimeSecs The future time in epoch seconds before which the asset claim in the remote/importing network is to be performed.
 * @property assetStateRef The state pointer to the asset in the vault that is being pledged for remote network transfer.
 * @property assetStateDeleteCommand The name of the contract command used to delete the pledged asset in the exporting network.
 * @property recipientCert Certificate of the asset recipient (in base64 format) in the importing network.
 * @property localNetworkId The id of the network in which the pledge is made.
 * @property remoteNetworkId The id of the network in which the pledged asset will be claimed.
 * @property issuer The issuing authority of the pledged fungible asset, if applicable (e.g., fungible house token).
 *                      Otherwise this will be same as the party submitting the transaction.
 * @property observers The parties who are not transaction participants but only observers (can be empty list).
 */
object PledgeAsset {
    @InitiatingFlow
    @StartableByRPC
    class Initiator
    @JvmOverloads
    constructor(
        val expiryTimeSecs: Long,
        val assetStateRef: StateAndRef<ContractState>,
        val assetStateDeleteCommand: CommandData,
        val recipientCert: String,
        val localNetworkId: String,
        val remoteNetworkId: String,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
    ) : FlowLogic<Either<Error, UniqueIdentifier>>() {
        /**
         * The call() method captures the logic to create a new [AssetPledgeState] state in the vault,
         * by consuming an asset which is redeemed from the network.
         *
         * It first creates a new [AssetPledgeState] state. It then builds and verifies the transaction,
         * collects the required signatures, and stores the state in the vault.
         *
         * @return Returns the linearId of the newly created [AssetPledgeState].
         */
        @Suspendable
        override fun call(): Either<Error, UniqueIdentifier> = try {

            val lockerCert: String
            lockerCert = Base64.getEncoder().encodeToString(x509CertToPem(ourIdentityAndCert.certificate).toByteArray())
            // 1. Create the asset pledge state
            val assetPledgeState = AssetPledgeState(
                StaticPointer(assetStateRef.ref, assetStateRef.state.data.javaClass), // @property assetStatePointer
                ourIdentity, // @property locker
                lockerCert,
                recipientCert,
                expiryTimeSecs,
                localNetworkId,
                remoteNetworkId
            )
            println("Creating asset pledge state: ${assetPledgeState}")

            // 2. Build the transaction
            val notary = assetStateRef.state.notary
            val pledgeCmd = Command(AssetTransferContract.Commands.Pledge(),
                listOf(
                    assetPledgeState.locker.owningKey
                )
            )
            val assetDeleteCmd = Command(assetStateDeleteCommand,
                setOf(
                    assetPledgeState.locker.owningKey,
                    issuer.owningKey
                ).toList()
            )

            val networkIdStateRef = subFlow(RetrieveNetworkIdStateAndRef())

            val txBuilder = TransactionBuilder(notary)
                .addInputState(assetStateRef)
                .addOutputState(assetPledgeState, AssetTransferContract.ID)
                .addCommand(pledgeCmd).apply {
                    networkIdStateRef!!.let {
                        this.addReferenceState(ReferencedStateAndRef(networkIdStateRef))
                    }
                }
                .addCommand(assetDeleteCmd)

            // 3. Verify and collect signatures on the transaction
            txBuilder.verify(serviceHub)
            val partSignedTx = serviceHub.signInitialTransaction(txBuilder)
            println("Locker signed transaction.")

            var sessions = listOf<FlowSession>()

            // Add issuer session if locker (i.e. me) is not issuer
            if (!ourIdentity.equals(issuer)) {
                val issuerSession = initiateFlow(issuer)
                issuerSession.send(AssetTransferResponderRole.ISSUER)
                sessions += issuerSession
            }
            val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions))

            var observerSessions = listOf<FlowSession>()
            for (obs in observers) {
                val obsSession = initiateFlow(obs)
                obsSession.send(AssetTransferResponderRole.OBSERVER)
                observerSessions += obsSession
            }
            val storedAssetPledgeState = subFlow(FinalityFlow(
                fullySignedTx,
                sessions + observerSessions)).tx.outputStates.first() as AssetPledgeState

            // 4. Return the linearId of the state
            println("Successfully stored: $storedAssetPledgeState\n")
            Right(storedAssetPledgeState.linearId)
        } catch (e: Exception) {
            println("Error pledging asset: ${e.message}\n")
            Left(Error("Failed to pledge asset: ${e.message}"))
        }
    }

    @InitiatedBy(Initiator::class)
    class Acceptor(val session: FlowSession) : FlowLogic<SignedTransaction>() {
        @Suspendable
        override fun call(): SignedTransaction {
            val role = session.receive<AssetTransferResponderRole>().unwrap { it }
            if (role == AssetTransferResponderRole.ISSUER) {
                val signTransactionFlow = object : SignTransactionFlow(session) {
                    override fun checkTransaction(stx: SignedTransaction) = requireThat {
                    }
                }
                try {
                    val txId = subFlow(signTransactionFlow).id
                    println("Issuer signed transaction.")
                    return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
                } catch (e: Exception) {
                    println("Error signing unlock asset transaction by Issuer: ${e.message}\n")
                    return subFlow(ReceiveFinalityFlow(session))
                }
            } else if (role == AssetTransferResponderRole.OBSERVER) {
                val sTx = subFlow(ReceiveFinalityFlow(session, statesToRecord = StatesToRecord.ALL_VISIBLE))
                println("Received Tx: ${sTx}")
                return sTx
            } else {
                println("Incorrect Responder Role.")
                throw IllegalStateException("Incorrect Responder Role.")
            }
        }
    }

}

/**
 * The IsAssetPledged flow is used to check if an asset is pledged or not.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 */
@StartableByRPC
class IsAssetPledged(
    val pledgeId: String
) : FlowLogic<Boolean>() {
    /**
     * The call() method captures the logic to fetch [AssetPledgeState] associated with input pledgeId.
     *
     * @return Returns boolean value, true or false.
     */
    @Suspendable
    override fun call(): Boolean {
        val linearId = getLinearIdFromString(pledgeId)
        println("Getting [AssetPledgeState] for linearId: $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetPledgeState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {
            println("No [AssetPledgeState] state found associated with pledgeId: $pledgeId.")
            return false
        } else {
            val pledgedState = states.first().state.data
            println("Obtained [AssetPledgeState] state: $pledgedState.")
            if (Instant.now().isAfter(Instant.ofEpochSecond(pledgedState.expiryTimeSecs))) {
                return false
            }
            return true
        }
    }
}

/**
 * The GetAssetPledgeStateById flow is used to fetch the asset pledge details (from export n/w).
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 */
@StartableByRPC
class GetAssetPledgeStateById(
    val pledgeId: String
) : FlowLogic<StateAndRef<AssetPledgeState>?>() {
    /**
     * The call() method captures the logic to fetch the [AssetPledgeState] state associated with input pledgeId.
     *
     * @return Returns Either<Error, StateAndRef<AssetPledgeState>>
     */
    @Suspendable
    override fun call(): StateAndRef<AssetPledgeState>? {
        val linearId = getLinearIdFromString(pledgeId)
        println("Getting [AssetPledgeState] for linearId: $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetPledgeState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {
            println("No [AssetPledgeState] state found associated with pledgeId: $pledgeId.")
            return null
        } else {
            println("Obtained [AssetPledgeState] state: ${states.first().state.data}.")
            return states.first()
        }
    }
}

/**
 * The GetAssetClaimStatusState flow is used to fetch asset claim details (from import n/w).
 * This is used in the context of the interop-query from exporting n/w to importing n/w.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property expiryTimeSecsString The pledge expiry time epoch secs (provided as String instead of Long), before which the claim can be performed
 * @property blankAssetJSON The marshalled (in JSON encoding format) object representing an empty/dummy asset
 */
@StartableByRPC
class GetAssetClaimStatusState(
    val pledgeId: String,
    val expiryTimeSecsString: String,
    val blankAssetJSON: String
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to fetch the [AssetClaimStatusState] associate with the input pledgeId.
     * If such a state is not found for the pledgeId, then a dummy [AssetClaimStatusState] state is returned.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        val expiryTimeSecs = expiryTimeSecsString.toLong()
        println("Getting [AssetClaimStatusState] for pledgeId: $pledgeId.")
        val existingAssetClaimStatusState = subFlow(IsRemoteAssetClaimedEarlier(pledgeId))
        if (existingAssetClaimStatusState == null) {

            val networkIdStateRef = subFlow(RetrieveNetworkIdStateAndRef())
            val fetchedNetworkIdState = networkIdStateRef!!.state.data

            var nTimeout: Long
            val expirationStatus: Boolean
            val calendar: Calendar = Calendar.getInstance()
            nTimeout = calendar.timeInMillis / 1000
            if (nTimeout <= expiryTimeSecs) {
                expirationStatus = false
            } else {
                expirationStatus = true
            }

            val assetClaimStatusState = AssetClaimStatusState(
                pledgeId,
                blankAssetJSON, // @property assetDetails
                fetchedNetworkIdState.networkId, // @property localNetworkId
                "", // @property remoteNetworkId
                ourIdentity, // @property recipient
                "", // @property recipientCert
                false, // @property claimStatus
                expiryTimeSecs,
                expirationStatus
            )
            println("Creating a dummy [AssetClaimStatusState] state: $assetClaimStatusState")
            return subFlow(AssetClaimStatusStateToProtoBytes(assetClaimStatusState))
        } else {
            println("Obtained [AssetClaimStatusState] state: $existingAssetClaimStatusState")
            return subFlow(AssetClaimStatusStateToProtoBytes(existingAssetClaimStatusState))
        }
    }
}

/**
 * The AssetClaimStatusStateToProtoBytes flow is used to convert the input state to protobuf bytes.
 *
 * @property assetClaimStatusState The [AssetClaimStatusState] state fetched from the vault.
 */
@StartableByRPC
class AssetClaimStatusStateToProtoBytes(
    val assetClaimStatusState: AssetClaimStatusState
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to serialize the [AssetClaimStatusState] ledger state data.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        println("Going to serialize the [AssetClaimStatusState] state to ByteArray.")
        val claimStatus = AssetTransfer.AssetClaimStatus.newBuilder()
            // use toStringUtf8() at the time of deserialization of the protobuf @property assetDetails
            .setAssetDetails(ByteString.copyFromUtf8(assetClaimStatusState.assetDetails))
            .setLocalNetworkID(assetClaimStatusState.localNetworkID)
            .setRemoteNetworkID(assetClaimStatusState.remoteNetworkID)
            .setRecipient(assetClaimStatusState.recipientCert)
            .setClaimStatus(assetClaimStatusState.claimStatus)
            .setExpiryTimeSecs(assetClaimStatusState.expiryTimeSecs)
            .setExpirationStatus(assetClaimStatusState.expirationStatus)
            .build()
        return Base64.getEncoder().encodeToString(claimStatus.toByteArray()).toByteArray()
    }
}

/**
 * The GetAssetPledgeStatus flow is used to fetch asset pledge details (from export n/w).
 * This is used in the context of the interop-query from importing n/w to exporting n/w.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property recipientNetworkId The network id of the importing network
 */
@StartableByRPC
class GetAssetPledgeStatus(
    val pledgeId: String,
    val recipientNetworkId: String
) : FlowLogic<AssetPledgeState>() {
    /**
     * The call() method captures the logic to fetch the [AssetPledgeState] associated with the input pledgeId.
     * If such a state is not found for the pledgeId, then a dummry [AssetPledgeState] state is returned.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): AssetPledgeState {
        val linearId = getLinearIdFromString(pledgeId)

        println("Getting [AssetPledgeState] state for pledgeId: $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetPledgeState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {

            val networkIdStateRef = subFlow(RetrieveNetworkIdStateAndRef())
            val fetchedNetworkIdState = networkIdStateRef!!.state.data

            val currentTimeSecs: Long = Instant.now().getEpochSecond()
            val assetPledgeState = AssetPledgeState(
                null, // @property assetStatePointer
                ourIdentity, // @property locker
                "", // @property lockerCert
                "", // @property recipientCert
                currentTimeSecs, // @property expiryTimeSecs
                fetchedNetworkIdState.networkId, // @property localNetworkId
                recipientNetworkId  // @property remoteNetworkId
            )
            println("Creating [AssetPledgeState] state: $assetPledgeState.")
            return assetPledgeState
        } else {
            println("Obtained [AssetPledgeState] state: ${states.first().state.data}.")
            val assetPledgeState = states.first().state.data
            if (assetPledgeState.remoteNetworkId != recipientNetworkId) {
                println("Value of recipientNetworkId(${recipientNetworkId}) didn't match with " +
                        "[AssetPledgeState].remoteNetworkId(${assetPledgeState.remoteNetworkId}).")
                throw IllegalStateException("Value of recipientNetworkId(${recipientNetworkId}) didn't match with " +
                        "[AssetPledgeState].remoteNetworkId(${assetPledgeState.remoteNetworkId}).")
            }
            return states.first().state.data
        }
    }
}

/**
 * The AssetPledgeStateToProtoBytes flow is used to convert the input state to protobuf bytes.
 *
 * @property assetPledgeState The [AssetPledgeState] state fetched from the vault.
 */
@StartableByRPC
class AssetPledgeStateToProtoBytes(
    val assetPledgeState: AssetPledgeState,
    val marshalledAssetJSON: String
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to serialize the [AssetPledgeState] ledger state data.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        println("Going to serialize the [AssetPledgeState] state to ByteArray.")
        val pledgeState = AssetTransfer.AssetPledge.newBuilder()
            // use toStringUtf8() at the time of deserialization of the protobuf @property assetDetails
            .setAssetDetails(ByteString.copyFromUtf8(marshalledAssetJSON))
            .setLocalNetworkID(assetPledgeState.localNetworkId)
            .setRemoteNetworkID(assetPledgeState.remoteNetworkId)
            .setRecipient(assetPledgeState.recipientCert)
            .setExpiryTimeSecs(assetPledgeState.expiryTimeSecs)
            .build()
        return Base64.getEncoder().encodeToString(pledgeState.toByteArray()).toByteArray()
    }
}

/**
 * The ReclaimPledgedAsset flow is used to reclaim an asset that was pledged earlier in the same (exporting) corda network.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property assetStateCreateCommand The name of the contract command used to create the pledged asset in the importing network.
 * @property claimStatusLinearId The unique identifier of the vault state representing asset claim details fetched via interop-query.
 * @property issuer The issuing authority of the pledged fungible asset, if applicable (e.g., fungible house token).
 *                      Otherwise this will be same as the party submitting the transaction.
 * @property observers The parties who are not transaction participants but only observers (can be empty list).
 */
object ReclaimPledgedAsset {
    @InitiatingFlow
    @StartableByRPC
    class Initiator
    @JvmOverloads
    constructor(
        val pledgeId: String,
        val assetStateCreateCommand: CommandData,
        val claimStatusLinearId: String,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
    ) : FlowLogic<Either<Error, SignedTransaction>>() {
        /**
         * The call() method captures the logic to create a new asset state (that was redeemed earlier via a 
         * pledge transaction) by consumes the [AssetPledgeState].
         *
         * @return Returns SignedTransaction.
         */
        @Suspendable
        override fun call(): Either<Error, SignedTransaction> = try {
            val linearId = getLinearIdFromString(pledgeId)

            val viewData = subFlow(GetExternalStateByLinearId(claimStatusLinearId))
            val externalStateView = ViewDataOuterClass.ViewData.parseFrom(viewData)
            val payloadDecoded = Base64.getDecoder().decode(externalStateView.payload.toByteArray())
            val assetClaimStatus = AssetTransfer.AssetClaimStatus.parseFrom(payloadDecoded)
            println("Asset claim status details obtained via interop query: ${assetClaimStatus}")

            val assetPledgeStateAndRefs = serviceHub.vaultService.queryBy<AssetPledgeState>(
                QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
            ).states
            if (assetPledgeStateAndRefs.isEmpty()) {
                println("AssetPledgeState for Id: ${linearId} not found.")
                Left(Error("AssetPledgeState for Id: ${linearId} not found."))
            } else {
                val assetPledgeStateAndRef: StateAndRef<AssetPledgeState> = assetPledgeStateAndRefs.first()
                val assetPledgeState: AssetPledgeState = assetPledgeStateAndRef.state.data
                println("Party: ${ourIdentity} ReclaimPledgeState: ${assetPledgeState}")

                if (assetClaimStatus.expiryTimeSecs != assetPledgeState.expiryTimeSecs) {
                    println("Cannot perform reclaim for pledgeId $pledgeId as the expiration timestamps in the pledge and the claim don't match.")
                    Left(Error("Cannot perform reclaim for pledged $pledgeId as the expiration timestamps in the pledge and the claim don't match."))
                } else if (assetClaimStatus.claimStatus) {
                    println("Cannot perform reclaim for pledgeId $pledgeId as the asset was claimed in remote network.")
                    Left(Error("Cannot perform reclaim for pledged $pledgeId as the asset was claimed in remote network."))
                } else if (!assetClaimStatus.expirationStatus) {
                    println("Cannot perform reclaim for pledgeId $pledgeId as the asset pledge has not yet expired.")
                    Left(Error("Cannot perform reclaim for pledged $pledgeId as the asset pledge has not yet expired."))
                } else {
                    val notary = assetPledgeStateAndRef.state.notary
                    val reclaimCmd = Command(AssetTransferContract.Commands.ReclaimPledgedAsset(),
                        listOf(
                            assetPledgeState.locker.owningKey
                        )
                    )
                    val assetCreateCmd = Command(assetStateCreateCommand,
                        setOf(
                            assetPledgeState.locker.owningKey,
                            issuer.owningKey
                        ).toList()
                    )

                    val networkIdStateRef = subFlow(RetrieveNetworkIdStateAndRef())

                    // Typically, when [AssetPledgeState].assetStatePointer is null, that means the pledge details
                    // are not available on the ledger and the execution will return in the if block above.
                    val reclaimAssetStateAndRef = assetPledgeState.assetStatePointer!!.resolve(serviceHub)
                    val reclaimAssetState = reclaimAssetStateAndRef.state.data
                    val assetStateContractId = reclaimAssetStateAndRef.state.contract

                    val txBuilder = TransactionBuilder(notary)
                        .addInputState(assetPledgeStateAndRef)
                        .addOutputState(reclaimAssetState, assetStateContractId)
                        .addCommand(reclaimCmd).apply {
                            networkIdStateRef!!.let {
                                this.addReferenceState(ReferencedStateAndRef(networkIdStateRef))
                            }
                        }
                        .addCommand(assetCreateCmd)
                        .setTimeWindow(TimeWindow.fromOnly(Instant.ofEpochSecond(assetPledgeState.expiryTimeSecs).plusNanos(1)))

                    // Verify and collect signatures on the transaction
                    txBuilder.verify(serviceHub)
                    var partSignedTx = serviceHub.signInitialTransaction(txBuilder)
                    println("${ourIdentity} signed transaction.")

                    var sessions = listOf<FlowSession>()

                    if (!ourIdentity.equals(issuer)) {
                        val issuerSession = initiateFlow(issuer)
                        issuerSession.send(AssetTransferResponderRole.ISSUER)
                        sessions += issuerSession
                    }
                    if (!ourIdentity.equals(assetPledgeState.locker)) {
                        val lockerSession = initiateFlow(assetPledgeState.locker)
                        lockerSession.send(AssetTransferResponderRole.PLEDGER)
                        sessions += lockerSession
                    }
                    val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions))

                    var observerSessions = listOf<FlowSession>()
                    for (obs in observers) {
                        val obsSession = initiateFlow(obs)
                        obsSession.send(AssetTransferResponderRole.OBSERVER)
                        observerSessions += obsSession
                    }
                    Right(subFlow(FinalityFlow(fullySignedTx, sessions + observerSessions)))
                }
            }
        } catch (e: Exception) {
            println("Error in reclaiming the pledged asset: ${e.message}\n")
            Left(Error("Failed to reclaim the pledged asset: ${e.message}"))
        }
    }

    @InitiatedBy(Initiator::class)
    class Acceptor(val session: FlowSession) : FlowLogic<SignedTransaction>() {
        @Suspendable
        override fun call(): SignedTransaction {
            val role = session.receive<AssetTransferResponderRole>().unwrap { it }
            if (role == AssetTransferResponderRole.ISSUER) {
                val signTransactionFlow = object : SignTransactionFlow(session) {
                    override fun checkTransaction(stx: SignedTransaction) = requireThat {
                    }
                }
                try {
                    val txId = subFlow(signTransactionFlow).id
                    println("Issuer signed transaction.")
                    return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
                } catch (e: Exception) {
                    println("Error signing reclaim asset transaction by Issuer: ${e.message}\n")
                    return subFlow(ReceiveFinalityFlow(session))
                }
            } else if (role == AssetTransferResponderRole.PLEDGER) {
                val signTransactionFlow = object : SignTransactionFlow(session) {
                    override fun checkTransaction(stx: SignedTransaction) = requireThat {
                        val lTx = stx.tx.toLedgerTransaction(serviceHub)
                        "The input State must be [AssetPledgeState] state" using (lTx.inputs[0].state.data is AssetPledgeState)
                        val pledgedState = lTx.inputs.single().state.data as AssetPledgeState
                        "I must be the locker" using (pledgedState.locker == ourIdentity)
                    }
                }
                try {
                    val txId = subFlow(signTransactionFlow).id
                    println("Locker signed transaction.")
                    return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
                } catch (e: Exception) {
                    println("Error signing reclaim asset transaction by Locker: ${e.message}\n")
                    return subFlow(ReceiveFinalityFlow(session))
                }
            } else if (role == AssetTransferResponderRole.OBSERVER) {
                val sTx = subFlow(ReceiveFinalityFlow(session, statesToRecord = StatesToRecord.ALL_VISIBLE))
                println("Received Tx: ${sTx}")
                return sTx
            } else {
                println("Incorrect Responder Role.")
                throw IllegalStateException("Incorrect Responder Role.")
            }
        }
    }
}

/**
 * IsRemoteAssetClaimedEarlier flow checks if remote asset with pledgeId was already claimed (in importing n/w),
 * which is indicated by the existance of the [AssetClaimStatusState] for the pledgeId on the ledger.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 */
@StartableByRPC
class IsRemoteAssetClaimedEarlier(
    val pledgeId: String
) : FlowLogic<AssetClaimStatusState?>() {

    @Suspendable
    override fun call(): AssetClaimStatusState? {
        println("Tring to fetch [AssetClaimStatusState] if available for pledgeId: $pledgeId")

        var retState: AssetClaimStatusState? = null
        val states = serviceHub.vaultService.queryBy<AssetClaimStatusState>().states
            .filter { it.state.data.pledgeId == pledgeId }
            .map {it.state.data}
        if (!states.isEmpty()) {
            retState = states.first()
        }

        return retState
    }
}

/**
 * The ClaimRemoteAsset flow is used to claim an asset which is pledged in a remote/exporting network.
 *
 * @property pledgeId The unique identifier representing the pledge on an asset for transfer, in the exporting n/w.
 * @property pledgeStatusLinearId The unique identifier of the vault state representing asset pledge details fetched via interop-query.
 * @property getAssetAndContractIdFlowName The flow name in the application corDapp that fetches the asset state and contract associated,
 *                                              for the input asset with <assetType, nunUnits>.
 * @property assetType Type of the asset that was pledged in the export n/w.
 * @property assetIdOrQuantity Quantity of the fungible asset / Id of the non-fungible asset that was pledged in the export n/w
 * @property assetStateCreateCommand The name of the contract command used to create the pledged asset in the importing network.
 * @property lockerCert The certificate of the owner of asset in base64 form before transfer in the exporting network.
 * @property recipientCert Certificate of the asset recipient (in base64 format) in the importing network.
 * @property issuer The issuing authority of the pledged asset, if applicable (e.g., fungible house token).
 *                      Otherwise this will be same as the party submitting the transaction.
 * @property observers The parties who are not transaction participants but only observers (can be empty list).
 */
object ClaimRemoteAsset {
    @InitiatingFlow
    @StartableByRPC
    class Initiator
    @JvmOverloads
    constructor(
        val pledgeId: String,
        val pledgeStatusLinearId: String,
        val getAssetAndContractIdFlowName: String,
        val assetType: String,
        val assetIdOrQuantity: Any,
        val createAssetStateCommand: CommandData,
        val lockerCert: String,
        val recipientCert: String,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
    ) : FlowLogic<Either<Error, SignedTransaction>>() {
        /**
         * The call() method captures the logic to claim the asset by verifying the asset-pledge details.
         *
         * @return Returns Either<Error, SignedTransaction>.
         */
        @Suspendable
        override fun call(): Either<Error, SignedTransaction> = try {

            // get the asset pledge details fetched earlier via interop query from import to export n/w
            val viewData = subFlow(GetExternalStateByLinearId(pledgeStatusLinearId))
            val externalStateView = ViewDataOuterClass.ViewData.parseFrom(viewData)
            val payloadDecoded = Base64.getDecoder().decode(externalStateView.payload.toByteArray())
            val assetPledgeStatus = AssetTransfer.AssetPledge.parseFrom(payloadDecoded)
            println("Asset pledge status details obtained via interop query: ${assetPledgeStatus}")
            println("getAssetAndContractIdFlowName: ${getAssetAndContractIdFlowName} assetIdOrQuantity: ${assetIdOrQuantity}")

            var currentTimeSecs: Long
            val calendar = Calendar.getInstance()
            currentTimeSecs = calendar.timeInMillis / 1000

            val networkIdStateRef = subFlow(RetrieveNetworkIdStateAndRef())
            val fetchedNetworkIdState = networkIdStateRef!!.state.data

            val existingAssetClaimStatusState = subFlow(IsRemoteAssetClaimedEarlier(pledgeId))

            // Record claim on the ledger for later verification by a foreign network
            val assetClaimStatusState = AssetClaimStatusState(
                pledgeId,
                // must have used copyFromUtf8() at the time of serialization of the protobuf @property assetDetails
                assetPledgeStatus.assetDetails.toStringUtf8(), // @property assetDetails
                fetchedNetworkIdState.networkId, // @property localNetworkID
                assetPledgeStatus.localNetworkID, // @property remoteNetworkID
                ourIdentity, // @property recipient
                recipientCert,
                true, // @property claimStatus
                assetPledgeStatus.expiryTimeSecs, // @property expiryTimeSecs
                false // @property expirationStatus
            )

            // Obtain a reference from a notary we wish to use.
            // val notary = serviceHub.networkMapCache.notaryIdentities.single()
            val notary = networkIdStateRef.state.notary

            val claimCmd = Command(AssetTransferContract.Commands.ClaimRemoteAsset(),
                listOf(
                    ourIdentity.owningKey
                )
            )

            val assetCreateCmd = Command(createAssetStateCommand,
                setOf(
                    ourIdentity.owningKey,
                    issuer.owningKey
                ).toList()
            )

            // Make sure the pledge has not expired (we assume the expiry timestamp set by the remote network)
            if (currentTimeSecs >= assetPledgeStatus.expiryTimeSecs) {
                println("Cannot claim remote asset with pledgeId ${pledgeId} as the expiry time has elapsed.")
                Left(Error("Cannot claim remote asset with pledged ${pledgeId} as the expiry time has elapsed."))
            } else if (assetPledgeStatus.recipient != recipientCert) {
                println("Cannot claim remote asset with pledgeId ${pledgeId} as it has not been pledged to the the recipient.")
                Left(Error("Cannot claim remote asset with pledged ${pledgeId} as it has not been pledged to the recipient."))
            } else if (fetchedNetworkIdState.networkId != assetPledgeStatus.remoteNetworkID) {
                println("Cannot claim remote asset with pledgeId ${pledgeId} as it has not been pledged to a claimer in this network.")
                Left(Error("Cannot claim remote asset with pledged ${pledgeId} as it has not been pledged to a claimer in this network."))
            } else if (existingAssetClaimStatusState != null) {
                println("Remote asset with pledgeId ${pledgeId} has already been claimed.")
                Left(Error("Remote asset with pledgeId ${pledgeId} has already been claimed."))
            } else {
                // Flow getAssetAndContractIdFlowName takes 5 parameters: assetDetailsBytes, assetType, assetIdOrQuantity, locker, recipient
                // And returns SimpleAsset/SimpleBondAsset/FungibleHouseToken state (i.e., ContractState) and its ContractId as a Pair
                resolveGetAssetStateAndContractIdFlow(getAssetAndContractIdFlowName,
                    listOf(
                        // must have used copyFromUtf8() at the time of serialization of the protobuf @property assetDetails
                        assetPledgeStatus.assetDetails.toStringUtf8(),
                        assetType,
                        assetIdOrQuantity,
                        lockerCert,
                        ourIdentity
                    )
                ).fold({
                    println("Error: Unable to resolve GetAssetStateAndContractId flow.")
                    Left(Error("Error: Unable to resolve GetAssetStateAndContractId flow"))
                }, {
                    println("Resolved GetAssetStateAndContractId flow to ${it}")
                    val (assetContractId: String, outputAssetState: ContractState) = subFlow(it)

                    println("assetContractId: ${assetContractId}")

                    val txBuilder = TransactionBuilder(notary)
                        .addOutputState(outputAssetState, assetContractId)
                        .addOutputState(assetClaimStatusState, AssetTransferContract.ID)
                        .addCommand(claimCmd).apply {
                            networkIdStateRef.let {
                                this.addReferenceState(ReferencedStateAndRef(networkIdStateRef))
                            }
                        }
                        .addCommand(assetCreateCmd)
                        .setTimeWindow(TimeWindow.untilOnly(Instant.ofEpochSecond(assetPledgeStatus.expiryTimeSecs)))

                    // Verify and collect signatures on the transaction
                    txBuilder.verify(serviceHub)
                    val partSignedTx = serviceHub.signInitialTransaction(txBuilder)
                    println("Recipient signed transaction.")

                    var sessions = listOf<FlowSession>()

                    if (!ourIdentity.equals(issuer)) {
                        val issuerSession = initiateFlow(issuer)
                        issuerSession.send(AssetTransferResponderRole.ISSUER)
                        sessions += issuerSession
                    }

                    val fullySignedTx = subFlow(CollectSignaturesFlow(partSignedTx, sessions))

                    var observerSessions = listOf<FlowSession>()
                    for (obs in observers) {
                        val obsSession = initiateFlow(obs)
                        obsSession.send(AssetTransferResponderRole.OBSERVER)
                        observerSessions += obsSession
                    }
                    Right(subFlow(FinalityFlow(fullySignedTx, sessions + observerSessions)))
                })
            }
        } catch (e: Exception) {
            println("Error in claiming the remote asset: ${e.message}\n")
            Left(Error("Failed to claim remote asset: ${e.message}"))
        }
    }

    @InitiatedBy(Initiator::class)
    class Acceptor(val session: FlowSession) : FlowLogic<SignedTransaction>() {
        @Suspendable
        override fun call(): SignedTransaction {
            val role = session.receive<ResponderRole>().unwrap { it }
            if (role == ResponderRole.ISSUER) {
                val signTransactionFlow = object : SignTransactionFlow(session) {
                    override fun checkTransaction(stx: SignedTransaction) = requireThat {
                    }
                }
                try {
                    val txId = subFlow(signTransactionFlow).id
                    println("Issuer signed transaction.")
                    return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
                } catch (e: Exception) {
                    println("Error signing claim asset transaction by issuer: ${e.message}\n")
                    return subFlow(ReceiveFinalityFlow(session))
                }
            } else if (role == ResponderRole.OBSERVER) {
                val sTx = subFlow(ReceiveFinalityFlow(session, statesToRecord = StatesToRecord.ALL_VISIBLE))
                println("Received Tx: ${sTx} and recorded states.")
                return sTx
            } else {
                println("Incorrect Responder Role.")
                throw IllegalStateException("Incorrect Responder Role.")
            }
        }
    }
}

/**
 * The resolveGetAssetStateAndContractIdFlow function uses reflection to construct an instance of FlowLogic from the given
 * flow name and arguments.
 *
 * @param flowName The name of the flow provided by the remote client.
 * @param flowArgs The list of arguments for the flow provided by the remote client.
 * @return Returns an Either with an instance of FlowLogic if it was resolvable, or an Error.
 */
@Suppress("UNCHECKED_CAST")
fun resolveGetAssetStateAndContractIdFlow(flowName: String, flowArgs: List<Any>): Either<Error, FlowLogic<Pair<String, ContractState>>> = try {
    println("Attempting to resolve ${flowName} to a Corda flow.")
    val kotlinClass = Class.forName(flowName).kotlin
    val ctor = kotlinClass.constructors.first()
    if (ctor.parameters.size != flowArgs.size) {
        println("Flow Resolution Error: wrong number of arguments supplied.\n")
        Left(Error("Flow Resolution Error: wrong number of arguments supplied"))
    } else {
        try {
            Right(ctor.call(*flowArgs.toTypedArray()) as FlowLogic<Pair<String, ContractState>>)
        } catch (e: Exception) {
            println("Flow Resolution Error: $flowName not a flow: ${e.message}.\n")
            Left(Error("Flow Resolution Error: $flowName not a flow"))
        }
    }
} catch (e: Exception) {
    println("Flow Resolution Error: ${e.message} \n")
    Left(Error("Flow Resolution Error: ${e.message}"))
}