package com.gitcat.letsgitit.global.exception;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.List;

import jakarta.validation.ConstraintViolationException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestCookieException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	/** 파라미터 유효성 검증 실패 예외 처리
	 * - jakarta.validation.Valid 혹은 @Validated 으로 binding error 발생시 발생
	 */
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(MethodArgumentNotValidException.class)
	protected ErrorResponse handleMethodArgumentNotValidException(
		final MethodArgumentNotValidException e) {
		log.info("유효하지 않은 파라미터입니다.");

		List<ErrorResponse.ErrorDetailResponse> errorDetailResponses = e.getBindingResult().getFieldErrors().stream()
			.map(
				error -> ErrorResponse.ErrorDetailResponse.of(
					error.getField(),
					error.getRejectedValue() == null ? "" : error.getRejectedValue().toString(),
					error.getDefaultMessage()))
			.toList();

		return ErrorResponse.of(INVALID_INPUT_VALUE, errorDetailResponses);
	}

	/** 바인딩 시 타입 불일치 예외 처리 - @RequestParam, @PathVariable 타입 불일치 시 발생 */
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	protected ErrorResponse handleMethodArgumentTypeMismatchException(
		final MethodArgumentTypeMismatchException e) {
		log.info("잘못된 타입의 파라미터 값이 전달되었습니다.");

		ErrorResponse.ErrorDetailResponse errorDetailResponse = ErrorResponse.ErrorDetailResponse.of(
			e.getValue() == null ? "null" : e.getValue().toString(), e.getName(), e.getMessage());

		return ErrorResponse.of(INVALID_TYPE_VALUE, List.of(errorDetailResponse));
	}

	/** 유효성 검증 실패 - @Validated가 붙은 Controller의 @RequestParam 검증 실패 시 */
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(ConstraintViolationException.class)
	protected ErrorResponse handleConstraintViolationException(final ConstraintViolationException e) {
		log.info("파라미터 유효성 검증에 실패했습니다.");

		List<ErrorResponse.ErrorDetailResponse> errorDetails = e.getConstraintViolations().stream()
			.map(
				violation -> {
					String propertyPath = violation.getPropertyPath().toString();
					String fieldName = propertyPath.substring(propertyPath.lastIndexOf('.') + 1);

					String invalidValue = violation.getInvalidValue() == null
						? "null"
						: violation.getInvalidValue().toString();

					String errorMessage = violation.getMessage();

					return ErrorResponse.ErrorDetailResponse.of(fieldName, invalidValue, errorMessage);
				})
			.toList();

		return ErrorResponse.of(INVALID_INPUT_VALUE, errorDetails);
	}

	/** 바인딩 시 파라미터 누락 예외 처리 - 요청 param이 누락되었을 경우 발생 */
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(MissingServletRequestParameterException.class)
	protected ErrorResponse handleMissingServletRequestParameterException(
		final MissingServletRequestParameterException e) {
		log.info("요청 파라미터가 누락되었습니다.");

		ErrorResponse.ErrorDetailResponse errorDetailResponse = ErrorResponse.ErrorDetailResponse
			.of(e.getParameterName(), null, e.getMessage());

		return ErrorResponse.of(MISSING_PARAMETER, List.of(errorDetailResponse));
	}

	/** 쿠키 누락 예외 처리 - 필수 요청 cookie가 누락되었을 경우 발생 */
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	@ExceptionHandler(MissingRequestCookieException.class)
	protected ErrorResponse handleMissingRequestCookieException(MissingRequestCookieException e) {
		log.info("필수 쿠키가 누락되었습니다.");

		ErrorResponse.ErrorDetailResponse errorDetailResponse = ErrorResponse.ErrorDetailResponse.of(e.getCookieName(),
			null,
			"필수 쿠키가 누락되었습니다.");

		return ErrorResponse.of(MISSING_COOKIE, List.of(errorDetailResponse));
	}

	/** 지원하지 않은 HTTP method 호출 할 경우 발생 */
	@ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	protected ErrorResponse handleHttpRequestMethodNotSupportedException(
		final HttpRequestMethodNotSupportedException e) {
		log.info("지원하지 않는 HTTP 메서드입니다.");

		return ErrorResponse.of(METHOD_NOT_ALLOWED);
	}

	/** 요청 본문 역직렬화 실패 예외 처리
	 * - record compact constructor 내부 예외도 Jackson이 wrapping 해서 여기로 들어올 수 있다.
	 */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	protected ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
		final HttpMessageNotReadableException e) {
		BusinessException businessException = findBusinessException(e);

		if (businessException != null) {
			ErrorCode errorCode = businessException.getErrorCode();
			log.info("요청 본문 역직렬화 중 비즈니스 예외가 발생했습니다. (CODE: {})", errorCode.getCode());
			return ResponseEntity.status(errorCode.getStatus()).body(ErrorResponse.of(errorCode));
		}

		log.info("잘못된 요청 본문입니다.");
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(INVALID_REQUEST));
	}

	/** 존재하지 않는 api가 호출될 경우 발생 */
	@ResponseStatus(HttpStatus.NOT_FOUND)
	@ExceptionHandler(NoHandlerFoundException.class)
	protected ErrorResponse handleNoHandlerFoundException(NoHandlerFoundException e) {
		log.info("지원하지 않은 API 요청입니다.");

		return ErrorResponse.of(API_NOT_FOUND);
	}

	/** 존재하지 않는 리소스가 호출될 경우 발생 */
	@ResponseStatus(HttpStatus.NOT_FOUND)
	@ExceptionHandler(NoResourceFoundException.class)
	protected ErrorResponse handleNoResourceFoundException(NoResourceFoundException e) {
		log.info("지원하지 않은 리소스 요청입니다.");

		return ErrorResponse.of(RESOURCE_NOT_FOUND);
	}

	/** 비즈니스 요구사항에 따른 예외 처리 */
	@ExceptionHandler(BusinessException.class)
	protected ResponseEntity<ErrorResponse> handleCustomException(BusinessException e) {
		log.info("비즈니스 요구사항에 따른 예외가 발생했습니다. (CODE: {})", e.getErrorCode().getCode());

		ErrorCode errorCode = e.getErrorCode();
		int status = errorCode.getStatus();

		return ResponseEntity.status(status).body(ErrorResponse.of(errorCode));
	}

	/** 서버 내부 예상하지 못한 오류 */
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	@ExceptionHandler(Exception.class)
	protected ErrorResponse handleException(Exception e) {
		log.error("서버 오류가 발생했습니다.", e);

		return ErrorResponse.of(INTERNAL_SERVER_ERROR);
	}

	private BusinessException findBusinessException(Throwable throwable) {
		Throwable current = throwable;

		while (current != null) {
			if (current instanceof BusinessException businessException) {
				return businessException;
			}
			current = current.getCause();
		}

		return null;
	}
}
