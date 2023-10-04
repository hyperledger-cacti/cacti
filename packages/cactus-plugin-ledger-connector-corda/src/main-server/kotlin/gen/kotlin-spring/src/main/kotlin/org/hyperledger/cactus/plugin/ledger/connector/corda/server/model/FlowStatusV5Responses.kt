package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowStatusV5ResponsesFlowStatusResponses
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
 * @param flowStatusResponses 
 */
data class FlowStatusV5Responses(

    @field:Valid
    @field:JsonProperty("flowStatusResponses") val flowStatusResponses: kotlin.collections.List<FlowStatusV5ResponsesFlowStatusResponses>? = null
) {

}

