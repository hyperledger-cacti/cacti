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
 * Enum for communicating the role of the responder from initiator flow to
 * responder flow.
 */

@CordaSerializable
enum class AssetTransferResponderRole {
    LOCKER, ISSUER, OBSERVER
}

/**
 * The AssetTransferPledge flow is used to create a pledge on an asset ready for transfer to remote network.
 *
 * @property expiryTime The future time in seconds till when the pledge is valid.
 * @property assetStateRef The state pointer to the asset in the vault that is being pledged for remote network transfer.
 * @property assetStateDeleteCommand The name of the command used to delete the pledged asset.
 * @property recipient The party in the remote network who will be the asset owner after transfer.
 * @property issuer The issuing authority of the pledged fungible asset.
 * @property observers The parties who are not transaction participants but only observers.
 */

object AssetTransferPledge {
    @InitiatingFlow
    @StartableByRPC
    class Initiator
    @JvmOverloads
    constructor(
        val expiryTimeSecs: Long,
        val assetStateRef: StateAndRef<ContractState>,
        val assetStateDeleteCommand: CommandData,
        val assetJSON: String,
        val recipient: String,
        val localNetworkId: String,
        val remoteNetworkId: String,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
    ) : FlowLogic<Either<Error, UniqueIdentifier>>() {
        /**
         * The call() method captures the logic to pledge a new [AssetPledgeState] state in the vault.
         *
         * It first creates a new AssetPledgeState. It then builds
         * and verifies the transaction, collects the required signatures,
         * and stores the state in the vault.
         *
         * @return Returns the linearId of the newly created [AssetPledgeState].
         */
        @Suspendable
        override fun call(): Either<Error, UniqueIdentifier> = try {
            // 1. Create the asset pledge state
            val assetPledgeState = AssetPledgeState(
                StaticPointer(assetStateRef.ref, assetStateRef.state.data.javaClass), //Get the state pointer from StateAndRef
                assetJSON,
                ourIdentity,
                recipient,
                expiryTimeSecs,
                localNetworkId,
                remoteNetworkId
            )
            println("Creating asset pledge state ${assetPledgeState}")

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

            val networkIdStates = serviceHub.vaultService.queryBy<NetworkIdState>().states
            var fetchedNetworkIdState: StateAndRef<NetworkIdState>? = null

            if (networkIdStates.isNotEmpty()) {
                // consider that there will be only one such state ideally
                fetchedNetworkIdState = networkIdStates.first()
                println("Network id for local Corda newtork is: $fetchedNetworkIdState\n")
            } else {
                println("Not able to fetch network id for local Corda network\n")
            }

            val txBuilder = TransactionBuilder(notary)
                .addInputState(assetStateRef)
                .addOutputState(assetPledgeState, AssetTransferContract.ID)
                .addCommand(pledgeCmd).apply {
                    fetchedNetworkIdState?.let {
                        this.addReferenceState(ReferencedStateAndRef(fetchedNetworkIdState))
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
 * The IsAssetPledged flow is used to check if an asset is locked.
 *
 * @property linearId The unique identifier for an AssetPledgeState.
 */
@StartableByRPC
class IsAssetPledged(
    val contractId: String
) : FlowLogic<Boolean>() {
    /**
     * The call() method captures the logic to check if asset is pledged for asset-transfer or not.
     *
     * @return Returns Boolean True/False
     */
    @Suspendable
    override fun call(): Boolean {
        val linearId = getLinearIdFromString(contractId)
        println("Getting AssetPledgeState for linearId $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetPledgeState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {
            println("No states found")
            return false
        } else {
            val pledgedState = states.first().state.data
            println("Got AssetPledgeState: ${pledgedState}")
            if (Instant.now().isAfter(Instant.ofEpochSecond(pledgedState.expiryTimeSecs))) {
                return false
            }
            return true
        }
    }
}

/**
 * The GetAssetClaimStatusStateByExpiryTimeSecs flow is used to fetch the AssetClaimStatusState state.
 *
 * @property expiryTimeSecs The epoch time in seconds to filter the state.
 */
@StartableByRPC
class GetAssetClaimStatusStateByExpiryTimeSecs(
    val expiryTimeSecs: String
) : FlowLogic<AssetClaimStatusState>() {
    /**
     * The call() method captures the logic to fetch the AssetClaimStatusState.
     *
     * @return Returns AssetClaimStatusState
     */
    @Suspendable
    override fun call(): AssetClaimStatusState {
        var retVal: AssetClaimStatusState? = null
        println("Getting AssetClaimStatusState with expiryTimeSecs ${expiryTimeSecs}.")
        val states = serviceHub.vaultService.queryBy<AssetClaimStatusState>().states
            .filter { it.state.data.expiryTimeSecs == expiryTimeSecs.toLong()}
            .map {it.state.data}
        if (states.isEmpty()) {
            println("No AssetClaimStatusState found with expirtyTimeSecs: ${expiryTimeSecs}")
        } else {
            println("Got AssetClaimStatusState: ${states.first()}")
            retVal = states.first()
        }

        return retVal!!
    }
}

/**
 * The GetAssetPledgeStateById flow is used to fetch an existing AssetPledgeState.
 *
 * @property linearId The unique identifier for an AssetPledgeState.
 */
@StartableByRPC
class GetAssetPledgeStateById(
    val pledgeId: String
) : FlowLogic<Either<Error, StateAndRef<AssetPledgeState>>>() {
    /**
     * The call() method captures the logic to fetch the AssetPledgeState.
     *
     * @return Returns Either<Error, AssetPledgeState>
     */
    @Suspendable
    override fun call(): Either<Error, StateAndRef<AssetPledgeState>> = try {
        val linearId = getLinearIdFromString(pledgeId)
        println("Getting AssetPledgeState for contractId $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetPledgeState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {
            Left(Error("AssetPledgeState for Id: ${linearId} not found."))
        } else {
            println("Got AssetPledgeState: ${states.first().state.data}")
            Right(states.first())
        }
    } catch (e: Exception) {
        println("Error fetching state from the vault: ${e.message}\n")
        Left(Error("Error fetching state from the vault: ${e.message}"))
    }
}

/**
 * The GetAssetClaimStatusState flow is used to fetch an existing AssetClaimStatusState by a remote network.
 *
 * @property pledgeId The unique identifier for an AssetClaimStatusState.
 * @property pledgeExpiryTimeSecsString The expiry time in secs before which claim can be performed
 * @property blankAssetJSON The byte array representing an empty/dummy asset
 */
@StartableByRPC
class GetAssetClaimStatusState(
    val pledgeId: String,
    val pledgeExpiryTimeSecsString: String,
    val blankAssetJSON: String
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to fetch the AssetClaimStatusState.
     * If the state is not found for a given pledgeId, then it returns an empty state.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        val linearId = getLinearIdFromString(pledgeId)

        val pledgeExpiryTimeSecs = pledgeExpiryTimeSecsString.toLong()
        println("Getting AssetClaimStatusState for pledgeId $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetClaimStatusState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {

            val networkIdStates = serviceHub.vaultService.queryBy<NetworkIdState>().states
            var fetchedNetworkIdState: NetworkIdState? = null

            if (networkIdStates.isNotEmpty()) {
                // consider that there will be only one such state ideally
                fetchedNetworkIdState = networkIdStates.first().state.data
                println("Network id for local Corda newtork is: $fetchedNetworkIdState\n")
            } else {
                println("Not able to fetch network id for local Corda network\n")
            }

            var nTimeout: Long
            val expirationStatus: Boolean
            val calendar = Calendar.getInstance()
            nTimeout = calendar.timeInMillis / 1000
            if (nTimeout <= pledgeExpiryTimeSecs) {
                expirationStatus = false
            } else {
                expirationStatus = true
            }

            val assetClaimStatusState = AssetClaimStatusState(
                blankAssetJSON,
                "",
                fetchedNetworkIdState!!.networkId,
                ourIdentity,
                "",
                false,
                pledgeExpiryTimeSecs,
                expirationStatus
            )
            println("Creating AssetClaimStatusState ${assetClaimStatusState}")
            return subFlow(AssetClaimStatusStateToProtoBytes(assetClaimStatusState))
        } else {
            println("Got AssetClaimStatusState: ${states.first().state.data}")
            return subFlow(AssetClaimStatusStateToProtoBytes(states.first().state.data))
        }
    }
}

/**
 * The AssetClaimStatusStateToProtoBytes flow is used to convert the input state to bytes.
 *
 * @property assetClaimStatusState Asset claim status state in the vault.
 */
@StartableByRPC
class AssetClaimStatusStateToProtoBytes(
    val assetClaimStatusState: AssetClaimStatusState
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to convert the AssetClaimStatusState to Byte Array.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        println("Going to covert the asset claim status state to Byte Array.")
        val claimStatus = AssetTransfer.AssetClaimStatus.newBuilder()
            .setAssetDetails(ByteString.copyFromUtf8(assetClaimStatusState.assetDetails))
            .setLocalNetworkID(assetClaimStatusState.localNetworkID)
            .setRemoteNetworkID(assetClaimStatusState.remoteNetworkID)
            .setRecipient(assetClaimStatusState.recipientCert)
            .setClaimStatus(assetClaimStatusState.claimStatus)
            .setExpiryTimeSecs(assetClaimStatusState.expiryTimeSecs)
            .setExpirationStatus(assetClaimStatusState.expirationStatus)
            .build()
        return claimStatus.toByteArray()
    }
}

/**
 * The GetAssetPledgeStatus flow is used to fetch an existing AssetPledgeState by a remote network.
 *
 * @property pledgeId The unique identifier for an AssetPledgeState.
 * @property recipientNetworkId The network id for the importing network
 * @property blankAssetJSON The byte array representing an empty/dummy asset
 */
@StartableByRPC
class GetAssetPledgeStatus(
    val pledgeId: String,
    val recipientNetworkId: String,
    val blankAssetJSON: String
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to fetch the AssetPledgeState.
     * If the state is not found for a given pledgeId, then it returns an empty state.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        val linearId = getLinearIdFromString(pledgeId)

        println("Getting AssetPledgeState for pledgeId $linearId.")
        val states = serviceHub.vaultService.queryBy<AssetPledgeState>(
            QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
        ).states
        if (states.isEmpty()) {

            val networkIdStates = serviceHub.vaultService.queryBy<NetworkIdState>().states
            var fetchedNetworkIdState: NetworkIdState? = null

            if (networkIdStates.isNotEmpty()) {
                // consider that there will be only one such state ideally
                fetchedNetworkIdState = networkIdStates.first().state.data
                println("Network id for local Corda newtork is: $fetchedNetworkIdState\n")
            } else {
                println("Not able to fetch network id for local Corda network\n")
            }

            val emptyStatePointer: StaticPointer<ContractState>? = null
            val noParty: Party? = null
            val currentTimeSecs: Long
            val currInstant = Instant.now()
            currentTimeSecs = currInstant.getEpochSecond()
            val assetPledgeState = AssetPledgeState(
                emptyStatePointer!!,
                blankAssetJSON,
                noParty!!,
                "",
                currentTimeSecs,
                fetchedNetworkIdState!!.networkId,
                ""
            )
            println("Creating AssetClaimStatusState ${assetPledgeState}")
            return subFlow(AssetPledgeStateToProtoBytes(assetPledgeState))
        } else {
            println("Got AssetPledgeState: ${states.first().state.data}")
            val assetPledgeState = states.first().state.data
            if (assetPledgeState.remoteNetworkId != recipientNetworkId) {
                println("Value of recipientNetworkId(${recipientNetworkId}) didn't match with " +
                        "AssetPledgeState.remoteNetworkId(${assetPledgeState.remoteNetworkId}).")
                throw IllegalStateException("Value of recipientNetworkId(${recipientNetworkId}) didn't match with " +
                        "AssetPledgeState.remoteNetworkId(${assetPledgeState.remoteNetworkId}).")
            }
            return subFlow(AssetPledgeStateToProtoBytes(states.first().state.data))
        }
    }
}

/**
 * The AssetPledgeStateToProtoBytes flow is used to convert the input state to bytes.
 *
 * @property assetPledgeState Asset pledge status state in the vault.
 */
@StartableByRPC
class AssetPledgeStateToProtoBytes(
    val assetPledgeState: AssetPledgeState
) : FlowLogic<ByteArray>() {
    /**
     * The call() method captures the logic to convert the AssetPledgeState to Byte Array.
     *
     * @return Returns ByteArray
     */
    @Suspendable
    override fun call(): ByteArray {
        println("Going to covert the asset pledge state to Byte Array.")
        val pledgeState = AssetTransfer.AssetPledge.newBuilder()
            .setAssetDetails(ByteString.copyFromUtf8(assetPledgeState.assetDetails))
            .setLocalNetworkID(assetPledgeState.localNetworkId)
            .setRemoteNetworkID(assetPledgeState.remoteNetworkId)
            .setRecipient(assetPledgeState.recipient)
            .setExpiryTimeSecs(assetPledgeState.expiryTimeSecs)
            .build()
        return pledgeState.toByteArray()
    }
}

/**
 * The ReclaimPledgedAsset flow is used to reclaim an asset that is pledged already in the same local corda network.
 *
 * @property pledgeId The unique identifier for an AssetPledgeState.
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
         * The call() method captures the logic to reclaim an asset.
         *
         * @return Returns SignedTransaction.
         */
        @Suspendable
        override fun call(): Either<Error, SignedTransaction> = try {
            val linearId = getLinearIdFromString(pledgeId)

            val viewData = subFlow(GetExternalStateByLinearId(claimStatusLinearId))
            val externalStateView = ViewDataOuterClass.ViewData.parseFrom(viewData)
            val assetCliamStatus = AssetTransfer.AssetClaimStatus.parseFrom(externalStateView.payload.toByteArray())
            println("Available assetCliamStatus: ${assetCliamStatus}")

            if (assetCliamStatus.claimStatus) {
                println("Cannot perform reclaim for pledgeId ${pledgeId} as the asset was claimed in remote network.")
                Left(Error("Cannot perform eclaim for pledged ${pledgeId} as the asset was claimed in remote network."))
            }

            subFlow(GetAssetPledgeStateById(pledgeId)).fold({
                println("AssetPledgeState for Id: ${linearId} not found.")
                Left(Error("AssetPledgeState for Id: ${linearId} not found."))
            }, {
                val assetPledgeState = it.state.data
                println("Party: ${ourIdentity} ReclaimPledgeState: ${assetPledgeState}")
                val notary = it.state.notary
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

                val reclaimAssetStateAndRef = assetPledgeState.assetStatePointer.resolve(serviceHub)
                val reclaimAssetState = reclaimAssetStateAndRef.state.data
                val assetStateContractId = reclaimAssetStateAndRef.state.contract

                val networkIdStates = serviceHub.vaultService.queryBy<NetworkIdState>().states
                var fetchedNetworkIdState: StateAndRef<NetworkIdState>? = null

                if (networkIdStates.isNotEmpty()) {
                    // consider that there will be only one such state ideally
                    fetchedNetworkIdState = networkIdStates.first()
                    println("Network id for local Corda newtork is: $fetchedNetworkIdState\n")
                } else {
                    println("Not able to fetch network id for local Corda network\n")
                }

                val txBuilder = TransactionBuilder(notary)
                    .addInputState(it)
                    .addOutputState(reclaimAssetState, assetStateContractId)
                    .addCommand(reclaimCmd).apply {
                        fetchedNetworkIdState?.let {
                            this.addReferenceState(ReferencedStateAndRef(fetchedNetworkIdState))
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
                    lockerSession.send(AssetTransferResponderRole.LOCKER)
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
            })
        } catch (e: Exception) {
            println("Error unlocking: ${e.message}\n")
            Left(Error("Failed to unlock: ${e.message}"))
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
            } else if (role == AssetTransferResponderRole.LOCKER) {
                val signTransactionFlow = object : SignTransactionFlow(session) {
                    override fun checkTransaction(stx: SignedTransaction) = requireThat {
                        val lTx = stx.tx.toLedgerTransaction(serviceHub)
                        "The input State must be AssetPledgeState" using (lTx.inputs[0].state.data is AssetPledgeState)
                        val pledgedState = lTx.inputs.single().state.data as AssetPledgeState
                        "I must be the locker" using (pledgedState.locker == ourIdentity)
                    }
                }
                try {
                    val txId = subFlow(signTransactionFlow).id
                    println("Locker signed transaction.")
                    return subFlow(ReceiveFinalityFlow(session, expectedTxId = txId))
                } catch (e: Exception) {
                    println("Error signing unlock asset transaction by Locker: ${e.message}\n")
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
 * The ClaimRemoteAsset flow is used to claim an asset which is pledged in a remote/exporting network.
 *
 * @property pledgeId The unique identifier for an AssetPledgeState.
 * @property pledgeStatusLinearId The unique identifier to fetch the pledge details (fetched earlier via interop query).
 * @property assetStateRef The state pointer to the asset in the vault that is being pledged for remote network transfer.
 * @property assetStateCreateCommand The name of the command used to create the pledged asset.
 * @property recipient The party in the local network who will be the asset owner after transfer.
 * @property issuer The issuing authority of the pledged fungible asset.
 * @property observers The parties who are not transaction participants but only observers.
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
        val numUnits: Long,
        val assetStateCreateCommand: CommandData,
        val recipient: String,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
    ) : FlowLogic<Either<Error, SignedTransaction>>() {
        /**
         * The call() method captures the logic to claim the asset by verifying the asset-pledge details.
         *
         * @return Returns SignedTransaction.
         */
        @Suspendable
        override fun call(): Either<Error, SignedTransaction> = try {
            val linearId = getLinearIdFromString(pledgeId)

            /*val viewData = subFlow(GetExternalStateByLinearId(pledgeStatusLinearId))
            val externalStateView = ViewDataOuterClass.ViewData.parseFrom(viewData)
            val assetPledgeStatus = AssetTransfer.AssetPledge.parseFrom(externalStateView.payload.toByteArray())
            */

            val pledgestates = serviceHub.vaultService.queryBy<AssetPledgeState>(
                QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
            ).states
            val assetPledgeStatus = pledgestates.first().state.data
            println("Available assetPledgeStatus: ${assetPledgeStatus}")

            // Make sure the pledge has not expired (we assume the expiry timestamp set by the remote network)
            var currentTimeSecs: Long
            val calendar = Calendar.getInstance()
            currentTimeSecs = calendar.timeInMillis / 1000
            println("currentTimeSecs: ${currentTimeSecs}")
            if (currentTimeSecs >= assetPledgeStatus.expiryTimeSecs) {
                println("Cannot claim remote asset with pledgeId ${pledgeId} as the expiry time has elapsed.")
                Left(Error("Cannot claim remote asset with pledged ${pledgeId} as the expiry time has elapsed."))
            }

            /*
            //if (remoteNetworkId != assetPledgeStatus.localNetworkID) {
            if (remoteNetworkId != assetPledgeStatus.localNetworkId) {
                println("Cannot claim remote asset with pledgeId ${pledgeId} as it has not been pledged by the given network.")
                Left(Error("Cannot claim remote asset with pledged ${pledgeId} as it has not been pledged by the given network."))
            }
            */

            val networkIdStateRef = subFlow(RetrieveNetworkIdStateAndRef())
            val fetchedNetworkIdState = networkIdStateRef!!.state.data

            //if (fetchedNetworkIdState.networkId != assetPledgeStatus.remoteNetworkID) {
            if (fetchedNetworkIdState.networkId != assetPledgeStatus.remoteNetworkId) {
                println("Cannot claim remote asset with pledgeId ${pledgeId} as it has not been pledged to a claimer in this network.")
                Left(Error("Cannot claim remote asset with pledged ${pledgeId} as it has not been pledged to a claimer in this network."))
            }

            // Record claim on the ledger for later verification by a foreign network
            val assetClaimStatusState = AssetClaimStatusState(
                //assetPledgeStatus.assetDetails.toByteArray(),
                assetPledgeStatus.assetDetails,
                fetchedNetworkIdState.networkId,
                //assetPledgeStatus.localNetworkID,
                assetPledgeStatus.localNetworkId,
                ourIdentity, // party who is recipient
                Base64.getEncoder().encodeToString(ourIdentityAndCert.certificate.toString().toByteArray()), // recipient cert
                true,
                assetPledgeStatus.expiryTimeSecs,
                false,
                linearId
            )

            val states = serviceHub.vaultService.queryBy<AssetClaimStatusState>(
                QueryCriteria.LinearStateQueryCriteria(linearId = listOf(linearId))
            ).states
            if (!states.isEmpty()) {
                val assetClaimStatus = states.first().state.data
                if (assetClaimStatus.claimStatus) {
                    println("Remote asset with pledgeId ${pledgeId} has already been claimed.")
                    Left(Error("Remote asset with pledgeId ${pledgeId} has already been claimed."))
                }
            }

            // Obtain a reference from a notary we wish to use.
            //val notary = serviceHub.networkMapCache.notaryIdentities.single()
            val notary = networkIdStateRef.state.notary

            val claimCmd = Command(AssetTransferContract.Commands.ClaimRemoteAsset(),
                listOf(
                    // below needs to be updated to work from Fabric->Corda asset transfer
                    //assetPledgeStatus.recipient.owningKey
                    ourIdentity.owningKey
                )
            )

            val assetCreateCmd = Command(assetStateCreateCommand,
                setOf(
                    //assetPledgeStatus.recipient.owningKey,
                    ourIdentity.owningKey,
                    issuer.owningKey
                ).toList()
            )

            // Flow getAssetAndContractIdFlowName takes 4 parameters: assetDetailsBytes, assetType, numUnits, owner
            // And returns SimpleAsset/FungibleToken(i.e., ContractState) state and its ContractId as a Pair
            //var outputAssetState: ContractState? = null
            //var assetContractId: String? = null
            resolveGetAssetStateAndContractIdFlow(getAssetAndContractIdFlowName,
                //assetPledgeStatus.assetDetails.toByteArray(),
                listOf(assetPledgeStatus.assetDetails, assetType, numUnits, ourIdentity)
            ).fold({
                println("Error: Unable to resolve GetAssetStateAndContractId flow.")
                Left(Error("Error: Unable to resolve GetAssetStateAndContractId flow"))
            }, {
                println("Resolved GetAssetStateAndContractId flow to ${it}")
                val (contractId, assetState) = subFlow(it)

                val outputAssetState = assetState
                val assetContractId = contractId
                println("assetContractId: ${assetContractId}")

                val txBuilder = TransactionBuilder(notary)
                    //.addOutputState(outputAssetState!!, assetContractId!!)
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
        } catch (e: Exception) {
            println("Error claiming: ${e.message}\n")
            Left(Error("Failed to claim: ${e.message}"))
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