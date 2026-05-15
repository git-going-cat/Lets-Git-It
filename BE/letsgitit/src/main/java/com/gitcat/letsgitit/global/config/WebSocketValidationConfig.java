package com.gitcat.letsgitit.global.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.annotation.support.SimpAnnotationMethodMessageHandler;
import org.springframework.validation.Validator;

@Configuration
public class WebSocketValidationConfig {

	@Autowired
	public void configureValidator(@Lazy
	SimpAnnotationMethodMessageHandler messageHandler, Validator validator) {
		messageHandler.setValidator(validator);
	}
}
