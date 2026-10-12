package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
 * @param success 
 * @param callOutput Data returned from the JVM when no transaction is running
 * @param flowId The id for the flow handle
 * @param transactionId The net.corda.core.flows.StateMachineRunId value returned by the flow execution.
 * @param progress An array of strings representing the aggregated stream of progress updates provided by a *tracked* flow invocation. If the flow invocation was not tracked, this array is still returned, but as empty.
 */
data class InvokeContractV1Response(

    @param:JsonProperty("success", required = true)
    @get:JsonProperty("success", required = true) val success: kotlin.Boolean,

    @field:Valid
    @param:JsonProperty("callOutput", required = true)
    @get:JsonProperty("callOutput", required = true) val callOutput: kotlin.Any,

    @param:JsonProperty("flowId", required = true)
    @get:JsonProperty("flowId", required = true) val flowId: kotlin.String,

    @get:Size(min=1,max=1024)
    @param:JsonProperty("transactionId")
    @get:JsonProperty("transactionId") val transactionId: kotlin.String? = null,

    @param:JsonProperty("progress")
    @get:JsonProperty("progress") val progress: kotlin.collections.List<kotlin.String>? = arrayListOf()
) {

}
