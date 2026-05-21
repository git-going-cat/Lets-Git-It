package com.gitcat.letsgitit.domain.auth.service;

public interface EmailService {

	void sendAuthCode(String toEmail, String code, long ttlMinutes);
}
