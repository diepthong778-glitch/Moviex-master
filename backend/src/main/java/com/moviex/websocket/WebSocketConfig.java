package com.moviex.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ActivityWebSocketHandler activityWebSocketHandler;

    public WebSocketConfig(ActivityWebSocketHandler activityWebSocketHandler) {
        this.activityWebSocketHandler = activityWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(activityWebSocketHandler, "/ws/activity")
                .setAllowedOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173");
    }
}
