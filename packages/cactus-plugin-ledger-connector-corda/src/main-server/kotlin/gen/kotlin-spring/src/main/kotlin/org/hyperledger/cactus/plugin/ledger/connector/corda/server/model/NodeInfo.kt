package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NetworkHostAndPort
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.Party
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * 
 * @param addresses 
 * @param platformVersion 
 * @param serial 
 * @param legalIdentities 
 * @param legalIdentitiesAndCerts 
 */
data class NodeInfo(

    @get:NotNull 
    @field:JsonProperty("addresses") val addresses: kotlin.collections.List<NetworkHostAndPort>,

    @get:NotNull 
    @field:JsonProperty("platformVersion") val platformVersion: kotlin.Int,

    @get:NotNull 
    @field:JsonProperty("serial") val serial: java.math.BigDecimal,

    @get:NotNull 
    @field:JsonProperty("legalIdentities") val legalIdentities: kotlin.collections.List<Party>,

    @get:NotNull 
    @field:JsonProperty("legalIdentitiesAndCerts") val legalIdentitiesAndCerts: kotlin.collections.List<kotlin.Any>
) {

}

