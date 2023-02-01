/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.corda.app.interop.contracts.AccessControlPolicyStateContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable

/**
 * The AccessControlPolicyState stores the rules around which views parties from a foreign network
 * are permitted to access.
 *
 * The AccessControlPolicyState is used as a part of the verifyAccessToFlow function dispatched by the
 * [HandleExternalRequest] flow to verify that a requester that sends a query to Corda has been granted
 * permission to access the view.
 *
 * @property securityDomain The identifier for the foreign network.
 * @property rules The set of rules for the [AccessControlPolicyState]
 * @property linearId The unique identifier for the state.
 * @property participants The list of parties that are participants of the state.
 */
@BelongsToContract(AccessControlPolicyStateContract::class)
data class AccessControlPolicyState(
        val securityDomain: String,
        val rules: List<Rule>,
        override val linearId: UniqueIdentifier = UniqueIdentifier(),
        override val participants: List<Party> = listOf()
) : LinearState

@CordaSerializable
data class Rule(
        val principal: String,
        val principalType: String,
        val resource: String,
        val read: Boolean)
