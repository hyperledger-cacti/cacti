package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.X500Principal
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
 * @param organisation 
 * @param locality 
 * @param country 
 * @param x500Principal 
 * @param commonName 
 * @param organisationUnit 
 * @param state 
 */
data class CordaX500Name(

    @field:JsonProperty("organisation", required = true) val organisation: kotlin.String,

    @field:JsonProperty("locality", required = true) val locality: kotlin.String,

    @field:JsonProperty("country", required = true) val country: kotlin.String,

    @field:Valid
    @field:JsonProperty("x500Principal", required = true) val x500Principal: X500Principal,

    @field:JsonProperty("commonName") val commonName: kotlin.String? = null,

    @field:JsonProperty("organisationUnit") val organisationUnit: kotlin.String? = null,

    @field:JsonProperty("state") val state: kotlin.String? = null
) {

}

