package org.hyperledger.cactus.plugin.ledger.connector.corda.server

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.info.Contact
import io.swagger.v3.oas.models.info.License
import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.security.SecurityScheme

@jakarta.annotation.Generated(value = ["org.openapitools.codegen.languages.KotlinSpringServerCodegen"])
@Configuration
class SpringDocConfiguration {

    @Bean
    fun apiInfo(): OpenAPI {
        return OpenAPI()
            .info(
                Info()
                    .title("Hyperledger Cactus Plugin - Connector Corda")
                    .description("Can perform basic tasks on a Corda ledger")
                    .license(
                        License()
                            .name("Apache-2.0")
                            .url("https://www.apache.org/licenses/LICENSE-2.0.html")
                    )
                    .version("v2.0.0-alpha.2")
            )
    }
}
