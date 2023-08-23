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
 * @param hostKeyEntry 
 * @param username 
 * @param password 
 * @param hostname 
 * @param port 
 */
data class CordaNodeSshCredentials(

    @get:Size(min=1,max=65535)
    @Schema(example = "localhost ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPmhSBtMctNa4hsZt8QGlsYSE5/gMkjeand69Vj4ir13", required = true, description = "")
    @get:JsonProperty("hostKeyEntry", required = true) val hostKeyEntry: kotlin.String,

    @get:Size(min=1,max=32)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:Size(min=1,max=4096)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @get:Size(min=1,max=4096)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("hostname", required = true) val hostname: kotlin.String,

    @get:Min(1)
    @get:Max(65535)
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("port", required = true) val port: kotlin.Int
) {

}

