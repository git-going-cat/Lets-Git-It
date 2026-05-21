package com.gitcat.letsgitit.domain.auth.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

	private final JavaMailSender mailSender;

	@Value("${spring.mail.username}")
	private String fromEmail;

	@Override
	public void sendAuthCode(String toEmail, String code, long ttlMinutes) {
		try {
			MimeMessage message = mailSender.createMimeMessage();

			// true = multipart, "UTF-8" = 한글 깨짐 방지
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(fromEmail);
			helper.setTo(toEmail);
			helper.setSubject("[Let's Git It] 이메일 인증 코드");
			helper.setText(buildEmailBody(code, ttlMinutes), true); // true = HTML

			mailSender.send(message);

		} catch (MessagingException | MailException e) {
			log.error("[auth][sendEmail] email send failed.", e);
			throw new BusinessException(ErrorCode.EMAIL_SEND_FAILED);
		}
	}

	private String buildEmailBody(String code, long ttlMinutes) {
		return """
			<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
			    <h2 style="color: #4A90D9;">Let's Git It 이메일 인증</h2>
			    <p>아래 인증 코드를 입력해주세요.</p>
			    <div style="background-color: #f4f4f4; padding: 20px; text-align: center;
			                font-size: 32px; font-weight: bold; letter-spacing: 8px;
			                border-radius: 8px; color: #333;">
			        %s
			    </div>
			    <p style="color: #888; font-size: 13px; margin-top: 16px;">
			        인증 코드는 %d분간 유효합니다.
			    </p>
			</div>
			""".formatted(code, ttlMinutes);
	}
}
