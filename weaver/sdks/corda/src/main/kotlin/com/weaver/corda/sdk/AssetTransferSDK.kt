/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.sdk;

import arrow.core.Either
import arrow.core.Left
import arrow.core.Right
import org.slf4j.LoggerFactory

import net.corda.core.messaging.CordaRPCOps
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.StateAndRef
import net.corda.core.messaging.startFlow
import net.corda.core.transactions.SignedTransaction
import net.corda.core.identity.Party
import java.lang.Exception
import java.util.*
import com.google.protobuf.ByteString
import com.weaver.corda.app.interop.flows.*
import com.weaver.corda.app.interop.states.AssetPledgeState
import com.weaver.corda.app.interop.states.AssetPledgeParameters
import com.weaver.corda.app.interop.states.AssetClaimParameters
import com.weaver.corda.app.interop.states.AssetReclaimParameters

import com.weaver.protos.common.asset_transfer.AssetTransfer

class AssetTransferSDK {
    companion object {
        private val logger = LoggerFactory.getLogger(AssetTransferSDK::class.java)

        @JvmStatic
        @JvmOverloads fun createFungibleAssetPledge(
            proxy: CordaRPCOps,
            localNetworkId: String,
            remoteNetworkId: String,
            tokenType: String,
            numUnits: Long,
            recipientCert: String,
            expiryTimeSecs: Long,
            getAssetStateAndRefFlow: String,
            deleteAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            return try {
                AssetTransferSDK.logger.debug("Sending fungible asset pledge request to Corda as part of asset-transfer.\n")
                val pledgeId = runCatching {
                    val pledgeArgs: AssetPledgeParameters = AssetPledgeParameters(
                        tokenType, // @property assetType
                        numUnits, // @property assetIdOrQuantity
                        localNetworkId, // @property localNetworkId
                        remoteNetworkId, // @property remoteNetworkId
                        recipientCert, // @property recipientCert
                        expiryTimeSecs, // @property expiryTimeSecs
                        getAssetStateAndRefFlow, // @property getAssetStateAndRefFlow
                        deleteAssetStateCommand, // @property deleteAssetStateCommand
                        issuer, // @property issuer
                        observers // @property observers
                    )
                    proxy.startFlow(::AssetTransferPledge, pledgeArgs).returnValue.get()
                }.fold({
                    it.map { linearId ->
                        AssetTransferSDK.logger.debug("Pledge of fungible asset was successful and the state was stored with linearId $linearId.\n")
                        linearId.toString()
                    }
                }, {
                        Left(Error("Corda Network Error: Error running AssetTransferPledgeFungible flow: ${it.message}\n"))
                })
                pledgeId
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error pledging fungible asset in Corda network: ${e.message}\n")
                Left(Error("Error pledging fungible asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        @JvmOverloads fun createAssetPledge(
            proxy: CordaRPCOps,
            localNetworkId: String,
            remoteNetworkId: String,
            assetType: String,
            assetId: String,
            recipientCert: String,
            expiryTimeSecs: Long,
            getAssetStateAndRefFlow: String,
            deleteAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            return try {
                AssetTransferSDK.logger.debug("Sending fungible asset pledge request to Corda as part of asset-transfer.\n")
                val contractId = runCatching {
                    val pledgeArgs: AssetPledgeParameters = AssetPledgeParameters(
                        assetType, // @property assetType
                        assetId, // @property assetIdOrQuantity
                        localNetworkId, // @property localNetworkId
                        remoteNetworkId, // @property remoteNetworkId
                        recipientCert, // @property recipientCert
                        expiryTimeSecs, // @property expiryTimeSecs
                        getAssetStateAndRefFlow, // @property getAssetStateAndRefFlow
                        deleteAssetStateCommand, // @property deleteAssetStateCommand
                        issuer, // @property issuer
                        observers // @property observers
                    )
                    proxy.startFlow(::AssetTransferPledge, pledgeArgs).returnValue.get()
                }.fold({
                    it.map { linearId ->
                        AssetTransferSDK.logger.debug("Pledge of fungible asset was successful and the state was stored with linearId $linearId.\n")
                        linearId.toString()
                    }
                }, {
                    Left(Error("Corda Network Error: Error running AssetTransferPledge flow: ${it.message}\n"))
                })
                contractId
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error pledging fungible asset in Corda network: ${e.message}\n")
                Left(Error("Error pledging fungible asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun getAssetPledgeStatus(
            proxy: CordaRPCOps,
            pledgeId: String,
            importNetworkId: String
        ): Either<Error, AssetPledgeState> {
            return try {
                AssetTransferSDK.logger.debug("Sending get-asset-pledge-status request to Corda as part of asset-transfer.\n")
                val assetPledgeState: AssetPledgeState = proxy.startFlow(::GetAssetPledgeStatus, pledgeId, importNetworkId)
                                                            .returnValue.get()
                if (assetPledgeState.lockerCert.equals("")) {
                    throw IllegalStateException("Error: not a valid pledgeId $pledgeId")
                } else if (!assetPledgeState.remoteNetworkId.equals(importNetworkId)) {
                    throw IllegalStateException("Invalid argument --import-network-id $importNetworkId")
                }
                Right(assetPledgeState)
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error getting pledge status in Corda network: ${e.message}\n")
                Left(Error("Error getting pledge status in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun reclaimPledgedAsset(
            proxy: CordaRPCOps,
            pledgeId: String,
            createAssetStateCommand: CommandData,
            claimStatusLinearId: String,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, SignedTransaction> {
            return try {
                AssetTransferSDK.logger.debug("Sending asset-reclaim request to Corda as part of asset-transfer.\n")
                val signedTx = runCatching {

                    val reclaimArgs: AssetReclaimParameters = AssetReclaimParameters(
                        pledgeId, // @property pledgeId
                        createAssetStateCommand, // @property createAssetStateCommand
                        claimStatusLinearId, // @property claimStatusLinearId
                        issuer, // @property issuer
                        observers // @property observers
                    )

                    proxy.startFlow(::AssetTransferReclaim, reclaimArgs).returnValue.get()
                }.fold({
                    it.map { retSignedTx ->
                        AssetTransferSDK.logger.debug("Reclaim of pledged asset was successful.\n")
                        retSignedTx
                    }
                }, {
                    Left(Error("Corda Network Error: Error running AssetTransferReclaim flow: ${it.message}\n"))
                })
                signedTx
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error reclaiming asset in Corda network: ${e.message}\n")
                Left(Error("Error reclaiming asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun claimPledgedFungibleAsset(
            proxy: CordaRPCOps,
            pledgeId: String,
            pledgeStatusLinearId: String,
            tokenType: String,
            numUnits: Long,
            pledgerCert: String,
            recipientCert: String,
            getAssetAndContractIdFlowName: String,
            createAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, SignedTransaction> {
            return try {
                AssetTransferSDK.logger.debug("Sending asset-claim request to Corda as part of asset-transfer.\n")
                val signedTx = runCatching {

                    val claimArgs: AssetClaimParameters = AssetClaimParameters(
                        pledgeId, // @property pledgeId
                        createAssetStateCommand, // @property createAssetStateCommand
                        pledgeStatusLinearId, // @property pledgeStatusLinearId
                        getAssetAndContractIdFlowName, // @property getAssetAndContractIdFlowName
                        tokenType, // @property assetType
                        numUnits, // @property assetIdOrQuantity
                        pledgerCert, // @property pledgerCert
                        recipientCert, // @property recipientCert
                        issuer, // @property issuer
                        observers // @property observers
                    )

                    proxy.startFlow(::AssetTransferClaim, claimArgs).returnValue.get()
                }.fold({
                    it.map { retSignedTx ->
                        AssetTransferSDK.logger.debug("Claim of remote asset was successful.\n")
                        retSignedTx
                    }
                }, {
                    Left(Error("Corda Network Error: Error running AssetTransferClaim flow: ${it.message}\n"))
                })
                signedTx
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error claiming remote asset in Corda network: ${e.message}\n")
                Left(Error("Error claiming remote asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun claimPledgedAsset(
            proxy: CordaRPCOps,
            pledgeId: String,
            pledgeStatusLinearId: String,
            assetType: String,
            assetId: String,
            pledgerCert: String,
            recipientCert: String,
            getAssetAndContractIdFlowName: String,
            createAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, SignedTransaction> {
            return try {
                AssetTransferSDK.logger.debug("Sending asset-claim request to Corda as part of asset-transfer.\n")
                val signedTx = runCatching {

                    val claimArgs: AssetClaimParameters = AssetClaimParameters(
                        pledgeId, // @property pledgeId
                        createAssetStateCommand, // @property createAssetStateCommand
                        pledgeStatusLinearId, // @property pledgeStatusLinearId
                        getAssetAndContractIdFlowName, // @property getAssetAndContractIdFlowName
                        assetType, // @property assetType
                        assetId, // @property assetIdOrQuantity
                        pledgerCert, // @property pledgerCert
                        recipientCert, // @property recipientCert
                        issuer, // @property issuer
                        observers // @property observers
                    )

                    proxy.startFlow(::AssetTransferClaim, claimArgs).returnValue.get()
                }.fold({
                    it.map { retSignedTx ->
                        AssetTransferSDK.logger.debug("Claim of remote asset was successful.\n")
                        retSignedTx
                    }
                }, {
                    Left(Error("Corda Network Error: Error running AssetTransferClaim flow: ${it.message}\n"))
                })
                signedTx
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error claiming remote asset in Corda network: ${e.message}\n")
                Left(Error("Error claiming remote asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun isAssetPledgedForTransfer(
            proxy: CordaRPCOps,
            pledgeId: String
        ): Boolean {
            return try {
                AssetTransferSDK.logger.debug("Querying if asset is pledged in Corda as part of asset-transfer.\n")
                val isAssetPledged = proxy.startFlow(::IsAssetPledged, pledgeId)
                    .returnValue.get()
                isAssetPledged
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error querying asset pledge state for transfer in Corda network: ${e.message}\n")
                false
            }
        }

        @JvmStatic
        fun readPledgeStateByPledgeId(
            proxy: CordaRPCOps,
            pledgeId: String
        ): Either<Error, StateAndRef<AssetPledgeState>> {
            return try {
                AssetTransferSDK.logger.debug("Querying asset pledge state for transfer from Corda as part of asset-transfer.\n")
                val obj = proxy.startFlow(::GetAssetPledgeStateById, pledgeId)
                        .returnValue.get()
                if (obj == null) {
                    Left(Error("Asset pledge state is not avalible on the Corda network."))
                } else {
                    Right(obj)
                }
            } catch (e: Exception) {
                AssetTransferSDK.logger.error("Error querying asset pledge state from Corda network: ${e.message}\n")
                Left(Error("Error querying asset pledge state from Corda network: ${e.message}"))
            }
        }

        fun createAssetTransferAgreement(
            assetDetails: ByteString,
            localNetworkID: String,
            remoteNetworkID: String,
            recipient: String,
            expiryTimeSecs: Long): AssetTransfer.AssetPledge {

                val assetPledge = AssetTransfer.AssetPledge.newBuilder()
                    .setAssetDetails(assetDetails)
                    .setLocalNetworkID(localNetworkID)
                    .setRemoteNetworkID(remoteNetworkID)
                    .setRecipient(recipient)
                    .setExpiryTimeSecs(expiryTimeSecs)
                    .build()

                return assetPledge
        }
        
    }
}
