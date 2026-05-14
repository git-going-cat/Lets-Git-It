package com.gitcat.letsgitit.global.websocket;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class WebSocketSessionRegistry {

	private final Map<String, Set<String>> memberSessions = new ConcurrentHashMap<>();
	private final Map<String, String> sessionToMember = new ConcurrentHashMap<>();

	public void register(String memberId, String sessionId) {
		memberSessions.computeIfAbsent(memberId, ignored -> ConcurrentHashMap.newKeySet())
			.add(sessionId);
		sessionToMember.put(sessionId, memberId);
	}

	public String unregisterBySessionId(String sessionId) {
		String memberId = sessionToMember.remove(sessionId);
		if (memberId == null) {
			return null;
		}

		Set<String> sessions = memberSessions.get(memberId);
		if (sessions == null) {
			return memberId;
		}

		sessions.remove(sessionId);
		if (sessions.isEmpty()) {
			memberSessions.remove(memberId);
		}

		return memberId;
	}

	public boolean hasActiveSessions(String memberId) {
		Set<String> sessions = memberSessions.get(memberId);
		return sessions != null && !sessions.isEmpty();
	}
}
