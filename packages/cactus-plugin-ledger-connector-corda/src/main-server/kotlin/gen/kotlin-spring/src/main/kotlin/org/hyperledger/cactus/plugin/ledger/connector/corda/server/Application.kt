package org.hyperledger.cactus.plugin.ledger.connector.corda.server

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.SerializationFeature
// import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import net.corda.client.jackson.JacksonSupport
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.NodeRPCConnection
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.CommandLineRunner
import org.springframework.boot.runApplication
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.ComponentScan
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler

private const val ThreadPoolCount = "cactus.threadCount"
private const val ThreadPoolCountDefault = "3"

@SpringBootApplication
@ComponentScan( basePackages = ["org.hyperledger.cactus.plugin.ledger.connector.corda.server", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.api", "org.hyperledger.cactus.plugin.ledger.connector.corda.server.model"])
@EnableScheduling
open class Application(@Value("\${$ThreadPoolCount:$ThreadPoolCountDefault}") val threadCount: Int) {
    /**
     * Spring Bean that binds a Corda Jackson object-mapper to HTTP message types used in Spring.
     */
    @Bean
    open fun mappingJackson2HttpMessageConverter(@Autowired rpcConnection: NodeRPCConnection): MappingJackson2HttpMessageConverter {
        val mapper = JacksonSupport.createDefaultMapper(rpcConnection.proxy)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
            .disable(DeserializationFeature.FAIL_ON_INVALID_SUBTYPE)
            // .registerModule(JavaTimeModule())
        val converter = MappingJackson2HttpMessageConverter()
        converter.objectMapper = mapper
        return converter
    }

    @Bean
    open fun taskScheduler(): TaskScheduler? {
        val taskScheduler = ThreadPoolTaskScheduler()
        taskScheduler.poolSize = this.threadCount
        return taskScheduler
    }

    @Bean
	open fun commandLineRunner(ctx: ApplicationContext): CommandLineRunner {
		return object : CommandLineRunner {
            override fun run(vararg args: String?) {
                System.out.println("Let's inspect the beans provided by Spring Boot:");

                val beanNames = ctx.getBeanDefinitionNames()
                beanNames.sortedArray()
                for (beanName in beanNames) {
                    System.out.println(beanName)
                }
            }
        }
	}
}

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}
