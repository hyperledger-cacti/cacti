/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop

import arrow.core.Either
import com.weaver.corda.app.interop.flows.*
import com.weaver.corda.app.interop.states.AssetExchangeHTLCState
import com.weaver.corda.app.interop.states.AssetLockHTLCData
import com.weaver.corda.app.interop.states.AssetClaimHTLCData

import com.weaver.corda.app.interop.test.*

import com.weaver.protos.common.asset_locks.AssetLocks

import com.weaver.protos.common.query.QueryOuterClass
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.node.services.queryBy
import net.corda.core.utilities.getOrThrow
import net.corda.testing.node.*
import org.junit.AfterClass
import org.junit.BeforeClass
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.contracts.StateAndRef
import java.util.Base64
import java.time.Instant
import net.corda.core.utilities.OpaqueBytes
import com.google.protobuf.ByteString

import net.corda.core.contracts.TransactionState
import net.corda.core.contracts.StateRef
import net.corda.core.crypto.SecureHash

class AssetExchangeHTLCWrapperTests {
    companion object {
        lateinit var network: MockNetwork
        lateinit var partyA: StartedMockNode
        lateinit var partyB: StartedMockNode
        lateinit var partyC: StartedMockNode

        @BeforeClass
        @JvmStatic
        fun setup() {
            network = MockNetwork(MockNetworkParameters(cordappsForAllNodes = listOf(
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.contracts"),
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.flows"),
                    TestCordapp.findCordapp("com.weaver.corda.app.interop.test")
            )))
            partyA = network.createPartyNode()
            partyB = network.createPartyNode()
            partyC = network.createPartyNode()
            network.runNetwork()
        }

        @AfterClass
        @JvmStatic
        fun tearDown() {
            network.stopNodes()
            System.setProperty("net.corda.node.dbtransactionsresolver.InMemoryResolutionLimit", "0")
        }
    }
    
    val alice = partyA.info.legalIdentities.first()
    val bob = partyB.info.legalIdentities.first()
    val charlie = partyC.info.legalIdentities.first()
    val issuer = charlie
    
    val preimage = "secrettext"
    val hash = "ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs="
    
    val asset = AssetState(
        "a01",
        alice
    )
    val lockInfoHTLC = AssetLocks.AssetLockHTLC.newBuilder()
        .setHashMechanism(AssetLocks.HashMechanism.SHA256)
        .setHashBase64(ByteString.copyFrom(hash.toByteArray()))
        .setExpiryTimeSecs(10)
        .setTimeSpec(AssetLocks.TimeSpec.DURATION)
        .build()
        
