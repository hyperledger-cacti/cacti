package org.hyperledger.cacti.plugin.copm

import net.devh.boot.grpc.client.autoconfigure.GrpcClientAutoConfiguration
import net.devh.boot.grpc.client.autoconfigure.GrpcClientHealthAutoConfiguration
import net.devh.boot.grpc.client.autoconfigure.GrpcClientMetricAutoConfiguration
import net.devh.boot.grpc.client.autoconfigure.GrpcClientSecurityAutoConfiguration
import net.devh.boot.grpc.client.autoconfigure.GrpcClientTraceAutoConfiguration
import net.devh.boot.grpc.client.autoconfigure.GrpcDiscoveryClientAutoConfiguration
import net.devh.boot.grpc.common.autoconfigure.GrpcCommonCodecAutoConfiguration
import net.devh.boot.grpc.common.autoconfigure.GrpcCommonTraceAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcAdviceAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcHealthServiceAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcMetadataConsulConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcMetadataEurekaConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcMetadataNacosConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcMetadataZookeeperConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcReflectionServiceAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcServerAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcServerFactoryAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcServerMetricAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcServerSecurityAutoConfiguration
import net.devh.boot.grpc.server.autoconfigure.GrpcServerTraceAutoConfiguration
import net.devh.boot.grpc.server.event.GrpcServerStartedEvent
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.ImportAutoConfiguration
import org.springframework.context.annotation.Configuration
import org.springframework.context.event.EventListener

@Configuration
@ImportAutoConfiguration(
    GrpcClientAutoConfiguration::class,
    GrpcClientMetricAutoConfiguration::class,
    GrpcClientHealthAutoConfiguration::class,
    GrpcClientSecurityAutoConfiguration::class,
    GrpcClientTraceAutoConfiguration::class,
    GrpcDiscoveryClientAutoConfiguration::class,
    GrpcCommonCodecAutoConfiguration::class,
    GrpcCommonTraceAutoConfiguration::class,
    GrpcAdviceAutoConfiguration::class,
    GrpcHealthServiceAutoConfiguration::class,
    GrpcMetadataConsulConfiguration::class,
    GrpcMetadataEurekaConfiguration::class,
    GrpcMetadataNacosConfiguration::class,
    GrpcMetadataZookeeperConfiguration::class,
    GrpcReflectionServiceAutoConfiguration::class,
    GrpcServerAutoConfiguration::class,
    GrpcServerFactoryAutoConfiguration::class,
    GrpcServerMetricAutoConfiguration::class,
    GrpcServerSecurityAutoConfiguration::class,
    GrpcServerTraceAutoConfiguration::class
)
private class GrpcServerConfig {
    @EventListener
    fun onServerStarted(event: GrpcServerStartedEvent) {
        log.info("gRPC Server started, services: ${event.server.services[0].methods}")
    }

    companion object {
        private val log = LoggerFactory.getLogger(GrpcServerConfig::class.java)
    }
}