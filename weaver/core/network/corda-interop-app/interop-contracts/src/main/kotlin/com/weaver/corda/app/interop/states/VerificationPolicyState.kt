/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.corda.app.interop.contracts.VerificationPolicyStateContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable

/**
 * The VerificationPolicyState stores the rules around which parties from a foreign network
 * need to provide proof of a view in order for it to be deemed valid by the Corda network.
 *
 * The VerificationPolicyState is used in two places. The first is when creating an external request
 * in the [CreateExternalRequest] flow, in order to tell the relay which foreign network nodes
 * need to receive the request in order to provide a response. The second is when validating a
 * view returned from a foreign network. The [WriteExternalStateInitiator] flow coordinates the
 * lookup of the verification policy for the view in order to verify that the view has included
 * proofs from the minimum set of foreign network nodes to fulfill the policy.
 *
 * @property securityDomain The identifier for the foreign network.
 * @property identifiers The identifiers for a particular view, e.g. a view address. Can be an empty list.
 * @property linearId The unique identifier for the state.
 * @property participants The list of parties that are participants of the state.
 */
@BelongsToContract(VerificationPolicyStateContract::class)
data class VerificationPolicyState(
        val securityDomain: String,
        val identifiers: List<Identifier>,
        override val linearId: UniqueIdentifier = UniqueIdentifier(),
        override val participants: List<Party> = listOf()
) : LinearState

/**
 * The Identifier contains the verification policy required to be met for a given view, based on the
 * view's unique identifier (e.g. view address).
 *
 * @property pattern The unique identifier for the view.
 * @property policy The policy that needs to be fulfilled by the source network in order for the view
 * to be considered valid.
 */
@CordaSerializable
data class Identifier(
        val pattern: String,
        val policy: Policy
)

/**
 * The Policy captures the list of parties that are required to provide proofs of a view in order for the
 * Corda network to accept the view as valid.
 *
 * @property type The type of proof that is required from the external entity, for example, signature.
 * @property criteria Defines the list of verifiers that need to provide proofs to satisfy
 * the policy.
 */
@CordaSerializable
data class Policy(
        val type: String,
        val criteria: List<String>
)
