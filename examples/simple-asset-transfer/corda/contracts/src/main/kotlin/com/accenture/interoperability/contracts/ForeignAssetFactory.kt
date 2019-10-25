package com.accenture.interoperability.contracts

import com.accenture.interoperability.states.AssetState
import com.fasterxml.jackson.annotation.JsonAlias
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import net.corda.core.serialization.CordaSerializable

object ForeignAssetFactory {

    const val MinNumberOfSignaturesPermitsCopy = 3

    @CordaSerializable
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class MessageV2(
        val assetId: String,
        val origin: List<Origin>,
        val property1: String,
        val property2: String
    )

    @CordaSerializable
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class Message(

        @JsonAlias("assetId", "asset_id")
        val assetId: String,

        val origin: List<Origin>,
        val properties: Properties
    )

    @CordaSerializable
    data class Origin(

        @JsonAlias("originDLTId", "origin_dlt_id")
        val originDLTId: String,

        @JsonAlias("originAssetId", "origin_asset_id")
        val originAssetId: String
    )

    @CordaSerializable
    data class Properties(
        val property1: String,
        val property2: String
    )

    private val jacksonObjectMapper = jacksonObjectMapper()

    fun parseMessage(jsonString: String): Message = try {
        with(jacksonObjectMapper.readValue<MessageV2>(jsonString)) {
            Message(
                assetId = assetId, origin = origin, properties = Properties(property1 = property1, property2 = property2)
            )
        }
    } catch (ex: Exception) {
        jacksonObjectMapper.readValue<Message>(jsonString)
    }

    fun asJsonString(message: Message): String =
        jacksonObjectMapper.writeValueAsString(message)

    fun messageFromState(state: AssetState) = Message(
        assetId = state.assetId!!,
        origin = state.origin.map(this::pair2origin),
        properties = Properties(state.property1, state.property2)
    )

    fun origin2Pair(origin: Origin) = Pair(origin.originAssetId, origin.originDLTId)

    fun pair2origin(pair: Pair<String, String>) = Origin(originAssetId = pair.first, originDLTId = pair.second)
}