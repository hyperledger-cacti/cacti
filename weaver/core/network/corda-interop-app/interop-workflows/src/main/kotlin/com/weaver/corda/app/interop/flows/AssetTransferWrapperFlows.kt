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
import com.weaver.corda.app.interop.states.AssetPledgeParameters
import com.weaver.corda.app.interop.states.AssetReclaimParameters
import com.weaver.corda.app.interop.states.AssetClaimParameters

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
 * The AssetTransferPledge flow is used to create a pledge for both fungible and non-fungible/bond assets.
 *
 * @property pledgeArgs The details of the fungible/non-fungible asset being pledged for transfer to remote network.
 *                          Bleow properties are captured by this structure.
 * assetType -- The type of the fungible or non-fungible/bond asset to be pledged.
 * assetIdOrQuantity -- The identifier of the non-fungible/bond asset to be pledged;
 *                      or the number of units of the fungible asset (e.g., tokens) to be pledged.
 * recipientCert -- The certificate of the party in the remote network who will be the asset owner after transfer.
 * expiryTimeSecs -- The time in epoch till which the pledge is valid.
 * getAssetStateAndRefFlow -- The name of the flow used to fetch the fungible or non-fungible/bond asset's StateAndRef from the vault.
 * deleteAssetStateCommand -- The name of the command used to delete the pledged fungible or non-fungible/bond asset.
 * issuer -- The issuing authority of the pledged fungible or non-fungible/bond asset.
 * observers -- The parties who are not transaction participants but only observers.
 */
@InitiatingFlow
@StartableByRPC
class AssetTransferPledge
constructor(
    val pledgeArgs: AssetPledgeParameters
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

        val expiryTime: Instant = Instant.ofEpochSecond(pledgeArgs.expiryTimeSecs)
        if (expiryTime.isBefore(Instant.now())) {
            Left(Error("Invalid Expiry Time."))
        }

        // Get AssetStateAndRef
        resolveStateAndRefFlow(pledgeArgs.getAssetStateAndRefFlow,
            listOf(pledgeArgs.assetType, pledgeArgs.assetIdOrQuantity)
        ).fold({
            println("Error: Unable to resolve Get Asset StateAndRef Flow.")
            Left(Error("Error: Unable to resolve Get Asset StateAndRef Flow"))
        }, {
            println("Resolved Get Asset flow to ${it}")
            val assetRef: StateAndRef<ContractState>? = subFlow(it)

            if (assetRef == null) {
                println("Error: Unable to Get Asset StateAndRef for type: ${pledgeArgs.assetType} and id: ${pledgeArgs.assetIdOrQuantity}.")
                Left(Error("Error: Unable to Get Asset StateAndRef for type: ${pledgeArgs.assetType} and id: ${pledgeArgs.assetIdOrQuantity}."))
            }

            if (pledgeArgs.recipientCert == "") {
                println("Error: recipient party cannot be empty: ${pledgeArgs.recipientCert}.")
                Left(Error("Error: Receipient party cannot be empty: ${pledgeArgs.recipientCert}."))
            }

            println("Local network id is ${pledgeArgs.localNetworkId} and remote network id is ${pledgeArgs.remoteNetworkId}")

            subFlow(PledgeAsset.Initiator(
                pledgeArgs.expiryTimeSecs,
                assetRef!!,
                pledgeArgs.deleteAssetStateCommand,
                pledgeArgs.recipientCert,
                pledgeArgs.localNetworkId,
                pledgeArgs.remoteNetworkId,
                pledgeArgs.issuer,
                pledgeArgs.observers
            ))
        })
    } catch (e: Exception) {
        println("Error pledging asset: ${e.message}\n")
        Left(Error("Failed to pledge asset: ${e.message}"))
    }
}

/**
 * The AssetTransferReclaim flow is used to reclaim an already pledged asset in the same local corda network.
 *
 * @property reclaimArgs The details of the asset being reclaimed in the export/source network.
 *                          Bleow properties are captured by this structure.
 *
 * pledgeId -- The unique identifier for the pledge of an asset for asset-transfer.
 * createAssetStateCommand -- The name of the command used to create an asset that's pledged earlier.
 * claimStatusLinearId -- The linearId that is used to fetch asset claim status
 * issuer -- The issuing authority of the pledged fungible asset.
 * observers -- The parties who are not transaction participants but only observers.
 */

@InitiatingFlow
@StartableByRPC
class AssetTransferReclaim
constructor(
    val reclaimArgs: AssetReclaimParameters
) : FlowLogic<Either<Error, SignedTransaction>>() {
    /**
     * The call() method captures the logic to reclaim an asset that is pledged earlier.
     *
     * @return Returns SignedTransaction.
     */
    @Suspendable
    override fun call(): Either<Error, SignedTransaction> = try {
        subFlow(ReclaimPledgedAsset.Initiator(
            reclaimArgs.pledgeId,
            reclaimArgs.createAssetStateCommand,
            reclaimArgs.claimStatusLinearId,
            reclaimArgs.issuer,
            reclaimArgs.observers
        ))
    } catch (e: Exception) {
        println("Error reclaiming: ${e.message}\n")
        Left(Error("Failed to reclaim: ${e.message}"))
    }
}

/**
 * The AssetTransferClaim flow is used to claim an asset (fungible/non-fungible) that is pledged in a remote network.
 *
 * @property claimArgs The details of the asset that is pledged in a remote network to be claimed as part of asset-transfer.
 *                          assetType, numUnits & recipient are captured by the "agreement" structure.
 *
 * pledgeId -- The unique identifier for the pledge of an asset for asset-transfer.
 * pledgeStatusLinearId -- The unique identifier to fetch pledge status (which was earlier obtained via interop query).
 * getAssetAndContractIdFlowName -- The name of the flow used to fetch the asset's State and ContractId from the vault.
 * assetType -- The type of the asset to be pledged.
 * assetIdOrQuantity -- The identifier of the non-fungible/bond asset or quantity of the fungible/token asset to be pledged.
 * createAssetStateCommand -- The name of the command used to create the claimed asset that's pledged earlier.
 * pledgerCert -- The certificate of the party in the export network who is the asset owner before transfer.
 * recipientCert -- The certificate of the party in the import network who will be the asset owner after transfer.
 * issuer -- The issuing authority of the pledged asset.
 * observers -- The parties who are not transaction participants but only observers.
 */

@InitiatingFlow
@StartableByRPC
class AssetTransferClaim
constructor(
    val claimArgs: AssetClaimParameters
) : FlowLogic<Either<Error, SignedTransaction>>() {
    /**
     * The call() method captures the logic to claim an asset that is pledged in a remote network.
     *
     * @return Returns SignedTransaction.
     */
    @Suspendable
    override fun call(): Either<Error, SignedTransaction> = try {

        val recipientCert: String = claimArgs.recipientCert
        if (recipientCert == "") {
            println("Error: recipient party cannot be empty: ${recipientCert}.")
            Left(Error("Error: Receipient party cannot be empty: ${recipientCert}."))
        }

        subFlow(ClaimRemoteAsset.Initiator(
            claimArgs.pledgeId,
            claimArgs.pledgeStatusLinearId,
            claimArgs.getAssetAndContractIdFlowName,
            claimArgs.assetType,
            claimArgs.assetIdOrQuantity,
            claimArgs.createAssetStateCommand,
            claimArgs.pledgerCert,
            recipientCert,
            claimArgs.issuer,
            claimArgs.observers
        ))
    } catch (e: Exception) {
        println("Error claiming remote asset: ${e.message}\n")
        Left(Error("Failed to claim remote asset: ${e.message}"))
    }
}