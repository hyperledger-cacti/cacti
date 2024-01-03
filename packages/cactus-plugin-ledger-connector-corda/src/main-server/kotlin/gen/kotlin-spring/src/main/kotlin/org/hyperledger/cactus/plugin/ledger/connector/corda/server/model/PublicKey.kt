package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid

/**
 * An instance of a java.security.PublicKey (which is an interface) implementation such as org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl
 * @param algorithm 
 * @param format 
 * @param encoded 
 */
data class PublicKey(

    @get:JsonProperty("algorithm", required = true) val algorithm: kotlin.String,

    @get:JsonProperty("format", required = true) val format: kotlin.String,

    @get:JsonProperty("encoded", required = true) val encoded: kotlin.String
) {

}
