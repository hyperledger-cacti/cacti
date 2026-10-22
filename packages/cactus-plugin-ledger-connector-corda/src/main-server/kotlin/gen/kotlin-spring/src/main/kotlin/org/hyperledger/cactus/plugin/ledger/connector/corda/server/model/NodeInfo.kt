package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NetworkHostAndPort
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.Party
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
 * @param addresses 
 * @param platformVersion 
 * @param serial 
 * @param legalIdentities 
 * @param legalIdentitiesAndCerts 
 */
data class NodeInfo(

    @field:Valid
    @param:JsonProperty("addresses", required = true)
    @get:JsonProperty("addresses", required = true) val addresses: kotlin.collections.List<NetworkHostAndPort>,

    @param:JsonProperty("platformVersion", required = true)
    @get:JsonProperty("platformVersion", required = true) val platformVersion: kotlin.Int,

    @param:JsonProperty("serial", required = true)
    @get:JsonProperty("serial", required = true) val serial: java.math.BigDecimal,

    @field:Valid
    @param:JsonProperty("legalIdentities", required = true)
    @get:JsonProperty("legalIdentities", required = true) val legalIdentities: kotlin.collections.List<Party>,

    @field:Valid
    @param:JsonProperty("legalIdentitiesAndCerts", required = true)
    @get:JsonProperty("legalIdentitiesAndCerts", required = true) val legalIdentitiesAndCerts: kotlin.collections.List<kotlin.Any>
) {

}
