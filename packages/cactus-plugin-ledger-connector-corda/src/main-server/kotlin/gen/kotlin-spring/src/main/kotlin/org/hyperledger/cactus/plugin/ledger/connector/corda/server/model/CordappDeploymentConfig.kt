package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordaNodeSshCredentials
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordaRpcCredentials
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
 * @param sshCredentials 
 * @param rpcCredentials 
 * @param cordaNodeStartCmd The shell command to execute in order to start back up a Corda node after having placed new jars in the cordapp directory of said node.
 * @param cordappDir The absolute file system path where the Corda Node is expecting deployed Cordapp jar files to be placed.
 * @param cordaJarPath The absolute file system path where the corda.jar file of the node can be found. This is used to execute database schema migrations where applicable (H2 database in use in development environments).
 * @param nodeBaseDirPath The absolute file system path where the base directory of the Corda node can be found. This is used to pass in to corda.jar when being invoked for certain tasks such as executing database schema migrations for a deployed contract.
 */
data class CordappDeploymentConfig(

    @field:Valid
    @field:JsonProperty("sshCredentials", required = true) val sshCredentials: CordaNodeSshCredentials,

    @field:Valid
    @field:JsonProperty("rpcCredentials", required = true) val rpcCredentials: CordaRpcCredentials,

    @get:Size(min=1,max=65535)
    @field:JsonProperty("cordaNodeStartCmd", required = true) val cordaNodeStartCmd: kotlin.String,

    @get:Size(min=1,max=2048)
    @field:JsonProperty("cordappDir", required = true) val cordappDir: kotlin.String,

    @get:Size(min=1,max=2048)
    @field:JsonProperty("cordaJarPath", required = true) val cordaJarPath: kotlin.String,

    @get:Size(min=1,max=2048)
    @field:JsonProperty("nodeBaseDirPath", required = true) val nodeBaseDirPath: kotlin.String
) {

}

