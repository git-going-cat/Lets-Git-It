# PII 분석 가드 구현 가이드

> 구현 날짜: 2026-05-11  
> 브랜치: `feat/FE-220-memberId-추가`

---

## 1. 목적

PostHog analytics에서 닉네임(PII)을 제거하고 `memberId`(불투명 식별자)로 대체.  
OAuth callback URL의 `code`/`state` querystring이 pageview 이벤트에 포함되는 문제도 함께 수정.

---

## 2. 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/features/auth/schemas/response.schema.ts` | `loginResponseDataSchema`에 `memberId: z.string()` 추가 |
| `src/features/mypage/schemas/mypage.schema.ts` | `myAuthUserResponseDataSchema`에 `memberId: z.string().optional()` 추가 |
| `src/features/auth/types/auth.types.ts` | `AuthUser`에 `memberId: string \| null` 추가 |
| `src/features/auth/hooks/useAuth.ts` | `toAuthUser`에 memberId 매핑, `identifyUser(res.memberId)` 호출 |
| `src/lib/analytics.ts` | `identifyUser` 파라미터 `nickname → memberId`, nickname props 제거 |
| `src/features/mypage/api/mypageApi.ts` | `toAuthUser`에 memberId fallback 추가 |
| `src/providers/PostHogProvider.tsx` | pageview 캡처 전 `code`/`state` querystring strip |

---

## 3. 상세 변경

### 3-1. `analytics.ts` identifyUser

**변경 전**
```ts
identifyUser: (nickname: string) => {
  posthog.identify(nickname, { nickname });
}
```

**변경 후**
```ts
identifyUser: (memberId: string) => {
  if (!isEnabled || !memberId) return;
  posthog.identify(memberId);
}
```

- PostHog의 distinct_id로 닉네임 대신 memberId 사용 → 닉네임 PII 제거
- `{ nickname }` props 제거 → PostHog 프로필에 닉네임 저장 안 됨

### 3-2. `mypageApi.ts` memberId fallback

BE의 `GET /api/v1/members/me` 응답에 아직 `memberId`가 없으므로 fallback 적용:

```ts
memberId: data.memberId ?? useAuthStore.getState().user?.memberId ?? null,
```

로그인 시 저장된 memberId를 유지. BE에서 me 엔드포인트에 memberId 추가 후 fallback 제거 가능.

### 3-3. `PostHogProvider.tsx` URL 정규화

```ts
const url = new URL(window.location.href);
url.searchParams.delete('code');
url.searchParams.delete('state');
posthogClient.capture('$pageview', { $current_url: url.toString() });
```

OAuth callback 완료 전 pageview가 캡처될 경우 임시 code/state가 PostHog에 기록되는 문제 방지.

---

## 4. BE 의존성 및 TODO

### 현재 상태
- `POST /api/v1/auth/login` 응답에 `memberId` 포함 ✅ (BE 반영 완료)
- `GET /api/v1/members/me` 응답에 `memberId` 미포함 ⚠️

### BE 요청 사항
`GET /api/v1/members/me` (`MemberProfileResponse`)에 `memberId` 필드 추가 필요.

### FE 후속 작업 (BE 반영 후)
`src/features/mypage/api/mypageApi.ts:toAuthUser`에서 fallback 제거:

```ts
// 제거 대상
memberId: data.memberId ?? useAuthStore.getState().user?.memberId ?? null,

// 변경 후
memberId: data.memberId,
```

그리고 `mypage.schema.ts`의 `memberId: z.string().optional()` → `z.string()`으로 변경.
