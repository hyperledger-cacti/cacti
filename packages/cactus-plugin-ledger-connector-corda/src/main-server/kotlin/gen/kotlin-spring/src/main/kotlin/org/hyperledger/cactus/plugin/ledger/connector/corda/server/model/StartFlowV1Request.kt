package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.StartFlowV1RequestRequestBody
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
 * This method starts a new instance for the specified flow for the specified holding identity.
 * @param username 
 * @param password 
 * @param rejectUnauthorized 
 * @param clientRequestId 
 * @param flowClassName 
 * @param requestBody 
 * @param holdingIDShortHash 
 */
data class StartFlowV1Request(

    @get:JsonProperty("username", required = true) val username: kotlin.String,

    @get:JsonProperty("password", required = true) val password: kotlin.String,

    @get:JsonProperty("rejectUnauthorized", required = true) val rejectUnauthorized: kotlin.Boolean,

    @get:JsonProperty("clientRequestId", required = true) val clientRequestId: kotlin.String,

    @get:JsonProperty("flowClassName", required = true) val flowClassName: kotlin.String,

    @field:Valid
    @get:JsonProperty("requestBody", required = true) val requestBody: StartFlowV1RequestRequestBody,

    @get:JsonProperty("holdingIDShortHash") val holdingIDShortHash: kotlin.String? = null
) {

}
