package com.accenture.interoperability.states

import com.accenture.interoperability.contracts.ActorContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.StateRef
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable

/**
 * This state is a fact what "verify request" was make.
 * This state also stores a list of the identifiers of the actors whose keys are used in the signature.
 */
@CordaSerializable
@BelongsToContract(ActorContract::class)
data class VerifyState(
    override val participants: List<Party> = listOf(),
    override val linearId: UniqueIdentifier,
    val message: String,
    val verifyResult: List<Pair<String, StateRef?>>
) : LinearState {

    val signatures: List<String> get() = verifyResult.map { it.first }

    val verifications: List<Boolean> get() = verifyResult.map { it.second != null }
}