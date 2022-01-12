package net.corda.samples.tokenizedhouse.states

data class FungibleHouseTokenJson(
    val tokenType: String,
    val numUnits: Long,
    val owner: String
)
