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
import io.swagger.v3.oas.annotations.media.Schema

/**
 * An instance of a java.security.PublicKey (which is an interface) implementation such as org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl
 * @param algorithm 
 * @param format 
 * @param encoded 
 */
data class PublicKey(

    @Schema(example = "EdDSA", required = true, description = "")
    @get:JsonProperty("algorithm", required = true) val algorithm: kotlin.String,

    @Schema(example = "X.509", required = true, description = "")
    @get:JsonProperty("format", required = true) val format: kotlin.String,

    @Schema(example = "MCowBQYDK2VwAyEAac1p4wLsAh70VJOcudQppu7NnKxyoKxVN0DbfTxF+54=", required = true, description = "")
    @get:JsonProperty("encoded", required = true) val encoded: kotlin.String
) {

}

