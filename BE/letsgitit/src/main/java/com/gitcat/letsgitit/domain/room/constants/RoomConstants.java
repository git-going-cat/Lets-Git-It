package com.gitcat.letsgitit.domain.room.constants;

public final class RoomConstants {

	private RoomConstants() {}

	public static final String ROOM_INFO_KEY_PREFIX = "room:";
	public static final String ROOM_INFO_KEY_SUFFIX = ":info";
	public static final String ROOM_LIST_KEY_PREFIX = "room:list:";
	public static final String ROOM_CODE_KEY_PREFIX = "room:code:";
	public static final String ROOM_MEMBERS_KEY_SUFFIX = ":members";
	public static final String ROOM_MEMBER_MAPPINGS_KEY_SUFFIX = ":member-mappings";

	public static final String ROOM_STATE_WAITING = "WAITING";
	public static final String ROOM_STATE_IN_GAME = "IN_GAME";
}
