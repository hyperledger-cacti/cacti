package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordappDeploymentConfig
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JarFile
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Email
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size
import javax.validation.Valid
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 
 * @param cordappDeploymentConfigs The list of deployment configurations pointing to the nodes where the provided cordapp jar files are to be deployed .
 * @param jarFiles 
 */
data class DeployContractJarsV1Request(

    @field:Valid
    @Schema(example = "null", required = true, description = "The list of deployment configurations pointing to the nodes where the provided cordapp jar files are to be deployed .")
    @get:JsonProperty("cordappDeploymentConfigs", required = true) val cordappDeploymentConfigs: kotlin.collections.List<CordappDeploymentConfig> = arrayListOf(),

    @field:Valid
    @Schema(example = "null", required = true, description = "")
    @get:JsonProperty("jarFiles", required = true) val jarFiles: kotlin.collections.List<JarFile>
) {

}

