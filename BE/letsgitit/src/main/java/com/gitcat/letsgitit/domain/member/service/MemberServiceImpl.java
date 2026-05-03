package com.gitcat.letsgitit.domain.member.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;

// 랭킹 기능구현을 위한 클래스
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

	private final MemberRepository memberRepository;

	@Override
	@Transactional(readOnly = true)
	public String getNicknameById(UUID memberId) {
		return memberRepository.findById(memberId)
			.map(Member::getNickname)
			.orElseThrow(() -> new BusinessException(MEMBER_NOT_FOUND));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> getNicknamesByIds(List<UUID> memberIds) {
		return memberRepository.findAllByIds(memberIds).stream()
			.collect(Collectors.toMap(Member::getId, Member::getNickname));
	}
}
