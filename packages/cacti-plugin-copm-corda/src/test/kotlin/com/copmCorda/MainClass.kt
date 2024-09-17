package com.copmCorda
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = ["com.copmCorda", "org.hyperledger.cacti.plugin.copm"])
@ConfigurationPropertiesScan
class CopmCordaApplication


fun main(args: Array<String>) {
    runApplication<CopmCordaApplication>(*args)
}

