# 캐릭터 에셋 시스템 가이드

## 개요

캐릭터 에셋은 온보딩(최초 설정)과 마이페이지(재설정) 두 곳에서 공통으로 사용됩니다.
핵심 유틸/컴포넌트는 `features/auth/` 아래에 위치하며, 마이페이지에서도 그대로 재활용합니다.

---

## 데이터 흐름

```
로그인 응답 (PATCH /api/v1/auth/login 또는 /api/v1/auth/reissue)
  └─ loginResponseData
       { characterHair, characterHairColor, characterBody,
         characterEye, characterOutfit, characterOutfitColor, ... }
            │
            ▼
     authStore.user  (zustand + localStorage persist)
       └─ AuthUser extends CharacterInfo  (6개 캐릭터 필드 포함)
            │
            ├─── [온보딩] CharacterSetup 단계
            │      useCharacterSetup(onComplete)
            │        ├─ useForm<CharacterFormValues>  (react-hook-form + zod)
            │        ├─ CHARACTER_OPTIONS             (characterAssets.ts)
            │        └─ onSubmit
            │             └─ onboardingApi.saveCharacter(values)
            │                  PATCH /api/v1/members/me/character
            │
            └─── [마이페이지] EditCharacterModal (재설정)
                   → 동일한 훅/컴포넌트 재사용 (아래 참고)
```

---

## 파일 구조 및 역할

| 파일 | 역할 |
|---|---|
| `features/auth/utils/characterAssets.ts` | 경로 빌더, 옵션 목록, 이미지 캐시 |
| `features/auth/schemas/onboarding.schema.ts` | `CharacterFormValues` zod 스키마 |
| `features/auth/hooks/useCharacterSetup.ts` | form 상태 + 저장 로직 |
| `features/auth/components/CharacterSetup.tsx` | 선택 UI (< > 네비게이션) |
| `features/auth/components/CharacterPreview.tsx` | canvas 미리보기 컴포넌트 |
| `features/auth/api/onboardingApi.ts` | `saveCharacter()` → PATCH API |
| `features/auth/store/authStore.ts` | 전역 유저 상태 (캐릭터 정보 포함) |

---

## 에셋 ID ↔ public/ 경로 매핑

`buildCharacterPaths(values)` (`characterAssets.ts`) 가 변환합니다.

| form 필드 | API ID 형식 | public/ 파일 경로 |
|---|---|---|
| `characterBody` | `Body_01` ~ `Body_09` | `/Bodies/48x48/Body_48x48_{nn}.png` |
| `characterEye` | `Eyes_01` ~ `Eyes_07` | `/Eyes/48x48/Eyes_48x48_{nn}.png` |
| `characterHair` | `Hairstyle_01` ~ `Hairstyle_29` | `/Hairstyles/48x48/Hairstyle_{style}_48x48_{color}.png` |
| `characterHairColor` | `Hairstyle-color_01` ~ `_07` | (hair 경로의 color 부분) |
| `characterOutfit` | `Outfit_01` ~ `Outfit_33` | `/Outfits/48x48/Outfit_{style}_48x48_{color}.png` |
| `characterOutfitColor` | `Outfit-color_01` ~ `_NN` | (outfit 경로의 color 부분) |

---

## 스프라이트 시트 구조

- 프레임 크기: **48 × 96 px**
- 행(Row) 기준:
  - Row 0: 기타
  - Row 1 (`y=96`): **Idle** ← 미리보기에 사용
  - Row 2 (`y=192`): Walk
  - ...
- 방향 순서(가로): right → back → left → **front**
  - Idle 정면: `right×6 + back×6 + left×6 = 18프레임` 건너뜀
  - `srcX = 18 * 48 = 864`, `srcY = 96`
- 렌더 레이어 순서: `body → eyes → outfit → hair`

---

## CharacterPreview 컴포넌트

```tsx
import CharacterPreview from '@/features/auth/components/CharacterPreview';

// values: CharacterFormValues 타입
<CharacterPreview values={values} />
```

