package org.hyperledger.cactus.plugin.ledger.connector.corda.server.model

import java.util.Objects
import com.fasterxml.jackson.annotation.JsonProperty
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.SHA256
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

    @field:Valid
    @param:JsonProperty("jarHash", required = true)
    @get:JsonProperty("jarHash", required = true) val jarHash: SHA256,

    @param:JsonProperty("licence", required = true)
    @get:JsonProperty("licence", required = true) val licence: kotlin.String,

    @param:JsonProperty("minimumPlatformVersion", required = true)
    @get:JsonProperty("minimumPlatformVersion", required = true) val minimumPlatformVersion: kotlin.Int,

    @param:JsonProperty("name", required = true)
    @get:JsonProperty("name", required = true) val name: kotlin.String,

    @param:JsonProperty("shortName", required = true)
    @get:JsonProperty("shortName", required = true) val shortName: kotlin.String,

    @param:JsonProperty("targetPlatformVersion", required = true)
    @get:JsonProperty("targetPlatformVersion", required = true) val targetPlatformVersion: kotlin.Int,

    @param:JsonProperty("type", required = true)
    @get:JsonProperty("type", required = true) val type: kotlin.String,

    @param:JsonProperty("vendor", required = true)
    @get:JsonProperty("vendor", required = true) val vendor: kotlin.String,

    @param:JsonProperty("version", required = true)
    @get:JsonProperty("version", required = true) val version: kotlin.String
) {

}
