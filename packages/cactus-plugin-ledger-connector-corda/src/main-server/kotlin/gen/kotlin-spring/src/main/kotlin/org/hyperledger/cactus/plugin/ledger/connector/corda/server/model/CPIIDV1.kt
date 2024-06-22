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
 * @param name 
 * @param version 
 * @param signerSummaryHash 
 */
data class CPIIDV1(

    @get:JsonProperty("name", required = true) val name: kotlin.String,

    @get:JsonProperty("version", required = true) val version: kotlin.String,

    @get:JsonProperty("signerSummaryHash") val signerSummaryHash: kotlin.String? = null
) {

}
