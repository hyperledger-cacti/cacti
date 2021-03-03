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
 * @param filename 
 * @param contentBase64 
 */
data class JarFile(

    @get:NotNull  
    @get:Size(min=1,max=255)
    @field:JsonProperty("filename") val filename: kotlin.String,

    @get:NotNull  
    @get:Size(min=1,max=1073741824)
    @field:JsonProperty("contentBase64") val contentBase64: kotlin.String
) : kotlin.collections.HashMap<String, kotlin.Any>(){

}

