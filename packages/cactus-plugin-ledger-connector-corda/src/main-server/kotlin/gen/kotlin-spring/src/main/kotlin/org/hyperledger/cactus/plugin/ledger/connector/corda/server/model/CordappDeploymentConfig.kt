package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordaNodeSshCredentials
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.CordaRpcCredentials
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
 * @param sshCredentials 
 * @param rpcCredentials 
 * @param cordaNodeStartCmd The shell command to execute in order to start back up a Corda node after having placed new jars in the cordapp directory of said node.
 * @param cordappDir The absolute file system path where the Corda Node is expecting deployed Cordapp jar files to be placed.
 * @param cordaJarPath The absolute file system path where the corda.jar file of the node can be found. This is used to execute database schema migrations where applicable (H2 database in use in development environments).
 * @param nodeBaseDirPath The absolute file system path where the base directory of the Corda node can be found. This is used to pass in to corda.jar when being invoked for certain tasks such as executing database schema migrations for a deployed contract.
 */
data class CordappDeploymentConfig(

    @field:Valid
    @get:JsonProperty("sshCredentials", required = true) val sshCredentials: CordaNodeSshCredentials,

    @field:Valid
    @get:JsonProperty("rpcCredentials", required = true) val rpcCredentials: CordaRpcCredentials,

    @get:Size(min=1,max=65535)
    @get:JsonProperty("cordaNodeStartCmd", required = true) val cordaNodeStartCmd: kotlin.String,

    @get:Size(min=1,max=2048)
    @get:JsonProperty("cordappDir", required = true) val cordappDir: kotlin.String,

    @get:Size(min=1,max=2048)
    @get:JsonProperty("cordaJarPath", required = true) val cordaJarPath: kotlin.String,

    @get:Size(min=1,max=2048)
    @get:JsonProperty("nodeBaseDirPath", required = true) val nodeBaseDirPath: kotlin.String
) {

}
