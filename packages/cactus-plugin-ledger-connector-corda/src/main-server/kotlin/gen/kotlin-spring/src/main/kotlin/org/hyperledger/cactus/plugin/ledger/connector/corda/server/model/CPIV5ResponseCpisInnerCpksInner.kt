package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CPIIDV5
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param hash 
 * @param id 
 * @param libraries 
 * @param mainBundle 
 * @param timestamp 
 * @param type 
 */
data class CPIV5ResponseCpisInnerCpksInner(

    @Schema(example = "string", description = "")
    @get:JsonProperty("hash") val hash: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("id") val id: CPIIDV5? = null,

    @Schema(example = "null", description = "")
    @get:JsonProperty("libraries") val libraries: kotlin.collections.List<kotlin.String>? = null,

    @Schema(example = "string", description = "")
    @get:JsonProperty("mainBundle") val mainBundle: kotlin.String? = null,

    @Schema(example = "2022-06-24T10:15:30Z", description = "")
    @get:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null,

    @Schema(example = "string", description = "")
    @get:JsonProperty("type") val type: kotlin.String? = null
) {

}

