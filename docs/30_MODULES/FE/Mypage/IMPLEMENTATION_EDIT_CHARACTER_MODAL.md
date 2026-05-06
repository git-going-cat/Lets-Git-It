# Edit Character Modal

## Background / Context

마이페이지에서 사용자가 온보딩 때 설정한 캐릭터를 다시 수정할 수 있는 UI가 필요했다.
기존 캐릭터 렌더링과 에셋 ID 체계는 온보딩 구현에서 이미 사용 중인 `CharacterPreview`,
`characterAssets.ts`, `PATCH /api/v1/members/me/character` 흐름을 따른다.

요청 프롬프트에는 `src/assets/character/{category}/{id}.png` 및 소문자 ID 예시가 있었지만,
현재 프로젝트의 실제 에셋과 REST 문서는 `FE/public/*/48x48` 경로와
`Body_01`, `Eyes_01`, `Hairstyle_01`, `Outfit_01` 형식을 사용한다.

## Decision

마이페이지 캐릭터 수정 모달은 기존 `Win11Window` 모달 쉘을 재사용하고,
미리보기는 온보딩과 동일한 `CharacterPreview`를 사용한다.

선택 UI는 `AssetSelector` 공용 컴포넌트로 분리했다. BODY, EYES, HAIRSTYLE, OUTFIT,
색상 선택 행이 동일한 `< 현재 / 전체 >` 순환 구조를 사용하기 때문이다.

서버 상태는 TanStack Query의 `myRecord` 캐시로 관리한다. 캐릭터 저장 성공 시
`myRecord` 쿼리를 invalidate해서 `GET /api/v1/members/me` 응답을 다시 가져오도록 했다.
캐릭터 정보는 Zustand/Jotai에 중복 저장하지 않는다.

## Caution

현재 `src/assets/character` 아래에는 실제 png 파일이 없고 `.gitkeep`만 있다.
따라서 `import.meta.glob` 결과가 비어 있으면 온보딩에서 사용하는 내부 에셋 옵션을 fallback으로 사용한다.

프로젝트에 별도 Toast 시스템이 아직 없어 저장 성공/실패 알림은 기존 마이페이지 패턴과 동일하게
`alert`를 사용했다. Toast 컴포넌트가 도입되면 `useEditCharacter`의 알림 처리만 교체하면 된다.

## Test Plan

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`
- 마이페이지에서 캐릭터 수정 버튼 클릭 시 모달이 열리는지 확인
- BODY/EYES/HAIRSTYLE/OUTFIT 및 색상 선택 시 preview가 즉시 변경되는지 확인
- 저장 성공 후 `myRecord` 쿼리가 무효화되어 마이페이지 캐릭터가 최신 값으로 갱신되는지 확인
