# IMPLEMENTATION_PLAY_TIME_SAVE

## Background / Context

마이페이지의 총 플레이 시간은 `/api/v1/members/me` 응답의 `totalPlayTime`을 기반으로 표시한다. REST API 명세와 ERD 기준 `totalPlayTime`은 초 단위다.

반면 싱글 게임 결과 저장 API의 `playTime` 요청 필드는 ms 단위다. 백엔드는 결과 저장 시 `request.playTime() / 1000`을 회원의 `totalPlayTime`에 누적한다.

기존 프론트 구현은 `playTimeMs / 1000` 값을 `playTime`으로 전송하고 있었다. 이 경우 백엔드에서 다시 `/ 1000`이 적용되어 짧은 플레이는 0초로 누적될 수 있었다.

## Decision

싱글 결과 저장 요청의 `playTime`은 게임 결과 atom의 `playTimeMs`를 반올림해 ms 단위 그대로 전송한다.

```ts
playTime: Math.round(result.playTimeMs)
```

결과 저장이 성공하면 마이페이지 기록 쿼리(`MYPAGE_QUERY_KEYS.myRecord`)를 invalidate한다. 사용자가 게임 종료 후 마이페이지를 열면 최신 `totalPlayTime`과 전적을 다시 조회한다.

## Caution

- 이미 잘못된 단위로 저장된 과거 플레이 시간은 프론트 수정만으로 복구되지 않는다.
- 게임 타이머는 StartModal에서 `game:start`가 발생한 뒤부터 종료까지의 실제 플레이 시간을 사용한다. 일시정지 중에는 Phaser 시간이 멈춘다.
- 마이페이지 표시 로직은 백엔드 응답의 초 단위를 `HH:MM:SS`로 포맷한다.

## Test Plan

- 싱글 게임 클리어 또는 게임오버 후 결과 저장 요청의 `playTime`이 ms 단위인지 확인한다.
- 결과 저장 후 `/api/v1/members/me` 재조회 시 `totalPlayTime`이 증가하는지 확인한다.
- 마이페이지에서 총 플레이 시간이 `HH:MM:SS` 형식으로 표시되는지 확인한다.
