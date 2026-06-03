package com.freightExchange.search_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI searchServiceOpenApi() {

        return new OpenAPI()
                .info(
                        new Info()
                                .title("Search Service API")
                                .version("1.0.0")
                                .description("Search service for listings")
                                .contact(
                                        new Contact()
                                                .name("Freight Change Team")
                                )
                );
    }
}