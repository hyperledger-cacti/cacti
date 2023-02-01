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
import com.weaver.corda.app.interop.states.AssetExchangeHTLCState

import com.weaver.protos.common.asset_locks.AssetLocks

class AssetManager {
    companion object {
        private val logger = LoggerFactory.getLogger(AssetManager::class.java)

        @JvmStatic
        @JvmOverloads fun createHTLC(
            proxy: CordaRPCOps,
            assetType: String,
            assetId: String,
            recipientParty: String,
            hash: HashFunctions.Hash,
            expiryTimeSecs: Long,
            timeSpec: Int,
            getAssetStateAndRefFlow: String,
            deleteAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            return try {
                AssetManager.logger.debug("Sending asset-lock request to Corda as part of asset-exchange.\n")

                val result = runCatching {
                    val assetAgreement = createAssetExchangeAgreement(assetType, assetId, recipientParty, "")
                    val lockInfo = createAssetLockInfo(hash, timeSpec, expiryTimeSecs)

                    proxy.startFlow(::LockAsset, lockInfo, assetAgreement, getAssetStateAndRefFlow, deleteAssetStateCommand, issuer, observers)
                        .returnValue.get()
                }.fold({
                    it.map { linearId ->
                        AssetManager.logger.debug("Locking asset was successful and the state was stored with linearId $linearId.\n")
                        linearId.toString()
                    }
                }, {
                    Left(Error("Corda Network Error: Error running LockAsset flow: ${it.message}\n"))
                })
                result
            } catch (e: Exception) {
                AssetManager.logger.error("Error locking asset in Corda network: ${e.message}\n")
                Left(Error("Error locking asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        @JvmOverloads fun createFungibleHTLC(
            proxy: CordaRPCOps,
            tokenType: String,
            numUnits: Long,
            recipientParty: String,
            hash: HashFunctions.Hash,
            expiryTimeSecs: Long,
            timeSpec: Int,
            getAssetStateAndRefFlow: String,
            deleteAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, String> {
            return try {
                AssetManager.logger.debug("Sending fungible asset-lock request to Corda as part of asset-exchange.\n")
                val result = runCatching {
                    
                    val assetAgreement = createFungibleAssetExchangeAgreement(tokenType, numUnits, recipientParty, "")
                    val lockInfo = createAssetLockInfo(hash, timeSpec, expiryTimeSecs)

                    proxy.startFlow(::LockFungibleAsset, lockInfo, assetAgreement, getAssetStateAndRefFlow, deleteAssetStateCommand, issuer, observers)
                        .returnValue.get()
                }.fold({
                    it.map { linearId ->
                        AssetManager.logger.debug("Locking fungible asset was successful and the state was stored with linearId $linearId.\n")
                        linearId.toString()
                    }
                }, {
                    Left(Error("Corda Network Error: Error running LockFungibleAsset flow: ${it.message}\n"))
                })
                result
            } catch (e: Exception) {
                AssetManager.logger.error("Error locking fungible asset in Corda network: ${e.message}\n")
                Left(Error("Error locking fungible asset in Corda network: ${e.message}"))
            }
        }

        @JvmStatic
        @JvmOverloads fun claimAssetInHTLC(
            proxy: CordaRPCOps,
            contractId: String,
            hash: HashFunctions.Hash,
            createAssetStateCommand: CommandData,
            updateAssetStateOwnerFlow: String,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, SignedTransaction> {
            return try {
                AssetManager.logger.debug("Sending asset-claim request to Corda as part of asset-exchange.\n")
                if (hash.getPreimage() == null) {
                    Left(Error("Error: Preimage can not be null for claim"))
                }
                val signedTx = runCatching {
                    
                    val claimInfo: AssetLocks.AssetClaim = createAssetClaimInfo(hash)

                    proxy.startFlow(::ClaimAsset, contractId, claimInfo, createAssetStateCommand, updateAssetStateOwnerFlow, issuer, observers)
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
            contractId: String,
            createAssetStateCommand: CommandData,
            issuer: Party,
            observers: List<Party> = listOf<Party>()
        ): Either<Error, SignedTransaction> {
            return try {
                AssetManager.logger.debug("Sending asset-unlock request to Corda as part of asset-exchange.\n")
                val signedTx = runCatching {
                    
                    proxy.startFlow(::UnlockAsset, contractId, createAssetStateCommand, issuer, observers)
                        .returnValue.get()
                }.fold({
                    it.map { retSignedTx ->
                        AssetManager.logger.debug("Unlock asset was successful.\n")
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
            contractId: String
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
            contractId: String
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
        
        @JvmStatic
        fun getHTLCHashById(
            proxy: CordaRPCOps,
            contractId: String
        ): String? {
            try {
                AssetManager.logger.debug("Querying asset-lock HTLC Hash from Corda as part of asset-exchange.\n")
                val obj = proxy.startFlow(::GetAssetExchangeHTLCHashById, contractId)
                        .returnValue.get()
                return obj.toString(Charsets.UTF_8)
            } catch (e: Exception) {
                AssetManager.logger.error("Error querying HTLC Hash from Corda network: ${e.message}\n")
                return null
            }
        }
        
        @JvmStatic
        fun getHTLCHashPreImageById(
            proxy: CordaRPCOps,
            contractId: String
        ): String? {
            try {
                AssetManager.logger.debug("Querying asset-lock HTLC Hash PreImage from Corda as part of asset-exchange.\n")
                val obj = proxy.startFlow(::GetAssetExchangeHTLCHashPreImageById, contractId)
                        .returnValue.get()
                return obj.toString(Charsets.UTF_8)
            } catch (e: Exception) {
                AssetManager.logger.error("Error querying HTLC Hash PreImage from Corda network: ${e.message}\n")
                return null
            }
        }

        fun createAssetExchangeAgreement(
            assetType: String,
            assetId: String,
            recipient: String,
            locker: String): AssetLocks.AssetExchangeAgreement {

                val assetAgreement = AssetLocks.AssetExchangeAgreement.newBuilder()
                    .setAssetType(assetType)
                    .setId(assetId)
                    .setLocker(locker)
                    .setRecipient(recipient)
                    .build()

                return assetAgreement
        }

        fun createFungibleAssetExchangeAgreement(
            tokenType: String,
            numUnits: Long,
            recipient: String,
            locker: String): AssetLocks.FungibleAssetExchangeAgreement {
            
                val assetAgreement = AssetLocks.FungibleAssetExchangeAgreement.newBuilder()
                    .setAssetType(tokenType)
                    .setNumUnits(numUnits)
                    .setLocker(locker)
                    .setRecipient(recipient)
                    .build()

                return assetAgreement
        }

        fun createAssetLockInfo(
            hash: HashFunctions.Hash,
            timeSpec: Int,
            expiryTimeSecs: Long): AssetLocks.AssetLock {
	        
            val lockInfoHTLC = AssetLocks.AssetLockHTLC.newBuilder()
                .setHashMechanism(hash.HASH_MECHANISM)
                .setHashBase64(ByteString.copyFrom(hash.getSerializedHashBase64().toByteArray()))
                .setTimeSpecValue(timeSpec)
                .setExpiryTimeSecs(expiryTimeSecs)
                .build()

            val lockInfo = AssetLocks.AssetLock.newBuilder()
                .setLockMechanism(AssetLocks.LockMechanism.HTLC)
                .setLockInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(lockInfoHTLC.toByteArray()).toByteArray()))
                .build()

            return lockInfo
        }

        fun createAssetClaimInfo(
            hash: HashFunctions.Hash): AssetLocks.AssetClaim {
	        
            val claimInfoHTLC = AssetLocks.AssetClaimHTLC.newBuilder()
                .setHashMechanism(hash.HASH_MECHANISM)
                .setHashPreimageBase64(ByteString.copyFrom(hash.getSerializedPreimageBase64()!!.toByteArray()))
                .build()

            val claimInfo = AssetLocks.AssetClaim.newBuilder()
                .setLockMechanism(AssetLocks.LockMechanism.HTLC)
                .setClaimInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(claimInfoHTLC.toByteArray()).toByteArray()))
                .build()

            return claimInfo    
        }
    }
}
