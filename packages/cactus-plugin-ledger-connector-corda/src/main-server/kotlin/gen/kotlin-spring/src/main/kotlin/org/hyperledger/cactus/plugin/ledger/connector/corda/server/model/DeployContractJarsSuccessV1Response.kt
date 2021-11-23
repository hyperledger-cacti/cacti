package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
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
 * @param deployedJarFiles 
 */
data class DeployContractJarsSuccessV1Response(

    @field:JsonProperty("deployedJarFiles", required = true) val deployedJarFiles: kotlin.collections.List<kotlin.String>
) {

}

