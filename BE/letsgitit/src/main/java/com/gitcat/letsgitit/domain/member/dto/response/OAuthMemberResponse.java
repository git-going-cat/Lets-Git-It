package com.gitcat.letsgitit.domain.member.dto.response;

import com.gitcat.letsgitit.domain.member.entity.Member;

public record OAuthMemberResponse(
	Member member,
	boolean isReactivated) {
}
