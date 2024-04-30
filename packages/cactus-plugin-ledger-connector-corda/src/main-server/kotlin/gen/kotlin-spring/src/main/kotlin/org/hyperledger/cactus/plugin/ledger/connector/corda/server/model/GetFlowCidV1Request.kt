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

/**
 * This method gets the current status of the specified flow instance.
 * @param username 
 * @param password 
 * @param baseUrl 
 * @param holdingIDShortHash 
 * @param clientRequestId 
 */
data class GetFlowCidV1Request(

    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @get:JsonProperty("baseUrl", required = true) val baseUrl: kotlin.String,

    @get:JsonProperty("holdingIDShortHash") val holdingIDShortHash: kotlin.String? = null,

    @get:JsonProperty("clientRequestId") val clientRequestId: kotlin.String? = null
) {

}
