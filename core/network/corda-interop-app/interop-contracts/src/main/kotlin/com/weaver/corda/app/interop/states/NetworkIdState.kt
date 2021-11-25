/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.corda.app.interop.contracts.NetworkIdStateContract
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
 * The NetworkIdState stores the corda network id, and this state is accessible to all the members of this network.
 *
 * The NetworkIdState is expected to be populated at the start of the corda network.
 * This state is used while pledging an asset as part of transfer to a remote network.
 *
 * @property networkId The unique identifier for a corda network.
 * @property members The list of this corda network participants.
 */
@BelongsToContract(NetworkIdStateContract::class)
data class NetworkIdState(
    val networkId: String,
    val members: List<Party>,
    override val linearId: UniqueIdentifier = UniqueIdentifier()
) : LinearState {
    override val participants: List<AbstractParty> get() = members
}
