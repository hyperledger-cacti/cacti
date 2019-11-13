package com.accenture.interoperability.states

import com.accenture.interoperability.contracts.AssetContract
import net.corda.core.contracts.BelongsToContract
import net.corda.core.contracts.LinearState
import net.corda.core.contracts.UniqueIdentifier
import net.corda.core.identity.Party

/**
 * Asset contract state.
 */
@BelongsToContract(AssetContract::class)
data class AssetState(
    override val participants: List<Party> = listOf(),
    override val linearId: UniqueIdentifier,
    val origin: List<Pair<String, String>>,
    val property1: String,
    val property2: String,
    val targetDltId: String? = null,
    val receiverPK: String? = null
) : LinearState {

    val dltID get() = "CORDA_DLT"
    val assetId get() = linearId.externalId

    val locked: Boolean get() = targetDltId != null && receiverPK != null
}

