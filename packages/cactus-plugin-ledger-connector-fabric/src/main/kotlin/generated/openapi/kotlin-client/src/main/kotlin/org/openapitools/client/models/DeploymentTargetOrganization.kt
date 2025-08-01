/**
 *
 * Please note:
 * This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * Do not edit this file manually.
 *
 */

@file:Suppress(
    "ArrayInDataClass",
    "EnumEntryName",
    "RemoveRedundantQualifierName",
    "UnusedImport"
)

package org.openapitools.client.models

import org.openapitools.client.models.FileBase64

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * 
 *
 * @param CORE_PEER_LOCALMSPID Mapped to environment variables of the Fabric CLI container.
 * @param CORE_PEER_ADDRESS Mapped to environment variables of the Fabric CLI container.
 * @param CORE_PEER_MSPCONFIG Mapped to environment variables of the Fabric CLI container.
 * @param CORE_PEER_TLS_ROOTCERT Mapped to environment variables of the Fabric CLI container.
 * @param ORDERER_TLS_ROOTCERT Mapped to environment variables of the Fabric CLI container.
 */


data class DeploymentTargetOrganization (

    /* Mapped to environment variables of the Fabric CLI container. */
    @Json(name = "CORE_PEER_LOCALMSPID")
    val CORE_PEER_LOCALMSPID: kotlin.String,

    /* Mapped to environment variables of the Fabric CLI container. */
    @Json(name = "CORE_PEER_ADDRESS")
    val CORE_PEER_ADDRESS: kotlin.String,

    /* Mapped to environment variables of the Fabric CLI container. */
    @Json(name = "CORE_PEER_MSPCONFIG")
    val CORE_PEER_MSPCONFIG: kotlin.collections.List<FileBase64>,

    /* Mapped to environment variables of the Fabric CLI container. */
    @Json(name = "CORE_PEER_TLS_ROOTCERT")
    val CORE_PEER_TLS_ROOTCERT: kotlin.String,

    /* Mapped to environment variables of the Fabric CLI container. */
    @Json(name = "ORDERER_TLS_ROOTCERT")
    val ORDERER_TLS_ROOTCERT: kotlin.String

)

