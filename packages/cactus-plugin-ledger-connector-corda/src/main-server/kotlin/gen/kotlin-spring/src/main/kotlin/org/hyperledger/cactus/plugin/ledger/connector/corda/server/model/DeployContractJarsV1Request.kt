package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordappDeploymentConfig
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JarFile
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * 
 * @param cordappDeploymentConfigs The list of deployment configurations pointing to the nodes where the provided cordapp jar files are to be deployed .
 * @param jarFiles 
 */
data class DeployContractJarsV1Request(

    @get:NotNull @get:Size(min=0,max=1024) 
    @field:JsonProperty("cordappDeploymentConfigs") val cordappDeploymentConfigs: kotlin.collections.List<CordappDeploymentConfig>,

    @get:NotNull 
    @field:JsonProperty("jarFiles") val jarFiles: kotlin.collections.List<JarFile>
) {

}

