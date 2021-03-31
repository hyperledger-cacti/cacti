package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowInvocationType
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmObject
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * 
 * @param flowFullClassName The fully qualified name of the Corda flow to invoke
 * @param flowInvocationType 
 * @param params The list of arguments to pass in to the contract method being invoked.
 * @param timeoutMs The amount of milliseconds to wait for a transaction receipt beforegiving up and crashing.
 */
data class InvokeContractV1Request(

    @get:NotNull @get:Size(min=1,max=1024) 
    @field:JsonProperty("flowFullClassName") val flowFullClassName: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("flowInvocationType") val flowInvocationType: FlowInvocationType,

    @get:NotNull 
    @field:JsonProperty("params") val params: kotlin.collections.List<JvmObject>,
@get:DecimalMin("0")
    @field:JsonProperty("timeoutMs") val timeoutMs: java.math.BigDecimal? = null
) {

}

