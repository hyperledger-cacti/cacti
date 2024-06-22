package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV1
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import jakarta.validation.Valid

/**
 * 
 * @param hash 
 * @param id 
 * @param libraries 
 * @param mainBundle 
 * @param timestamp 
 * @param type 
 */
data class ListCpiV1ResponseCpisInnerCpksInner(

    @get:JsonProperty("hash") val hash: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("id") val id: CPIIDV1? = null,

    @get:JsonProperty("libraries") val libraries: kotlin.collections.List<kotlin.String>? = null,

    @get:JsonProperty("mainBundle") val mainBundle: kotlin.String? = null,

    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null,

    @get:JsonProperty("type") val type: kotlin.String? = null
) {

}
