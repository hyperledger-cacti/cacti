package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
 * @param chatName 
 * @param otherMember 
 * @param message 
 * @param numberOfRecords 
 */
data class StartFlowV5RequestRequestBody(

    @Schema(example = "null", description = "")
    @get:JsonProperty("chatName") val chatName: kotlin.String? = null,

    @Schema(example = "null", description = "")
    @get:JsonProperty("otherMember") val otherMember: kotlin.String? = null,

    @Schema(example = "null", description = "")
    @get:JsonProperty("message") val message: kotlin.String? = null,

    @Schema(example = "null", description = "")
    @get:JsonProperty("numberOfRecords") val numberOfRecords: kotlin.String? = null
) {

}

