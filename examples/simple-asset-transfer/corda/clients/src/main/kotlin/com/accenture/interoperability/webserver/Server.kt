package com.accenture.interoperability.webserver

import org.springframework.boot.Banner
import org.springframework.boot.SpringApplication
import org.springframework.boot.WebApplicationType.SERVLET
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.web.filter.GenericFilterBean


/**
 * Our Spring Boot application.
 */
@SpringBootApplication
open class Starter {
    @Bean
    open fun jwtFilter(
        jwtConfig : JwtConfig
    ): FilterRegistrationBean<*> {
        val registrationBean = FilterRegistrationBean<GenericFilterBean>()
        registrationBean.filter = JwtFilter(jwtConfig)
        registrationBean.addUrlPatterns(
            "/api/v1/actors/*",
            "/api/v1/asset/*",
            "/api/v1/auth/random-number"
        )
        return registrationBean
    }
}


/**
 * Starts our Spring Boot application.
 */
fun main(args: Array<String>) {
    val app = SpringApplication(Starter::class.java)
    app.setBannerMode(Banner.Mode.OFF)
    app.webApplicationType = SERVLET
    app.run(*args)
}
