/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.sdk;

import arrow.core.Either
import arrow.core.Left
import org.slf4j.LoggerFactory

import net.corda.core.messaging.CordaRPCOps
import net.corda.core.contracts.CommandData
import net.corda.core.contracts.StateAndRef
import net.corda.core.messaging.startFlow
import net.corda.core.transactions.SignedTransaction
import java.lang.Exception
import java.util.*
import com.google.protobuf.ByteString
import com.weaver.corda.app.interop.flows.*
import com.weaver.corda.app.interop.states.AssetExchangeHTLCState

import com.weaver.protos.common.asset_locks.AssetLocks

class AssetManager {
    companion object {
        private val logger = LoggerFactory.getLogger(AssetManager::class.java)

        @JvmStatic
        fun createFungibleHTLC(
            proxy: CordaRPCOps,
            tokenType: String,
            numUnits: Long,
            recipientParty: String,
	        hashBase64: String,
            expiryTimeSecs: Long,
            getAssetStateAndRefFlow: String,
            deleteAssetStateCommand: CommandData
        ): Either<Error, String> {
            return try {
                AssetManager.logger.debug("Sending asset-lock request to Corda as part of asset-exchange.\n")
                val contractId = runCatching {
                    
                    val assetAgreement = createFungibleAssetExchangeAgreement(tokenType, numUnits, recipientParty, "")
                    val lockInfo = createAssetLockInfo(hashBase64, expiryTimeSecs)

                    proxy.startFlow(::LockFungibleAsset, lockInfo, assetAgreement, getAssetStateAndRefFlow, deleteAssetStateCommand)
                        .returnValue.get()
                }.fold({
                    it.map { linearId ->
                        AssetManager.logger.debug("Locking asset was successful and the state was stored with linearId $linearId.\n")
                        linearId.toString()
                    }
                }, {
                    Left(Error("Corda Network Error: Error running LockFungibleAsset flow: ${it.message}\n"))
                })
                contractId
            } catch (e: Exception) {
                AssetManager.logger.error("Error locking asset in Corda network: ${e.message}\n")
                Left(Error("Error locking asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun claimAssetInHTLC(
            proxy: CordaRPCOps,
            contractId: net.corda.core.contracts.UniqueIdentifier,
            hashPreimage: String,
            createAssetStateCommand: CommandData,
            assetStateContractId: String,
            updateAssetStateOwnerFlow: String
        ): Either<Error, SignedTransaction> {
            return try {
                AssetManager.logger.debug("Sending asset-claim request to Corda as part of asset-exchange.\n")
                val signedTx = runCatching {
                    
                    val claimInfo: AssetLocks.AssetClaim = createAssetClaimInfo(hashPreimage)

                    proxy.startFlow(::ClaimAsset, contractId, claimInfo, createAssetStateCommand, assetStateContractId, updateAssetStateOwnerFlow)
                        .returnValue.get()
                }.fold({
                    it.map { retSignedTx ->
                        AssetManager.logger.debug("Claim asset was successful.\n")
                        retSignedTx
                    }
                }, {
                    Left(Error("Corda Network Error: Error running ClaimAsset flow: ${it.message}\n"))
                })
                signedTx
            } catch (e: Exception) {
                AssetManager.logger.error("Error claiming asset in Corda network: ${e.message}\n")
                Left(Error("Error claiming asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun reclaimAssetInHTLC(
            proxy: CordaRPCOps,
            contractId: net.corda.core.contracts.UniqueIdentifier,
            createAssetStateCommand: CommandData,
            assetStateContractId: String
        ): Either<Error, SignedTransaction> {
            return try {
                AssetManager.logger.debug("Sending asset-unlock request to Corda as part of asset-exchange.\n")
                val signedTx = runCatching {
                    
                    proxy.startFlow(::UnlockAsset, contractId, createAssetStateCommand, assetStateContractId)
                        .returnValue.get()
                }.fold({
                    it.map { retSignedTx ->
                        AssetManager.logger.debug("Claim asset was successful.\n")
                        retSignedTx
                    }
                }, {
                    Left(Error("Corda Network Error: Error running UnlockAsset flow: ${it.message}\n"))
                })
                signedTx
            } catch (e: Exception) {
                AssetManager.logger.error("Error unlocking asset in Corda network: ${e.message}\n")
                Left(Error("Error unlocking asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        fun isAssetLockedInHTLC(
            proxy: CordaRPCOps,
            contractId: net.corda.core.contracts.UniqueIdentifier
        ): Boolean {
            return try {
                AssetManager.logger.debug("Querying if asset is locked in Corda as part of asset-exchange.\n")
                val isLocked = proxy.startFlow(::IsAssetLockedHTLC, contractId)
                        .returnValue.get()
                isLocked
            } catch (e: Exception) {
                AssetManager.logger.error("Error querying asset lock state in Corda network: ${e.message}\n")
                false
            }
        }

        @JvmStatic
        fun readHTLCStateByContractId(
            proxy: CordaRPCOps,
            contractId: net.corda.core.contracts.UniqueIdentifier
        ): Either<Error, StateAndRef<AssetExchangeHTLCState>> {
            return try {
                AssetManager.logger.debug("Querying asset-lock HTLC state from Corda as part of asset-exchange.\n")
                val obj = runCatching {
                    
                    proxy.startFlow(::GetAssetExchangeHTLCStateById, contractId)
                        .returnValue.get()
                }.fold({
                    it.map { retObj ->
                        AssetManager.logger.debug("Querying HTLC state was successful.\n")
                        retObj
                    }
                }, {
                    Left(Error("Corda Network Error: Error in GetAssetExchangeHTLCStateById flow: ${it.message}\n"))
                })
                obj
            } catch (e: Exception) {
                AssetManager.logger.error("Error querying HTLC state from Corda network: ${e.message}\n")
                Left(Error("Error querying HTLC state from Corda network: ${e.message}"))
            }
        }

        fun createFungibleAssetExchangeAgreement(
            tokenType: String,
            numUnits: Long,
            recipient: String,
            locker: String): AssetLocks.FungibleAssetExchangeAgreement {
            
                val assetAgreement = AssetLocks.FungibleAssetExchangeAgreement.newBuilder()
                    .setType(tokenType)
                    .setNumUnits(numUnits)
                    .setLocker(locker)
                    .setRecipient(recipient)
                    .build()

                return assetAgreement
        }

        fun createAssetLockInfo(
            hashBase64: String,
            expiryTimeSecs: Long): AssetLocks.AssetLock {
	        
            val lockInfoHTLC = AssetLocks.AssetLockHTLC.newBuilder()
                .setHashBase64(ByteString.copyFrom(hashBase64.toByteArray()))
                .setExpiryTimeSecs(expiryTimeSecs)
                .build()

            val lockInfo = AssetLocks.AssetLock.newBuilder()
                .setLockMechanism(AssetLocks.LockMechanism.HTLC)
                .setLockInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(lockInfoHTLC.toByteArray()).toByteArray()))
                .build()

            return lockInfo
        }

        fun createAssetClaimInfo(
            hashPreimageBase64: String): AssetLocks.AssetClaim {
	        
            val claimInfoHTLC = AssetLocks.AssetClaimHTLC.newBuilder()
                .setHashPreimageBase64(ByteString.copyFrom(hashPreimageBase64.toByteArray()))
                .build()

            val claimInfo = AssetLocks.AssetClaim.newBuilder()
                .setLockMechanism(AssetLocks.LockMechanism.HTLC)
                .setClaimInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(claimInfoHTLC.toByteArray()).toByteArray()))
                .build()

            return claimInfo    
        }
    }
}
