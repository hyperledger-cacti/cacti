/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.cordaSimpleApplication.state

import com.cordaSimpleApplication.contract.SimpleContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.ContractState
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.AbstractParty
import net.corda.core.identity.Party

/**
 * A representation of a simple state that stores a key/value.
 *
 * It implements LinearState and therefore has a linearId.
 *
 * @property key the key for the state.
 * @property value the value for the given key.
 * @property owner the party responsible for managing the state.
 */
@BelongsToContract(SimpleContract::class)
data class SimpleState(
        val key: String,
        val value: String,
        val owner: Party,
        override val linearId: UniqueIdentifier = UniqueIdentifier()
):  LinearState {
    override val participants: List<AbstractParty> get() = listOf(owner)
}