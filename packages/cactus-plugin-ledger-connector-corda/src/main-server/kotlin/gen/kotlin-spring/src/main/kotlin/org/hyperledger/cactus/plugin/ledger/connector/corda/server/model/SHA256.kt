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
 * SHA-256 is part of the SHA-2 hash function family. Generated hash is fixed size, 256-bits (32-bytes).
 * @param bytes 
 * @param offset 
 * @param propertySize 
 */
data class SHA256(

    @get:JsonProperty("bytes", required = true) val bytes: kotlin.String,

    @get:JsonProperty("offset", required = true) val offset: kotlin.Int,

    @get:JsonProperty("size", required = true) val propertySize: kotlin.Int
) {

}
