/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.state

import com.cordaSimpleApplication.contract.BondAssetContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party
import com.google.gson.annotations.*

/**
 * The state object recording ownership of bond/non-fungible asset by a party.
 *
 * @param type the type of the bond/non-fungible asset.
 * @param id the identifier of the bond/non-fungible asset.
 * @param owner the party owning the asset.
 */
@BelongsToContract(BondAssetContract::class)
data class BondAssetState(val type: String,
                    val id: String,
                    val owner: Party,
                    override val linearId: UniqueIdentifier = UniqueIdentifier()):
        LinearState {
    /** The public keys of the involved parties. */
    override val participants: List<AbstractParty> get() = listOf(owner)
}

/**
 * Below JSON is used to marshal the [BondAssetState] ledger object to external entities (e.g., Fabric network)
 */
data class BondAssetStateJSON(
    @SerializedName("type")
    val type: String,
    @SerializedName("id")
    val id: String,
    @SerializedName("owner")
    val ownerCert: String
)