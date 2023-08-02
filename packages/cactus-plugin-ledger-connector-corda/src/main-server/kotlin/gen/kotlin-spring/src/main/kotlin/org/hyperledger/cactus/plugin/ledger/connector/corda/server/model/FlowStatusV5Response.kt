package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowV5Error
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
 * @param flowStatus 
 * @param holdingIDShortHash 
 * @param timestamp 
 * @param clientRequestId 
 * @param flowError 
 * @param flowId 
 * @param flowResult 
 */
data class FlowStatusV5Response(

    @Schema(example = "string", required = true, description = "")
    @get:JsonProperty("flowStatus", required = true) val flowStatus: kotlin.String,

    @Schema(example = "string", required = true, description = "")
    @get:JsonProperty("holdingIDShortHash", required = true) val holdingIDShortHash: kotlin.String,

    @Schema(example = "2022-06-24T10:15:30Z", required = true, description = "")
    @get:JsonProperty("timestamp", required = true) val timestamp: java.time.OffsetDateTime,

    @Schema(example = "string", description = "")
    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null,

    @field:Valid
    @Schema(example = "null", description = "")
    @get:JsonProperty("flowError") val flowError: FlowV5Error? = null,

    @Schema(example = "string", description = "")
    @get:JsonProperty("flowId") val flowId: kotlin.String? = null,

    @Schema(example = "string", description = "")
    @get:JsonProperty("flowResult") val flowResult: kotlin.String? = null
) {

}

