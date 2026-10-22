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
 * @param hostKeyEntry 
 * @param username 
 * @param password 
 * @param hostname 
 * @param port 
 */
data class CordaNodeSshCredentials(

    @get:Size(min=1,max=65535)
    @param:JsonProperty("hostKeyEntry", required = true)
    @get:JsonProperty("hostKeyEntry", required = true) val hostKeyEntry: kotlin.String,

    @get:Size(min=1,max=32)
    @param:JsonProperty("username", required = true)
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:Size(min=1,max=4096)
    @param:JsonProperty("password", required = true)
    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @get:Size(min=1,max=4096)
    @param:JsonProperty("hostname", required = true)
    @get:JsonProperty("hostname", required = true) val hostname: kotlin.String,

    @get:Min(value=1)
    @get:Max(value=65535)
    @param:JsonProperty("port", required = true)
    @get:JsonProperty("port", required = true) val port: kotlin.Int
) {

}
