package com.gitcat.letsgitit.domain.member.repository;

import org.springframework.stereotype.Repository;

import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MemberDslRepository {

	private final JPAQueryFactory jpaQueryFactory;

}
