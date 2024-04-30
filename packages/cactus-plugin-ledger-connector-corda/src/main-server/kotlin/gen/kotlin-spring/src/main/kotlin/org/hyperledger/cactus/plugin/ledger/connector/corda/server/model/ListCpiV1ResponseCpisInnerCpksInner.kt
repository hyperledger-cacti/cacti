package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV1
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

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
