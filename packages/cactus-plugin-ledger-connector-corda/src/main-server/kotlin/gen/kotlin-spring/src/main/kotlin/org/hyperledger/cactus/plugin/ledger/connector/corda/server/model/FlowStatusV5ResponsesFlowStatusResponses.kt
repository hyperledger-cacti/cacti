package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowV5Error
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

/**
 * 
 * @param clientRequestId 
 * @param flowError 
 * @param flowId 
 * @param flowResult 
 * @param flowStatus 
 * @param holdingIdentityShortHash 
 * @param timestamp 
 */
data class FlowStatusV5ResponsesFlowStatusResponses(

    @field:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null,

    @field:Valid
    @field:JsonProperty("flowError") val flowError: FlowV5Error? = null,

    @field:JsonProperty("flowId") val flowId: kotlin.String? = null,

    @field:JsonProperty("flowResult") val flowResult: kotlin.String? = null,

    @field:JsonProperty("flowStatus") val flowStatus: kotlin.String? = null,

    @field:JsonProperty("holdingIdentityShortHash") val holdingIdentityShortHash: kotlin.String? = null,

    @field:JsonProperty("timestamp") val timestamp: java.time.OffsetDateTime? = null
) {

}

