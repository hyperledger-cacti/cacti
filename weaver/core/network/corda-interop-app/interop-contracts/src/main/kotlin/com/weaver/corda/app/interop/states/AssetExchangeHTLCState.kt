/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.protos.common.asset_locks.AssetLocks.HashMechanism
import com.weaver.corda.app.interop.contracts.AssetExchangeHTLCStateContract
import com.weaver.corda.app.interop.contracts.AssetExchangeTxStateContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.ContractState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable
import net.corda.core.utilities.OpaqueBytes
import java.time.Instant
import net.corda.core.contracts.StaticPointer
import net.corda.core.crypto.SecureHash

/**
 * The AssetExchangeHTLCState stores the details about an HTLC lock.
 *
 * The AssetExchangeHTLCState is generated while locking an asset during asset exchange
 * or transfer. The same state is consumed while claiming/unlocking the asset.
 *
 * @property assetStatePointer The pointer to asset state.
 * @property lockInfo Stores hash, and timeout of HTLC.
 * @property locker The locker of asset during exchange/transfer.
 * @property recipient The recipient of asset during exchange/transfer.
 * @property linearId The unique identifier for the state.
 */
@BelongsToContract(AssetExchangeHTLCStateContract::class)
data class AssetExchangeHTLCState(
    val lockInfo: AssetLockHTLCData,
    val assetStatePointer: StaticPointer<ContractState>,
    val locker: Party,
    val recipient: Party,
    override val linearId: UniqueIdentifier = UniqueIdentifier(assetStatePointer.hashCode().toString())
) : LinearState {
    override val participants: List<AbstractParty> get() = listOf(locker, recipient)
}

@CordaSerializable
data class AssetLockHTLCData(
    val hashMechanism: HashMechanism,
    val hash: OpaqueBytes,
    val expiryTime: Instant
)

@CordaSerializable
data class AssetClaimHTLCData(
    val hashMechanism: HashMechanism,
    val hashPreimage: OpaqueBytes
)

/**
 * The AssetExchangeTxState stores the mapping of linearId of
 * AssetExchangeHTLCState with TxId of claim transaction.
 *
 * @property txId The id of the claim transaction.
 * @property locker The node that's going to store this state.
 * @property linearId The unique identifier for the state same value as one of the AssetExchangeHTLCState.
 */
@BelongsToContract(AssetExchangeTxStateContract::class)
data class AssetExchangeTxState(
    val txId: SecureHash,
    val locker: Party,
    override val linearId: UniqueIdentifier
) : LinearState {
    override val participants: List<AbstractParty> get() = listOf(locker)
}

