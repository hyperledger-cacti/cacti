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
 * This method gets the current status of the specified flow instance.
 * @param username 
 * @param password 
 * @param rejectUnauthorized 
 * @param holdingIDShortHash 
 * @param clientRequestId 
 */
data class GetFlowCidV1Request(

    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @get:JsonProperty("rejectUnauthorized", required = true) val rejectUnauthorized: kotlin.Boolean,

    @get:JsonProperty("holdingIDShortHash") val holdingIDShortHash: kotlin.String? = null,

    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null
) {

}
