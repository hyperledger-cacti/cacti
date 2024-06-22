package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowV1Error
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
 * @param flowStatus 
 * @param holdingIDShortHash 
 * @param timestamp 
 * @param clientRequestId 
 * @param flowError 
 * @param flowId 
 * @param flowResult 
 */
data class GetFlowCidV1Response(

    @get:JsonProperty("flowStatus", required = true) val flowStatus: kotlin.String,

    @get:JsonProperty("holdingIDShortHash", required = true) val holdingIDShortHash: kotlin.String,

    @get:JsonProperty("timestamp", required = true) val timestamp: java.time.OffsetDateTime,

    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null,

    @field:Valid
    @get:JsonProperty("flowError") val flowError: FlowV1Error? = null,

    @get:JsonProperty("flowId") val flowId: kotlin.String? = null,

    @get:JsonProperty("flowResult") val flowResult: kotlin.String? = null
) {

}
