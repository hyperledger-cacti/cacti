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
 * @param host 
 * @param port 
 */
data class NetworkHostAndPort(

    @get:NotNull 
    @field:JsonProperty("host") val host: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("port") val port: java.math.BigDecimal
) {

}