    val lockInfo = AssetLocks.AssetLock.newBuilder()
        .setLockMechanism(AssetLocks.LockMechanism.HTLC)
        .setLockInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(lockInfoHTLC.toByteArray()).toByteArray()))
        .build()
        
    val claimInfoHTLC = AssetLocks.AssetClaimHTLC.newBuilder()
        .setHashMechanism(AssetLocks.HashMechanism.SHA256)
        .setHashPreimageBase64(ByteString.copyFrom(Base64.getEncoder().encodeToString(preimage.toByteArray()).toByteArray()))
        .build()
        
    val claimInfo = AssetLocks.AssetClaim.newBuilder()
        .setLockMechanism(AssetLocks.LockMechanism.HTLC)
        .setClaimInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(claimInfoHTLC.toByteArray()).toByteArray()))
        .build()
        
    val assetExchangeAgreement = AssetLocks.AssetExchangeAgreement.newBuilder()
        .setAssetType("Asset")
        .setId("a01")
        .setLocker("")
        .setRecipient(bob.nameOrNull().toString())
        .build()
    
    fun createAssetTx(id: String): StateAndRef<AssetState> {
        val tmp = partyA.startFlow(CreateAsset(id, alice))
        network.runNetwork()
        return tmp.getOrThrow()
    }
    
    val getAssetFlow = "com.weaver.corda.app.interop.test.GetAssetRef"
    val updateOwnerFlow = "com.weaver.corda.app.interop.test.UpdateOwnerFlow"
    
    
    @Test
    fun `LockAsset tests`() {        
        val assetStateRef = createAssetTx("lock01")
        assertEquals(alice, assetStateRef.state.data.owner)

        // UnHappy case: Third party trying to lock asset of alice.
        val failAssetExchangeAgreement = AssetLocks.AssetExchangeAgreement.newBuilder()
            .setAssetType("Asset")
            .setId("lock01")
            .setLocker("")
            .setRecipient(charlie.nameOrNull().toString())
            .build()
        val futureFail = partyB.startFlow(LockAsset(
            lockInfo,
            failAssetExchangeAgreement,
            getAssetFlow,
            AssetStateContract.Commands.Delete(),
            issuer
        ))
        network.runNetwork()
        val linearIdFail = futureFail.getOrThrow()
        assert(linearIdFail.isLeft()) { "Can not lock someone else's asset" }
        
        // Happy case.
        val assetExchangeAgreementLock = AssetLocks.AssetExchangeAgreement.newBuilder()
            .setAssetType("Asset")
            .setId("lock01")
            .setLocker("")
            .setRecipient(bob.nameOrNull().toString())
            .build()
        
        val future = partyA.startFlow(LockAsset(
            lockInfo,
            assetExchangeAgreementLock,
            getAssetFlow,
            AssetStateContract.Commands.Delete(),
            issuer
        ))
        network.runNetwork()
        val linearId = future.getOrThrow()
        assert(linearId.isRight()) { "LockAssetHTLCInitiator should return a Right(UniqueIdentifier)" }

        linearId.fold({ println("Error") },{
            val states = partyA.services.vaultService
                    .queryBy<AssetExchangeHTLCState>(
                        QueryCriteria.LinearStateQueryCriteria(linearId = listOf(it))
                    ).states
            println(states.single().toString())
            assertEquals(1, states.size)
            val state = states.single().state.data
            assertEquals(alice, state.locker)
            assertEquals(bob, state.recipient)
        })
        

        // Unhappy case: asset is already locked
        val futureTwo = partyA.startFlow(LockAsset(
            lockInfo,
            assetExchangeAgreementLock,
            getAssetFlow,
            AssetStateContract.Commands.Delete(),
            issuer
        ))
        network.runNetwork()
        val error = futureTwo.getOrThrow()
        assert(error.isLeft()) { "Can not lock/consume locked asset again." }
    }
    
    @Test
    fun `ClaimAssetHTLC tests`() {
        var lockId: String = ""
        
        // Happy case.
        lockAsset().map{ id ->
            lockId = id.toString()
        }
        val future = partyB.startFlow(ClaimAsset(
            lockId,
            claimInfo,
            AssetStateContract.Commands.Issue(),
            updateOwnerFlow,
            issuer
        ))
        network.runNetwork()
        val stx = future.getOrThrow()
        assert(stx.isRight()) { "ClaimAsset should be successfull" }

        stx.fold({ println("Error") },{
            val states = partyB.services.vaultService
                .queryBy<AssetState>().states
                .filter { it.state.data.id == "a01" }
                .map { it.state.data }
            println(states.single().toString())
            assertEquals(1, states.size)
            assertEquals("a01", states.single().id)
            assertEquals(bob, states.single().owner)
        })
    }
    
    @Test
    fun `ClaimAssetHTLC Fail tests`() {
        var lockId: String = ""
        
        // Unhappy case: Claim after timeout
        lockAsset().map{ id ->
            lockId = id.toString()
        }
        
        val wrongClaimInfoHTLC = AssetLocks.AssetClaimHTLC.newBuilder()
            .setHashMechanism(AssetLocks.HashMechanism.SHA256)
            .setHashPreimageBase64(ByteString.copyFrom(Base64.getEncoder().encodeToString("wrongsecret".toByteArray()).toByteArray()))
            .build()
        val wrongClaimInfo = AssetLocks.AssetClaim.newBuilder()
            .setLockMechanism(AssetLocks.LockMechanism.HTLC)
            .setClaimInfo(ByteString.copyFrom(Base64.getEncoder().encodeToString(wrongClaimInfoHTLC.toByteArray()).toByteArray()))
            .build()
        val futureOne = partyB.startFlow(ClaimAsset(
            lockId,
            wrongClaimInfo,
            AssetStateContract.Commands.Issue(),
            updateOwnerFlow,
            issuer
        ))
        network.runNetwork()
        val stxOne = futureOne.getOrThrow()
        assert(stxOne.isLeft()) { "ClaimAsset should be unsuccessfull as preimage is not correct" }
        
        val futureTwo = partyA.startFlow(ClaimAsset(
            lockId,
            claimInfo,
            AssetStateContract.Commands.Issue(),
            updateOwnerFlow,
            issuer
        ))
        network.runNetwork()
        val stxTwo = futureTwo.getOrThrow()
        assert(stxTwo.isLeft()) { "ClaimAsset should be unsuccessfull as only recipient can claim" }
        
        val futureTwo2 = partyC.startFlow(ClaimAsset(
            lockId,
            claimInfo,
            AssetStateContract.Commands.Issue(),
            updateOwnerFlow,
            issuer
        ))
        network.runNetwork()
        val stxTwo2 = futureTwo2.getOrThrow()
        assert(stxTwo2.isLeft()) { "ClaimAsset should be unsuccessfull as only recipient can claim" }
        
        Thread.sleep(10000L)
        
        val futureThree = partyB.startFlow(ClaimAsset(
            lockId,
            claimInfo,
            AssetStateContract.Commands.Issue(),
            updateOwnerFlow,
            issuer
        ))
        network.runNetwork()
        val stxThree = futureThree.getOrThrow()
        assert(stxThree.isLeft()) { "ClaimAsset should be unsuccessfull after timeout" }
    }
    
    @Test
    fun `UnlockAssetHTLC tests`() {
        var lockId: String = ""
        
        lockAsset().map{ id ->
            lockId = id.toString()
        }
        
        // Unhappy case: Unlock before Timeout
        val futureOne = partyA.startFlow(UnlockAsset(
            lockId,
            AssetStateContract.Commands.Issue(),
            issuer
        ))
        network.runNetwork()
        val stxOne = futureOne.getOrThrow()
        assert(stxOne.isLeft()) { "UnlockAsset fails as timeout not expired" }
        
        Thread.sleep(10000L)
        
        // Unhappy case: charlie trying to unlock        
        val futureTwo2 = partyC.startFlow(UnlockAsset(
            lockId,
            AssetStateContract.Commands.Issue(),
            issuer
        ))
        network.runNetwork()
        val stxTwo2 = futureTwo2.getOrThrow()
        assert(stxTwo2.isLeft()) { "UnlockAsset fails as only locker can unlock" }
        
        // Happy Case
        val future = partyA.startFlow(UnlockAsset(
            lockId,
            AssetStateContract.Commands.Issue(),
            issuer
        ))
        network.runNetwork()
        val stx = future.getOrThrow()
        assert(stx.isRight()) { "UnlockAsset should be successfull" }

        stx.fold({ println("Error") },{
            val states = partyA.services.vaultService
                .queryBy<AssetState>().states
                .filter { it.state.data.id == "a01" }
                .map { it.state.data }
            println(states.single().toString())
            assertEquals(1, states.size)
            assertEquals("a01", states.single().id)
            assertEquals(alice, states.single().owner)
        })
    }
    
    // Helper to successfully lock the asset
    fun lockAsset(): Either<Error, UniqueIdentifier> {
        val assetStateRef = createAssetTx("a01")
        // Assert Initial Owner of asset to be alice
        assertEquals(alice, assetStateRef.state.data.owner)
        val future = partyA.startFlow(LockAsset(
            lockInfo,
            assetExchangeAgreement,
            getAssetFlow,
            AssetStateContract.Commands.Delete(),
            issuer
        ))
        network.runNetwork()
        return future.getOrThrow()
    }
}


