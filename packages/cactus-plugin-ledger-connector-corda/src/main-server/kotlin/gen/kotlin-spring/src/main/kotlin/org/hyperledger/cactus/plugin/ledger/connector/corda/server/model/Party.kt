package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordaX500Name
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.PublicKey
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * 
 * @param name 
 * @param owningKey 
 */
data class Party(

    @get:NotNull 
    @field:JsonProperty("name") val name: CordaX500Name,

    @get:NotNull 
    @field:JsonProperty("owningKey") val owningKey: PublicKey
) {

}

