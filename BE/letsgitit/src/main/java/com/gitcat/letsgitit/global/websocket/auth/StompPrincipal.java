package com.gitcat.letsgitit.global.websocket.auth;

import java.security.Principal;

public record StompPrincipal(
	String name,
	String nickname) implements Principal {
	@Override
	public String getName() {
		return name;
	}
}
