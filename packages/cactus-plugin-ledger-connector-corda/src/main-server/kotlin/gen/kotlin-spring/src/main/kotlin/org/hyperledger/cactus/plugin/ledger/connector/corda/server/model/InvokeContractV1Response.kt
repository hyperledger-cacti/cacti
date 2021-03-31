package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * 
 * @param id The net.corda.core.flows.StateMachineRunId value returned by the flow execution.
 * @param progress An array of strings representing the aggregated stream of progress updates provided by a *tracked* flow invocation. If the flow invocation was not tracked, this array is still returned, but as empty.
 * @param returnValue 
 */
data class InvokeContractV1Response(

    @get:NotNull @get:Size(min=1,max=1024) 
    @field:JsonProperty("id") val id: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("progress") val progress: kotlin.collections.List<kotlin.String>,

    @field:JsonProperty("returnValue") val returnValue: kotlin.Any? = null
) {

}

