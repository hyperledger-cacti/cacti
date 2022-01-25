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

import net.corda.core.contracts.ContractState
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.Command
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.contracts.TimeWindow
import net.corda.core.contracts.StateAndRef
import net.corda.core.contracts.requireThat
import net.corda.core.contracts.StaticPointer

import net.corda.core.identity.Party
import net.corda.core.identity.CordaX500Name

import net.corda.core.flows.*
import net.corda.core.node.services.queryBy
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.node.ServiceHub
import net.corda.core.transactions.TransactionBuilder
import net.corda.core.transactions.SignedTransaction
import net.corda.core.utilities.OpaqueBytes
import java.time.Instant
import java.util.Base64

import com.weaver.protos.common.asset_locks.AssetLocks
import com.weaver.protos.common.asset_transfer.AssetTransfer

/**
 * The PledgeFungibleAsset flow is used to create a pledge for a fungible asset.
 *
 * @property agreement The details of the fungible asset being pledged for transfer to remote network.
 *                          AssetType, numUnits & recipient are captured by the "agreement" structure.
 * assetType -- The type of the fungible asset to be pledged.
 * numUnits -- The number of units of the fungible asset (e.g., tokens) to be pledged.
 * recipient -- The party in the remote network who will be the asset owner after transfer.
 * @property expiryTimeSecs The time in epoch till which the pledge is valid.
 * @property getAssetFlowName The name of the flow used to fetch the fungible asset from the vault.
 * @property assetStateDeleteCommand The name of the command used to delete the pledged asset.
 * @property issuer The issuing authority of the pledged fungible asset.
 * @property observers The parties who are not transaction participants but only observers.
 */
