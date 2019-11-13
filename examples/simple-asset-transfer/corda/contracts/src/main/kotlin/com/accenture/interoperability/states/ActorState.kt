package com.accenture.interoperability.states

import com.accenture.interoperability.contracts.ActorContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party
import net.corda.core.serialization.CordaSerializable


/**
 * Actor state types.
 */
@CordaSerializable
enum class ActorType {
    PARTICIPANT, VALIDATOR, FOREIGN_VALIDATOR
}

/**
 * Actor contract state.
 */
@BelongsToContract(ActorContract::class)
data class ActorState(
    override val participants: List<Party> = listOf(),
    override val linearId: UniqueIdentifier,
    val name: String,
    val type: ActorType
) : LinearState {

    val pubKey get() = linearId.externalId ?: ""
}
