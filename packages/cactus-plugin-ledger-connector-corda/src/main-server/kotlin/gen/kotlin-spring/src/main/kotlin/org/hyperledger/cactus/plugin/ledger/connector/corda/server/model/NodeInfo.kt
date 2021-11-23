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
import javax.validation.Valid

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
    @field:JsonProperty("addresses", required = true) val addresses: kotlin.collections.List<NetworkHostAndPort>,

    @field:JsonProperty("platformVersion", required = true) val platformVersion: kotlin.Int,

    @field:JsonProperty("serial", required = true) val serial: java.math.BigDecimal,

    @field:Valid
    @field:JsonProperty("legalIdentities", required = true) val legalIdentities: kotlin.collections.List<Party>,

    @field:Valid
    @field:JsonProperty("legalIdentitiesAndCerts", required = true) val legalIdentitiesAndCerts: kotlin.collections.List<kotlin.Any>
) {

}

