package com.gitcat.letsgitit.global.response;

import static org.springframework.http.HttpStatus.*;

import java.util.Map;

import org.springframework.http.ResponseEntity;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {
	private int status;
	private String message;
	private T data;

	public static <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) {
		return ResponseEntity
			.ok(new ApiResponse<>(OK.value(), message, data));
	}

	public static ResponseEntity<ApiResponse<Map<String, Object>>> ok(String message) {
		return ResponseEntity.ok(new ApiResponse<>(OK.value(), message, Map.of()));
	}

	public static <T> ResponseEntity<ApiResponse<T>> create(String message, T data) {
		return ResponseEntity
			.status(CREATED)
			.body(new ApiResponse<>(CREATED.value(), message, data));
	}

	public static ResponseEntity<ApiResponse<Map<String, Object>>> create(String message) {
		return ResponseEntity
			.status(CREATED)
			.body(new ApiResponse<>(CREATED.value(), message, Map.of()));
	}
}