@InitiatingFlow
@StartableByRPC
class PledgeFungibleAsset
@JvmOverloads
constructor(
        val agreement: AssetLocks.FungibleAssetExchangeAgreement,
        val assetPledge: AssetTransfer.AssetPledge,
        val getAssetFlowName: String,
        val assetStateDeleteCommand: CommandData,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [AssetPledgeState] state in the vault.
     *
     * It first creates a new AssetPledgeState. It then builds
     * and verifies the transaction, collects the required signatures,
     * and stores the state in the vault.
     *
     * @return Returns the contractId of the newly created [AssetPledgeState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {   

        val assetType = agreement.type
        val numUnits = agreement.numUnits
        val recipient = assetPledge.recipient
        val assetJSON = assetPledge.assetDetails.toByteArray()

        val expiryTime: Instant = Instant.ofEpochSecond(assetPledge.expiryTimeSecs)
        if (expiryTime.isBefore(Instant.now())) {
            Left(Error("Invalid Expiry Time for fungible asset pledge."))
        }

        // Get AssetStateAndRef
        resolveStateAndRefFlow(getAssetFlowName,
            listOf(assetType, numUnits)
        ).fold({
            println("Error: Unable to resolve Get fungible Asset StateAndRef Flow.")
            Left(Error("Error: Unable to resolve Get fungible Asset StateAndRef Flow"))
        }, {
            println("Resolved Get Asset flow to ${it}")
            val assetRef = subFlow(it)

            if (assetRef == null) {
                println("Error: Unable to Get fungible Asset StateAndRef for type: ${assetType} and id: ${numUnits}.")
                Left(Error("Error: Unable to Get fungible Asset StateAndRef for type: ${assetType} and id: ${numUnits}."))
            }

            if (recipient == "") {
                println("Error: recipient party cannot be empty: ${recipient}.")
                Left(Error("Error: Receipient party cannot be empty: ${recipient}."))
            }

            println("Local network id is ${assetPledge.localNetworkID} and remote network id is ${assetPledge.remoteNetworkID}")

            subFlow(AssetTransferPledge.Initiator(
                expiryTime,
                assetRef!!,
                assetStateDeleteCommand,
                assetJSON,
                recipient,
                assetPledge.localNetworkID,
                assetPledge.remoteNetworkID,
                issuer,
                observers
            ))
        })
    } catch (e: Exception) {
        println("Error pledging fungible asset: ${e.message}\n")
        Left(Error("Failed to pledge fungible asset: ${e.message}"))
    }
}


/**
 * The PledgeAsset flow is used to create a pledge for a non-fungible asset.
 *
 * @property agreement The details of the non-fungible asset being pledged for transfer to remote network.
 *                          AssetType, AssetId & recipient are captured by the "agreement" structure.
 * assetType -- The type of the fungible asset to be pledged.
 * assetId -- The identifier of the non-fungible asset (e.g., tokens) to be pledged.
 * recipient -- The party in the remote network who will be the asset owner after transfer.
 * @property expiryTimeSecs The time in epoch till which the pledge is valid.
 * @property getAssetFlowName The name of the flow used to fetch the fungible asset from the vault.
 * @property assetStateDeleteCommand The name of the command used to delete the pledged asset.
 * @property issuer The issuing authority of the pledged fungible asset.
 * @property observers The parties who are not transaction participants but only observers.
 */

@InitiatingFlow
@StartableByRPC
class PledgeAsset
@JvmOverloads
constructor(
    val agreement: AssetLocks.AssetExchangeAgreement,
    val assetPledge: AssetTransfer.AssetPledge,
    val getAssetFlowName: String,
    val assetStateDeleteCommand: CommandData,
    val issuer: Party,
    val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [AssetPledgeState] state in the vault.
     *
     * It first creates a new AssetPledgeState. It then builds
     * and verifies the transaction, collects the required signatures,
     * and stores the state in the vault.
     *
     * @return Returns the contractId of the newly created [AssetPledgeState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {

        val assetType = agreement.type
        val assetId = agreement.id
        val recipient = assetPledge.recipient
        val assetJSON = assetPledge.assetDetails.toByteArray()

        val expiryTime: Instant = Instant.ofEpochSecond(assetPledge.expiryTimeSecs)
        if (expiryTime.isBefore(Instant.now())) {
            Left(Error("Invalid Expiry Time."))
        }

        // Get AssetStateAndRef
        resolveStateAndRefFlow(getAssetFlowName,
            listOf(assetType, assetId)
        ).fold({
            println("Error: Unable to resolve Get Asset StateAndRef Flow.")
            Left(Error("Error: Unable to resolve Get Asset StateAndRef Flow"))
        }, {
            println("Resolved Get Asset flow to ${it}")
            val assetRef = subFlow(it)

            if (assetRef == null) {
                println("Error: Unable to Get Asset StateAndRef for type: ${assetType} and id: ${assetId}.")
                Left(Error("Error: Unable to Get Asset StateAndRef for type: ${assetType} and id: ${assetId}."))
            }

            if (recipient == "") {
                println("Error: recipient party cannot be empty: ${recipient}.")
                Left(Error("Error: Receipient party cannot be empty: ${recipient}."))
            }

            println("Local network id is ${assetPledge.localNetworkID} and remote network id is ${assetPledge.remoteNetworkID}")

            subFlow(AssetTransferPledge.Initiator(
                expiryTime,
                assetRef!!,
                assetStateDeleteCommand,
                assetJSON,
                recipient,
                assetPledge.localNetworkID,
                assetPledge.remoteNetworkID,
                issuer,
                observers
            ))
        })
    } catch (e: Exception) {
        println("Error pledging non-fungible asset: ${e.message}\n")
        Left(Error("Failed to pledge non-fungible asset: ${e.message}"))
    }
}

/**
 * The ReclaimAsset flow is used to reclaim an already pledged asset in the same local corda network.
 *
 * @property contractId The unique identifier for an AssetExchangeHTLCState.
 * @property assetStateCreateCommand The name of the command used to create an asset that's pledged earlier.
 * @property issuer The issuing authority of the pledged fungible asset.
 * @property observers The parties who are not transaction participants but only observers.
 */

@InitiatingFlow
@StartableByRPC
class ReclaimAsset
@JvmOverloads
constructor(
    val contractId: String,
    val assetStateCreateCommand: CommandData,
    val claimStatusLinearId: String,
    val issuer: Party,
    val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, SignedTransaction>>() {
    /**
     * The call() method captures the logic to reclaim an asset that is pledged earlier.
     *
     * @return Returns SignedTransaction.
     */
    @Suspendable
    override fun call(): Either<Error, SignedTransaction> = try {
        subFlow(ReclaimPledgedAsset.Initiator(
            contractId,
            assetStateCreateCommand,
            claimStatusLinearId,
            issuer,
            observers
        ))
    } catch (e: Exception) {
        println("Error reclaiming: ${e.message}\n")
        Left(Error("Failed to reclaim: ${e.message}"))
    }
}
