package org.hyperledger.cactus.plugin.ledger.connector.corda.server

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.SerializationFeature
import net.corda.client.jackson.JacksonSupport
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.NodeRPCConnection
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ComponentScan
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler

private const val ThreadPoolCount = "cactus.threadCount"
private const val ThreadPoolCountDefault = "3"

@SpringBootApplication
@ComponentScan(basePackages = ["org.hyperledger.cactus.plugin.ledger.connector.corda.server", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.api", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.model"])
@EnableScheduling
class Application(@Value("\${$ThreadPoolCount:$ThreadPoolCountDefault}") val threadCount: Int) {
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

    @Bean
    fun taskScheduler(): TaskScheduler? {
        val taskScheduler = ThreadPoolTaskScheduler()
        taskScheduler.poolSize = this.threadCount
        return taskScheduler
    }
}

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}
