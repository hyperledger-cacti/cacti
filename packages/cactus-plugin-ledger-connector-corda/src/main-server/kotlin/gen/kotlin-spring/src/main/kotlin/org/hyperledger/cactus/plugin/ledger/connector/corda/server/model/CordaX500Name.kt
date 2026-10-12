package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.X500Principal
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
 * @param organisation 
 * @param locality 
 * @param country 
 * @param x500Principal 
 * @param commonName 
 * @param organisationUnit 
 * @param state 
 */
data class CordaX500Name(

    @param:JsonProperty("organisation", required = true)
    @get:JsonProperty("organisation", required = true) val organisation: kotlin.String,

    @param:JsonProperty("locality", required = true)
    @get:JsonProperty("locality", required = true) val locality: kotlin.String,

    @param:JsonProperty("country", required = true)
    @get:JsonProperty("country", required = true) val country: kotlin.String,

    @field:Valid
    @param:JsonProperty("x500Principal", required = true)
    @get:JsonProperty("x500Principal", required = true) val x500Principal: X500Principal,

    @param:JsonProperty("commonName")
    @get:JsonProperty("commonName") val commonName: kotlin.String? = null,

    @param:JsonProperty("organisationUnit")
    @get:JsonProperty("organisationUnit") val organisationUnit: kotlin.String? = null,

    @param:JsonProperty("state")
    @get:JsonProperty("state") val state: kotlin.String? = null
) {

}
