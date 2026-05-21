package com.gitcat.letsgitit.global.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.gitcat.letsgitit.global.websocket.WebSocketOutboundLoggingInterceptor;
import com.gitcat.letsgitit.global.websocket.WebSocketStompErrorHandler;
import com.gitcat.letsgitit.global.websocket.auth.WebSocketAuthChannelInterceptor;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;
	private final WebSocketStompErrorHandler webSocketStompErrorHandler;
	private final TaskScheduler heartbeatTaskScheduler;
	private final ObjectProvider<WebSocketOutboundLoggingInterceptor> outboundLoggingInterceptorProvider;

	public WebSocketConfig(
		WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor,
		WebSocketStompErrorHandler webSocketStompErrorHandler,
		@Qualifier("heartbeatTaskScheduler")
		TaskScheduler heartbeatTaskScheduler,
		ObjectProvider<WebSocketOutboundLoggingInterceptor> outboundLoggingInterceptorProvider) {
		this.webSocketAuthChannelInterceptor = webSocketAuthChannelInterceptor;
		this.webSocketStompErrorHandler = webSocketStompErrorHandler;
		this.heartbeatTaskScheduler = heartbeatTaskScheduler;
		this.outboundLoggingInterceptorProvider = outboundLoggingInterceptorProvider;
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(webSocketAuthChannelInterceptor);
	}

	@Override
	public void configureClientOutboundChannel(ChannelRegistration registration) {
		outboundLoggingInterceptorProvider.ifAvailable(registration::interceptors);
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.setErrorHandler(webSocketStompErrorHandler);
		registry.addEndpoint("/ws")
			.setAllowedOriginPatterns("*");
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		registry.setApplicationDestinationPrefixes("/app");
		registry.enableSimpleBroker("/topic", "/queue")
			.setHeartbeatValue(new long[] {5000, 5000})
			.setTaskScheduler(heartbeatTaskScheduler);
		registry.setUserDestinationPrefix("/user");
	}

}