- canvas 내부: `48 × 96` (픽셀아트 원본)
- CSS 표시: `w-36 h-72` (144 × 288, 3배 확대)
- `image-rendering: pixelated` 적용

---

## 마이페이지에서 재활용하는 방법

`features/mypage/components/EditCharacterModal.tsx` 에 아래 패턴으로 구현합니다.

### 재사용 목록

| 재활용 대상 | import 경로 |
|---|---|
| `<CharacterPreview>` | `@/features/auth/components/CharacterPreview` |
| `CHARACTER_OPTIONS` | `@/features/auth/hooks/useCharacterSetup` |
| `getHairColorOptions`, `getOutfitColorOptions` | `@/features/auth/utils/characterAssets` |
| `characterFormSchema` / `CharacterFormValues` | `@/features/auth/schemas/onboarding.schema` |
| `buildCharacterPaths`, `loadImage` | `@/features/auth/utils/characterAssets` |
| `onboardingApi.saveCharacter()` | `@/features/auth/api/onboardingApi` |
| `useAuthStore` | `@/features/auth/store/authStore` |

### 구현 패턴

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { onboardingApi } from '@/features/auth/api/onboardingApi';
import CharacterPreview from '@/features/auth/components/CharacterPreview';
import { CHARACTER_OPTIONS } from '@/features/auth/hooks/useCharacterSetup';
import { characterFormSchema, type CharacterFormValues } from '@/features/auth/schemas/onboarding.schema';
import { getHairColorOptions, getOutfitColorOptions } from '@/features/auth/utils/characterAssets';
import { useAuthStore } from '@/features/auth/store/authStore';

export default function EditCharacterModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  // ① authStore.user의 현재 캐릭터 정보를 defaultValues로 주입
  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: {
      characterHair: user?.characterHair ?? 'Hairstyle_01',
      characterHairColor: user?.characterHairColor ?? 'Hairstyle-color_01',
      characterBody: user?.characterBody ?? 'Body_01',
      characterEye: user?.characterEye ?? 'Eyes_01',
      characterOutfit: user?.characterOutfit ?? 'Outfit_01',
      characterOutfitColor: user?.characterOutfitColor ?? 'Outfit-color_01',
    },
  });

  const onSubmit = async (values: CharacterFormValues) => {
    // ② 온보딩과 동일한 PATCH API 호출
    await onboardingApi.saveCharacter(values);
    // ③ 스토어 갱신 → 다른 화면에서도 즉시 반영
    updateUser(values);
    onClose();
  };

  const values = form.watch();

  // ④ 색상 옵션은 선택한 스타일에 따라 동적으로 계산 (CHARACTER_OPTIONS에 hairColor/outfitColor 없음)
  const hairColorOptions = getHairColorOptions(values.characterHair);
  const outfitColorOptions = getOutfitColorOptions(values.characterOutfit);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ⑤ 미리보기: 그대로 재사용 */}
      <CharacterPreview values={values} />

      {/* ⑥ 선택 UI: CharacterSetup 컴포넌트 통째로 넣거나, 동일한 < > 패턴으로 직접 구성 */}
      {/* CHARACTER_OPTIONS.hair, .body, .eye, .outfit + hairColorOptions, outfitColorOptions 사용 */}
    </form>
  );
}
```

### 핵심 차이점 (온보딩 vs 마이페이지)

| 항목 | 온보딩 | 마이페이지 |
|---|---|---|
| `defaultValues` | `DEFAULT_CHARACTER_VALUES` (고정 초기값) | `authStore.user` (현재 착용 중인 값) |
| `onComplete` / `onClose` | 다음 온보딩 단계로 이동 | 모달 닫기 |
| 저장 후 스토어 업데이트 | `useCharacterSetup` 내부에서 자동 처리 | 직접 `updateUser(values)` 호출 필요 |
| 색상 옵션 | `getHairColorOptions()` / `getOutfitColorOptions()` 동적 계산 | 동일 |
