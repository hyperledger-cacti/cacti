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
 * @param hostname 
 * @param port 
 * @param username 
 * @param password 
 */
data class CordaRpcCredentials(

    @get:Size(min=1,max=65535)
    @get:JsonProperty("hostname", required = true) val hostname: kotlin.String,

    @get:Min(1)
    @get:Max(65535)
    @get:JsonProperty("port", required = true) val port: kotlin.Int,

    @get:Size(min=1,max=1024)
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:Size(min=1,max=65535)
    @get:JsonProperty("password", required = true) val password: kotlin.String
) {

}
