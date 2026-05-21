package com.gitcat.letsgitit.domain.room.util;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class RoomMemberMapper {

	private final ObjectMapper objectMapper;

	public Map<String, Object> toMemberInfo(Member member, boolean isHost) {
		Map<String, Object> memberInfo = new LinkedHashMap<>();
		memberInfo.put("playerId", member.getId().toString());
		memberInfo.put("nickname", Objects.requireNonNullElse(member.getNickname(), ""));
		memberInfo.put("characterHair", member.getCharacterHair());
		memberInfo.put("characterHairColor", member.getCharacterHairColor());
		memberInfo.put("characterBody", member.getCharacterBody());
		memberInfo.put("characterEye", member.getCharacterEye());
		memberInfo.put("characterOutfit", member.getCharacterOutfit());
		memberInfo.put("characterOutfitColor", member.getCharacterOutfitColor());
		memberInfo.put("isReady", isHost);
		memberInfo.put("isHost", isHost);
		return memberInfo;
	}

	public List<PlayerInfoDto> toPlayerInfoDtos(Map<Object, Object> members) {
		List<PlayerInfoDto> result = new ArrayList<>();
		for (Object memberValue : members.values()) {
			Map<?, ?> memberMap = convertMemberValue(memberValue);
			if (memberMap == null) {
				continue;
			}

			UUID playerId = UUID.fromString(RoomRedisReader.readString(memberMap, "playerId"));
			result.add(new PlayerInfoDto(
				playerId,
				RoomRedisReader.readString(memberMap, "nickname"),
				RoomRedisReader.readString(memberMap, "characterHair"),
				RoomRedisReader.readString(memberMap, "characterHairColor"),
				RoomRedisReader.readString(memberMap, "characterBody"),
				RoomRedisReader.readString(memberMap, "characterEye"),
				RoomRedisReader.readString(memberMap, "characterOutfit"),
				RoomRedisReader.readString(memberMap, "characterOutfitColor"),
				RoomRedisReader.readBoolean(memberMap, "isReady"),
				RoomRedisReader.readBoolean(memberMap, "isHost")));
		}
		return result;
	}

	private Map<?, ?> convertMemberValue(Object memberValue) {
		if (memberValue instanceof Map<?, ?> memberMap) {
			return memberMap;
		}
		if (memberValue instanceof String memberJson) {
			try {
				return objectMapper.readValue(memberJson, new TypeReference<Map<String, Object>>() {});
			} catch (Exception e) {
				throw new IllegalStateException("Failed to deserialize room member info", e);
			}
		}
		return null;
	}
}
