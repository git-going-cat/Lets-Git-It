package com.gitcat.letsgitit.domain.member.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.SQLRestriction;

import com.gitcat.letsgitit.global.entity.BaseEntity;
import com.gitcat.letsgitit.global.enums.GitProficiency;
import com.gitcat.letsgitit.global.enums.OnboardingStatus;
import com.gitcat.letsgitit.global.enums.Provider;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted_at IS NULL")
@Entity
@Table(name = "member", uniqueConstraints = {
	@UniqueConstraint(name = "uq_member_email", columnNames = {"email"}),
	@UniqueConstraint(name = "uq_member_nickname", columnNames = {"nickname"})
})
public class Member extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
	private UUID id;

	@Column(name = "email", nullable = false, length = 255)
	private String email;

	@Column(name = "password", length = 255)
	private String password;

	@Enumerated(EnumType.STRING)
	@Column(name = "provider", length = 50)
	private Provider provider;

	@Column(name = "provider_id", length = 255)
	private String providerId;

	@Column(name = "nickname", length = 50)
	private String nickname;

	@Column(name = "character_hair", length = 50)
	private String characterHair;

	@Column(name = "character_hair_color", length = 50)
	private String characterHairColor;

	@Column(name = "character_body", length = 50)
	private String characterBody;

	@Column(name = "character_outfit_color", length = 50)
	private String characterOutfitColor;

	@Column(name = "character_eye", length = 50)
	private String characterEye;

	@Column(name = "character_outfit", length = 50)
	private String characterOutfit;

	@Enumerated(EnumType.STRING)
	@Column(name = "git_proficiency", length = 50)
	private GitProficiency gitProficiency;

	@Enumerated(EnumType.STRING)
	@Column(name = "onboarding_status", nullable = false, length = 50)
	private OnboardingStatus onboardingStatus = OnboardingStatus.NONE;

	@Column(name = "total_play_time", nullable = false)
	private int totalPlayTime = 0;

	@Column(name = "deleted_at")
	private LocalDateTime deletedAt;

	public static Member of(String email, String encodedPassword) {
		Member member = new Member();
		member.email = email;
		member.password = encodedPassword;
		member.provider = Provider.LOCAL;
		member.onboardingStatus = OnboardingStatus.NONE;
		member.totalPlayTime = 0;
		return member;
	}

	public static Member ofOAuth(String email, Provider provider, String providerId) {
		Member member = new Member();
		member.email = email;
		member.provider = provider;
		member.providerId = providerId;
		member.onboardingStatus = OnboardingStatus.NONE;
		member.totalPlayTime = 0;
		return member;
	}

	public void updateNickname(String nickname) {
		this.nickname = nickname;
	}

	public void updatePassword(String encodedPassword) {
		this.password = encodedPassword;
	}

	public void updateCharacter(String hair, String hairColor, String body,
		String outfitColor, String eye, String outfit) {
		this.characterHair = hair;
		this.characterHairColor = hairColor;
		this.characterBody = body;
		this.characterOutfitColor = outfitColor;
		this.characterEye = eye;
		this.characterOutfit = outfit;
	}

	public void updateOnboardingStatus(OnboardingStatus status) {
		this.onboardingStatus = status;
	}

	public void addPlayTime(int seconds) {
		this.totalPlayTime += seconds;
	}

	public void delete() {
		this.deletedAt = LocalDateTime.now();
	}
}
