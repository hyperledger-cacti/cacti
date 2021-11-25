/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.corda.app.interop.contracts.AssetTransferContract
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
 * The AssetPledgeState stores the details about the pledge of an asset in the source network for asset transfer.
 *
 * The AssetPledgeState is generated while pledging an asset during asset transfer.
 * This state is used as the proof while claiming the asset in the remote network.
 *
 * @property assetStatePointer Pointer to asset state pledged for asset-transfer.
 * @property locker The owner of asset before transfer.
 * @property recipient The owner of asset after transfer.
 * @property expiryTime The future time in seconds till when the pledge on the asset holds good.
 * @property linearId The unique identifier for the state.
 */
@BelongsToContract(AssetTransferContract::class)
data class AssetPledgeState(
    val assetStatePointer: StaticPointer<ContractState>,
    val locker: Party,
    val recipient: String,
    val expiryTime: Instant,
    val localNetworkId: String,
    val remoteNetworkId: String,
    override val linearId: UniqueIdentifier = UniqueIdentifier(assetStatePointer.hashCode().toString())
) : LinearState {
    override val participants: List<AbstractParty> get() = listOf(locker)
}
