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
 * An instance of a java.security.PublicKey (which is an interface) implementation such as org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl
 * @param algorithm 
 * @param format 
 * @param encoded 
 */
data class PublicKey(

    @param:JsonProperty("algorithm", required = true)
    @get:JsonProperty("algorithm", required = true) val algorithm: kotlin.String,

    @param:JsonProperty("format", required = true)
    @get:JsonProperty("format", required = true) val format: kotlin.String,

    @param:JsonProperty("encoded", required = true)
    @get:JsonProperty("encoded", required = true) val encoded: kotlin.String
) {

}
