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
 * 
 * @param name 
 * @param encoded Base64 encoded public key
 */
data class X500Principal(

    @Schema(example = "O=PartyA,L=London,C=GB", required = true, description = "")
    @get:JsonProperty("name", required = true) val name: kotlin.String,

    @Schema(example = "MC8xCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QQ==", required = true, description = "Base64 encoded public key")
    @get:JsonProperty("encoded", required = true) val encoded: kotlin.String
) {

}

