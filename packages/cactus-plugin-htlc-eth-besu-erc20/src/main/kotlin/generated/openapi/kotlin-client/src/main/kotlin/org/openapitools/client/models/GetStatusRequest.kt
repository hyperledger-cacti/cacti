/**
 * Hyperledger Cactus Plugin - HTLC ETH BESU ERC20
 *
 * Allows Cactus nodes to interact with HTLC contracts with ERC-20 Tokens
 *
 * The version of the OpenAPI document: 0.0.1
 * 
 *
 * Please note:
 * This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * Do not edit this file manually.
 */

@file:Suppress(
    "ArrayInDataClass",
    "EnumEntryName",
    "RemoveRedundantQualifierName",
    "UnusedImport"
)

package org.openapitools.client.models

import org.openapitools.client.models.Web3SigningCredential

import com.squareup.moshi.Json

/**
 * Defines the parameters for retrieving the status of the HTLC swap.
 *
 * @param ids 
 * @param web3SigningCredential 
 * @param connectorId 
 * @param keychainId 
 */

data class GetStatusRequest (

    @Json(name = "ids")
    val ids: kotlin.collections.List<kotlin.String>,

    @Json(name = "web3SigningCredential")
    val web3SigningCredential: Web3SigningCredential,

    @Json(name = "connectorId")
    val connectorId: kotlin.String,

    @Json(name = "keychainId")
    val keychainId: kotlin.String

)
