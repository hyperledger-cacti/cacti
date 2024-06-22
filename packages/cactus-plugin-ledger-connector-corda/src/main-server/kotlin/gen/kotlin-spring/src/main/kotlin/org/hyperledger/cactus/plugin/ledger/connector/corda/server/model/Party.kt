package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordaX500Name
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.PublicKey
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
 * @param name 
 * @param owningKey 
 */
data class Party(

    @field:Valid
    @get:JsonProperty("name", required = true) val name: CordaX500Name,

    @field:Valid
    @get:JsonProperty("owningKey", required = true) val owningKey: PublicKey
) {

}
