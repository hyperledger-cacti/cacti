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
import javax.validation.Valid

/**
 * 
 * @param flowNames An array of strings storing the names of the flows as returned by the flowList Corda RPC.
 */
data class ListFlowsV1Response(

    @field:JsonProperty("flowNames", required = true) val flowNames: kotlin.collections.List<kotlin.String>
) {

}

