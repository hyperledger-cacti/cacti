/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package com.weaver.corda.app.interop.states

import com.weaver.corda.app.interop.contracts.MembershipStateContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable

/**
 * The security group captures the members of an external entity such as a thing, person, organization or
 * groups of entities such as networks.
 *
 * The security group is used is used in two places to verify the identities of external parties. The first is
 * as a part of the [HandleExternalRequest] flow to verify the identity of the requester according to it's
 * external entity's membership list. The second is a part of the viewVerification function (or network-specific
 * sub-functions) that is dispatched by the [WriteExternalState] flow.
 *
 * @property securityDomain The identifier for the external entity.
 * @property members The list of [Member]s from the external entity.
 * @property linearId The unique identifier for the state.
 * @property participants The list of parties that are participants of the state.
 */
@BelongsToContract(MembershipStateContract::class)
data class MembershipState(
        val securityDomain: String,
        val members: Map<String, Member>,
        override val linearId: UniqueIdentifier = UniqueIdentifier(),
        override val participants: List<Party> = listOf()
) : LinearState

/**
 * The Members of a security group are represented by a set of public keys, certificates or certificate authorities.
 *
 * @property value The value of the public key, certificate, or other feature used to identify the member.
 * @property type The type of the value, e.g. public key, certificate, certificate authority.
 * @property chain For "certificate" type, the chain includes the set of issuing certificates up to the entity's
 * root certificate that allow for verification of the issuing chain.
 */
@CordaSerializable
data class Member(
        val value: String,
        val type: String,
        val chain: List<String>
)

