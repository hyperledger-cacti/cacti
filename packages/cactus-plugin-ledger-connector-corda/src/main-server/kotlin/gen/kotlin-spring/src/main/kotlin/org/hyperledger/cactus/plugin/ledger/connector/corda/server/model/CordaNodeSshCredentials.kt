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
 * 
 * @param hostKeyEntry 
 * @param username 
 * @param password 
 * @param hostname 
 * @param port 
 */
data class CordaNodeSshCredentials(

    @get:NotNull @get:Size(min=1,max=65535) 
    @field:JsonProperty("hostKeyEntry") val hostKeyEntry: kotlin.String,

    @get:NotNull @get:Size(min=1,max=32) 
    @field:JsonProperty("username") val username: kotlin.String,

    @get:NotNull @get:Size(min=1,max=4096) 
    @field:JsonProperty("password") val password: kotlin.String,

    @get:NotNull @get:Size(min=1,max=4096) 
    @field:JsonProperty("hostname") val hostname: kotlin.String,

    @get:NotNull @get:Min(1) @get:Max(65535) 
    @field:JsonProperty("port") val port: kotlin.Int
) {

}

