package org.openapitools.configuration

import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.FlowInvocationType
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.JvmTypeKind

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.convert.converter.Converter

/**
 * This class provides Spring Converter beans for the enum models in the OpenAPI specification.
 *
 * By default, Spring only converts primitive types to enums using Enum::valueOf, which can prevent
 * correct conversion if the OpenAPI specification is using an `enumPropertyNaming` other than
 * `original` or the specification has an integer enum.
 */
@Configuration(value = "org.openapitools.configuration.enumConverterConfiguration")
class EnumConverterConfiguration {

    @Bean(name = ["org.openapitools.configuration.EnumConverterConfiguration.flowInvocationTypeConverter"])
    fun flowInvocationTypeConverter(): Converter<kotlin.String, FlowInvocationType> {
        return object: Converter<kotlin.String, FlowInvocationType> {
            override fun convert(source: kotlin.String): FlowInvocationType = FlowInvocationType.forValue(source)
        }
    }
    @Bean(name = ["org.openapitools.configuration.EnumConverterConfiguration.jvmTypeKindConverter"])
    fun jvmTypeKindConverter(): Converter<kotlin.String, JvmTypeKind> {
        return object: Converter<kotlin.String, JvmTypeKind> {
            override fun convert(source: kotlin.String): JvmTypeKind = JvmTypeKind.forValue(source)
        }
    }

}
