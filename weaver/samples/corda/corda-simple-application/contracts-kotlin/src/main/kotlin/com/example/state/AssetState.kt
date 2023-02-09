/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.state

import com.cordaSimpleApplication.contract.AssetContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party
import com.google.gson.annotations.*

/**
 * The state object recording ownership of fungible token assets by a party.
 *
 * @param quantity the number of fungible tokens.
 * @param tokenType the type of the fungible tokens.
 * @param owner the party owning the tokens.
 */
@BelongsToContract(AssetContract::class)
data class AssetState(val quantity: Long,
                    val tokenType: String,
                    val owner: Party,
                    override val linearId: UniqueIdentifier = UniqueIdentifier()):
        LinearState {
    /** The public keys of the involved parties. */
    override val participants: List<AbstractParty> get() = listOf(owner)
}

/**
 * Below JSON is used to marshal the AssetState ledger object to external entities (e.g., Fabric network)
 */
data class AssetStateJSON(
    @SerializedName("numunits")
    val quantity: Long,
    @SerializedName("type")
    val tokenType: String,
    @SerializedName("owner")
    val ownerCert: String
)