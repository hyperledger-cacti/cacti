/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.flows

import arrow.core.*
import co.paralleluniverse.fibers.Suspendable
import com.weaver.corda.app.interop.contracts.AssetExchangeHTLCStateContract
import com.weaver.corda.app.interop.states.AssetExchangeHTLCState
import com.weaver.corda.app.interop.states.AssetLockHTLCData
import com.weaver.corda.app.interop.states.AssetClaimHTLCData

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

    
/**
 * The LockAssetHTLCFlows flow is used to create a lock for an asset using HTLC.
 *
 * @property assetExchangeHTLCState The [AssetExchangeHTLCState] provided by the Corda client to create a lock.
 */
@InitiatingFlow
@StartableByRPC
class LockAsset
@JvmOverloads
constructor(
        val assetLock: AssetLocks.AssetLock,
        val agreement: AssetLocks.AssetExchangeAgreement,
        val getAssetFlowName: String,
        val assetStateDeleteCommand: CommandData,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [AssetExchangeHTLCState] state in the vault.
     *
     * It first creates a new AssetExchangeHTLCState. It then builds
     * and verifies the transaction, collects the required signatures,
     * and stores the state in the vault.
     *
     * @return Returns the contractId of the newly created [AssetExchangeHTLCState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {   
        if (assetLock.lockMechanism == AssetLocks.LockMechanism.HTLC) {
            val lockInfoHTLC = AssetLocks.AssetLockHTLC.parseFrom(
                Base64.getDecoder().decode(assetLock.lockInfo.toByteArray())
            )
            // 1. Create the LockInfo
            val expiryTime: Instant = when(lockInfoHTLC.timeSpec) {
                AssetLocks.TimeSpec.EPOCH -> Instant.ofEpochSecond(lockInfoHTLC.expiryTimeSecs)
                AssetLocks.TimeSpec.DURATION -> Instant.now().plusSeconds(lockInfoHTLC.expiryTimeSecs)
                else -> Instant.now().minusSeconds(10)
            }
            if (expiryTime.isBefore(Instant.now())) {
                Left(Error("Invalid Expiry Time or TimeSpec in lockInfo."))
            }
            val lockInfoData = AssetLockHTLCData(
                hashMechanism = lockInfoHTLC.hashMechanism,
                hash = OpaqueBytes(Base64.getDecoder().decode(lockInfoHTLC.hashBase64.toByteArray())),
                expiryTime = expiryTime
            )
            
            // Get AssetStateAndRef
            resolveStateAndRefFlow(getAssetFlowName,
                listOf(agreement.assetType, agreement.id)
            ).fold({
                println("Error: Unable to resolve Get Asset StateAndRef Flow.")
                Left(Error("Error: Unable to resolve Get Asset StateAndRef Flow"))
            }, {
                println("Resolved Get Asset flow to ${it}")
                val assetRef = subFlow(it)
                
                if (assetRef == null) {
                    println("Error: Unable to Get Asset StateAndRef for type: ${agreement.assetType} and id: ${agreement.id}.")
                    Left(Error("Error: Unable to Get Asset StateAndRef for type: ${agreement.assetType} and id: ${agreement.id}."))
                }
                
                // Resolve recipient name to party
                val recipientName: CordaX500Name = CordaX500Name.parse(agreement.recipient)
                val recipient = serviceHub.networkMapCache.getPeerByLegalName(recipientName)
                
                if (recipient == null) {
                    println("Error: Unable to find recipient party: ${agreement.recipient}.")
                    Left(Error("Error: Unable to find recipient party: ${agreement.recipient}."))
                }
                
                subFlow(LockAssetHTLC.Initiator(
                    lockInfoData, 
                    assetRef!!,
                    assetStateDeleteCommand,
                    recipient!!,
                    issuer,
                    observers
                ))
            })
            
        } else {
            println("Lock Mechanism not supported.")
            Left(Error("Lock Mechanism not supported."))
        }
    } catch (e: Exception) {
        println("Error locking asset: ${e.message}\n")
        Left(Error("Failed to lock asset: ${e.message}"))
    }
}

/**
 * The LockAssetHTLCFlows flow is used to create a lock for an asset using HTLC.
 *
 * @property assetExchangeHTLCState The [AssetExchangeHTLCState] provided by the Corda client to create a lock.
 */
@InitiatingFlow
@StartableByRPC
class LockFungibleAsset
@JvmOverloads
constructor(
        val assetLock: AssetLocks.AssetLock,
        val agreement: AssetLocks.FungibleAssetExchangeAgreement,
        val getAssetFlowName: String,
        val assetStateDeleteCommand: CommandData,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, UniqueIdentifier>>() {
    /**
     * The call() method captures the logic to create a new [AssetExchangeHTLCState] state in the vault.
     *
     * It first creates a new AssetExchangeHTLCState. It then builds
     * and verifies the transaction, collects the required signatures,
     * and stores the state in the vault.
     *
     * @return Returns the contractId of the newly created [AssetExchangeHTLCState].
     */
    @Suspendable
    override fun call(): Either<Error, UniqueIdentifier> = try {   
        if (assetLock.lockMechanism == AssetLocks.LockMechanism.HTLC) {
            val lockInfoHTLC = AssetLocks.AssetLockHTLC.parseFrom(
                Base64.getDecoder().decode(assetLock.lockInfo.toByteArray())
            )
            // 1. Create the LockInfo
            val expiryTime: Instant = when(lockInfoHTLC.timeSpec) {
                AssetLocks.TimeSpec.EPOCH -> Instant.ofEpochSecond(lockInfoHTLC.expiryTimeSecs)
                AssetLocks.TimeSpec.DURATION -> Instant.now().plusSeconds(lockInfoHTLC.expiryTimeSecs)
                else -> Instant.now().minusSeconds(10)
            }
            if (expiryTime.isBefore(Instant.now())) {
                Left(Error("Invalid Expiry Time or TimeSpec in lockInfo."))
            }
            val lockInfoData = AssetLockHTLCData(
                hashMechanism = lockInfoHTLC.hashMechanism,
                hash = OpaqueBytes(Base64.getDecoder().decode(lockInfoHTLC.hashBase64.toByteArray())),
                expiryTime = expiryTime
            )
            
            // Get AssetStateAndRef
            resolveStateAndRefFlow(getAssetFlowName,
                listOf(agreement.assetType, agreement.numUnits)
            ).fold({
                println("Error: Unable to resolve Get Asset StateAndRef Flow.")
                Left(Error("Error: Unable to resolve Get Asset StateAndRef Flow"))
            }, {
                println("Resolved Get Asset flow to ${it}")
                val assetRef = subFlow(it)
                
                if (assetRef == null) {
                    println("Error: Unable to Get Asset StateAndRef for type: ${agreement.assetType} and id: ${agreement.numUnits}.")
                    Left(Error("Error: Unable to Get Asset StateAndRef for type: ${agreement.assetType} and id: ${agreement.numUnits}."))
                }
                
                // Resolve recipient name to party
                val recipientName: CordaX500Name = CordaX500Name.parse(agreement.recipient)
                val recipient = serviceHub.networkMapCache.getPeerByLegalName(recipientName)
                
                if (recipient == null) {
                    println("Error: Unable to find recipient party: ${agreement.recipient}.")
                    Left(Error("Error: Unable to find recipient party: ${agreement.recipient}."))
                }
                
                subFlow(LockAssetHTLC.Initiator(
                    lockInfoData, 
                    assetRef!!,
                    assetStateDeleteCommand,
                    recipient!!,
                    issuer,
                    observers
                ))
            })
            
        } else {
            println("Lock Mechanism not supported.")
            Left(Error("Lock Mechanism not supported."))
        }
    } catch (e: Exception) {
        println("Error locking asset: ${e.message}\n")
        Left(Error("Failed to lock asset: ${e.message}"))
    }
}

/**
 * The ClaimAssetHTLC flow is used to claim a locked asset using HTLC.
 *
 * @property contractId The unique identifier for an AssetExchangeHTLCState.
 * @property assetClaim The [AssetLocks.AssetClaimHTLC] containing hash preImage.
 */

@InitiatingFlow
@StartableByRPC
class ClaimAsset
@JvmOverloads
constructor(
        val contractId: String,
        val assetClaim: AssetLocks.AssetClaim,
        val assetStateCreateCommand: CommandData,
        val updateOwnerFlow: String,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, SignedTransaction>>() {
    /**
     * The call() method captures the logic to claim the asset by revealing preimage.
     *
     * @return Returns SignedTransaction.
     */
    @Suspendable
    override fun call(): Either<Error, SignedTransaction> = try {
        if (assetClaim.lockMechanism == AssetLocks.LockMechanism.HTLC) {
            val claimInfoHTLC = AssetLocks.AssetClaimHTLC.parseFrom(
                Base64.getDecoder().decode(assetClaim.claimInfo.toByteArray())
            )
            val claimInfoData = AssetClaimHTLCData(
                hashMechanism = claimInfoHTLC.hashMechanism,
                hashPreimage = OpaqueBytes(Base64.getDecoder().decode(claimInfoHTLC.hashPreimageBase64.toByteArray()))
            )
            subFlow(ClaimAssetHTLC.Initiator(
                contractId,
                claimInfoData,
                assetStateCreateCommand,
                updateOwnerFlow,
                issuer,
                observers
            ))
        } else {
            println("Lock Mechanism not supported.")
            Left(Error("Lock Mechanism not supported."))
        }
    } catch (e: Exception) {
        println("Error claiming: ${e.message}\n")
        Left(Error("Failed to claim: ${e.message}"))
    }   
}

/**
 * The UnlockAssetHTLC flow is used to unlock a locked asset using HTLC.
 *
 * @property contractId The unique identifier for an AssetExchangeHTLCState.
 */

@InitiatingFlow
@StartableByRPC
class UnlockAsset
@JvmOverloads
constructor(
        val contractId: String,
        val assetStateCreateCommand: CommandData,
        val issuer: Party,
        val observers: List<Party> = listOf<Party>()
) : FlowLogic<Either<Error, SignedTransaction>>() {
    /**
     * The call() method captures the logic to unlock an asset.
     *
     * @return Returns SignedTransaction.
     */
    @Suspendable
    override fun call(): Either<Error, SignedTransaction> = try {
        subFlow(UnlockAssetHTLC.Initiator(
            contractId,
            assetStateCreateCommand,
            issuer,
            observers
        ))
    } catch (e: Exception) {
        println("Error unlocking: ${e.message}\n")
        Left(Error("Failed to unlock: ${e.message}"))
    }
}

/**
 * The resolveStateAndRefFlow function uses reflection to construct an instance of FlowLogic from the given
 * flow name and arguments.
 *
 * @param flowName The name of the flow provided by the remote client.
 * @param flowArgs The list of arguments for the flow provided by the remote client.
 * @return Returns an Either with an instance of FlowLogic if it was resolvable, or an Error.
 */
@Suppress("UNCHECKED_CAST")
fun resolveStateAndRefFlow(flowName: String, flowArgs: List<Any>): Either<Error, FlowLogic<StateAndRef<ContractState>?>> = try {
    println("Attempting to resolve $flowName to a Corda flow.")
    val kotlinClass = Class.forName(flowName).kotlin
    val ctor = kotlinClass.constructors.first()
    if (ctor.parameters.size != flowArgs.size) {
        println("Flow Resolution Error: wrong number of arguments supplied.\n")
        Left(Error("Flow Resolution Error: wrong number of arguments supplied"))
    } else {
        try {
            Right(ctor.call(*flowArgs.toTypedArray()) as FlowLogic<StateAndRef<ContractState>?>)
        } catch (e: Exception) {
            println("Flow Resolution Error: $flowName not a flow: ${e.message}.\n")
            Left(Error("Flow Resolution Error: $flowName not a flow"))
        }
    }
} catch (e: Exception) {
    println("Flow Resolution Error: ${e.message} \n")
    Left(Error("Flow Resolution Error: ${e.message}"))
}
