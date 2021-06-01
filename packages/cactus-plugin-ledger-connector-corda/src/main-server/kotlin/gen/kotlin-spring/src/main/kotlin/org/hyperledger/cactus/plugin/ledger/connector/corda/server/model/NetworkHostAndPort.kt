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
 * @param host 
 * @param port 
 */
data class NetworkHostAndPort(

    @field:JsonProperty("host", required = true) val host: kotlin.String,

    @field:JsonProperty("port", required = true) val port: java.math.BigDecimal
) {

}

