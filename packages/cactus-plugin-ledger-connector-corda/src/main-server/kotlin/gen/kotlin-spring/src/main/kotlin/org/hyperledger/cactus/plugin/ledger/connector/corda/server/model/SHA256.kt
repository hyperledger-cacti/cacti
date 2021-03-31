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
 * SHA-256 is part of the SHA-2 hash function family. Generated hash is fixed size, 256-bits (32-bytes).
 * @param bytes 
 * @param offset 
 * @param size 
 */
data class SHA256(

    @get:NotNull 
    @field:JsonProperty("bytes") val bytes: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("offset") val offset: kotlin.Int,

    @get:NotNull 
    @field:JsonProperty("size") val size: kotlin.Int
) {

}

