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
 * @param name 
 * @param version 
 * @param signerSummaryHash 
 */
data class CPIIDV5(

    @field:JsonProperty("name", required = true) val name: kotlin.String,

    @field:JsonProperty("version", required = true) val version: kotlin.String,

    @field:JsonProperty("signerSummaryHash") val signerSummaryHash: kotlin.String? = null
) {

}

