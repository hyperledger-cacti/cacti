/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.corda.app.interop.contracts.AssetExchangeHTLCStateContract
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

/**
 * The AssetExchangeHTLCState stores the details about an HTLC lock.
 *
 * The AssetExchangeHTLCState is generated while locking an asset during asset exchange
 * or transfer. The same state is consumed while claiming/unlocking the asset.
 *
 * @property contractId The unique identifier for the HTLC contract.
 * @property assetStateRef The reference to asset state.
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
    val hash: OpaqueBytes,
    val expiryTime: Instant
)

@CordaSerializable
data class AssetClaimHTLCData(
    val hashPreimage: OpaqueBytes
)
