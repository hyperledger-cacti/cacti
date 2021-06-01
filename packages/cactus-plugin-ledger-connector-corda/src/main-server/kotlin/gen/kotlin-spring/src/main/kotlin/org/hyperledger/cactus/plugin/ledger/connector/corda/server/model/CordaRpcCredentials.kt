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
 * @param hostname 
 * @param port 
 * @param username 
 * @param password 
 */
data class CordaRpcCredentials(

    @get:Size(min=1,max=65535)
    @field:JsonProperty("hostname", required = true) val hostname: kotlin.String,

    @get:Min(1)
    @get:Max(65535)
    @field:JsonProperty("port", required = true) val port: kotlin.Int,

    @get:Size(min=1,max=1024)
    @field:JsonProperty("username", required = true) val username: kotlin.String,

    @get:Size(min=1,max=65535)
    @field:JsonProperty("password", required = true) val password: kotlin.String
) {

}

