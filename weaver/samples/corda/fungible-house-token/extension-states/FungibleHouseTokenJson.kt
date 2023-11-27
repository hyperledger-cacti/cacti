/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package net.corda.samples.tokenizedhouse.states
import com.google.gson.annotations.*

data class FungibleHouseTokenJson(

    @SerializedName("type")
    val tokenType: String,
    @SerializedName("numunits")
    val numUnits: Long,
    val owner: String
)
