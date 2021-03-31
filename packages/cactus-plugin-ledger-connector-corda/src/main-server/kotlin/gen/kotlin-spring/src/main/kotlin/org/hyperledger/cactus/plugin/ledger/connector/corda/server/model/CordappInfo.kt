package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.SHA256
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

/**
 * A CordappInfo describes a single CorDapp currently installed on the node
 * @param jarHash 
 * @param licence The name of the licence this CorDapp is released under
 * @param minimumPlatformVersion The minimum platform version the node must be at for the CorDapp to run
 * @param name The name of the JAR file that defines the CorDapp
 * @param shortName The name of the CorDapp
 * @param targetPlatformVersion The target platform version this CorDapp has been tested against
 * @param type A description of what sort of CorDapp this is - either a contract, workflow, or a combination.
 * @param vendor The vendor of this CorDapp
 * @param version The version of this CorDapp
 */
data class CordappInfo(

    @get:NotNull 
    @field:JsonProperty("jarHash") val jarHash: SHA256,

    @get:NotNull 
    @field:JsonProperty("licence") val licence: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("minimumPlatformVersion") val minimumPlatformVersion: kotlin.Int,

    @get:NotNull 
    @field:JsonProperty("name") val name: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("shortName") val shortName: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("targetPlatformVersion") val targetPlatformVersion: kotlin.Int,

    @get:NotNull 
    @field:JsonProperty("type") val type: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("vendor") val vendor: kotlin.String,

    @get:NotNull 
    @field:JsonProperty("version") val version: kotlin.String
) {

}

