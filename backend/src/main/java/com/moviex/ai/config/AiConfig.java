package com.moviex.ai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AiConfig {

    @Bean
    public RestClient aiRestClient(RestClient.Builder builder, AiProperties aiProperties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(aiProperties.getTimeoutMs());
        requestFactory.setReadTimeout(aiProperties.getTimeoutMs());

        return builder
                .baseUrl(aiProperties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
