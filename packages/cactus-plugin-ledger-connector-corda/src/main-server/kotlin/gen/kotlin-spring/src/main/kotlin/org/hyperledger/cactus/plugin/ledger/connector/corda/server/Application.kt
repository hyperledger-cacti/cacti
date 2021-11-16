package org.hyperledger.cactus.plugin.ledger.connector.corda.server

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.SerializationFeature
import net.corda.client.jackson.JacksonSupport
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.NodeRPCConnection
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.runApplication
import org.springframework.context.annotation.ComponentScan
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.context.annotation.Bean
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter


@SpringBootApplication
@ComponentScan(basePackages = ["org.hyperledger.cactus.plugin.ledger.connector.corda.server", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.api", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.model"])
class Application {
    /**
     * Spring Bean that binds a Corda Jackson object-mapper to HTTP message types used in Spring.
     */
    @Bean
    open fun mappingJackson2HttpMessageConverter(@Autowired rpcConnection: NodeRPCConnection): MappingJackson2HttpMessageConverter {
        val mapper = JacksonSupport.createDefaultMapper(rpcConnection.proxy)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
            .disable(DeserializationFeature.FAIL_ON_INVALID_SUBTYPE)
        val converter = MappingJackson2HttpMessageConverter()
        converter.objectMapper = mapper
        return converter
    }
}

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}
