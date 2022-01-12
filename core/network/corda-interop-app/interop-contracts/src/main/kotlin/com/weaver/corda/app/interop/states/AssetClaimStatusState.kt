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
import java.time.Instant
import net.corda.core.contracts.StaticPointer

/**
 * The AssetClaimStatusState stores the details about the asset claim status in the remote/importing network for asset transfer.
 *
 * The AssetClaimStatusState is created after performing the asset claim in the remote/importing newtork during asset transfer.
 * This state is queried by the local/exporting network to check if the asset is claimed in the remote/importing network. If the asset is
 * NOT claimed in the remote/importing network, then the asset will be reclaimed in the local/exporting network after the pledge timeout.
 *
 * @property assetDetails Byte array containing the details of the asset being transferred.
 * @property localNetworkId The id of the network from which the asset is transferred.
 * @property remoteNetworkId The id of the network into which the asset is transferred and claimed.
 * @property recipient The owner of asset after transfer.
 * @property claimStatus Boolean value to convey if asset is claimed in the remote/importing network or not.
 * @property expiryTimeSecs The future time in seconds before which the asset claim in the remote/importing network is to be performed.
 * @property expirationStatus Boolean variable to convey if the time in the remote/importing network is past expiryTimeSecs or not.
 * @property linearId The unique identifier for the state.
 */
@BelongsToContract(AssetTransferContract::class)
data class AssetClaimStatusState(
    val assetDetails: ByteArray,
    val localNetworkId: String,
    val remoteNetworkId: String,
    val recipient: Party,
    val claimStatus: Boolean,
    val expiryTimeSecs: Long,
    val expirationStatus: Boolean,
    override val linearId: UniqueIdentifier = UniqueIdentifier()
) : LinearState {
    override val participants: List<AbstractParty> get() = listOf(recipient)
}
