# Dictionary Modal Typography

### Background / Context

도감 모달은 `features/dictionary/components/DictionaryModal.tsx`와 `CommandDetail.tsx`에서 명령어 목록과 상세 정보를 렌더링한다.

기존 도감 모달은 `index.css`에 등록된 `font-pixel` 커스텀 폰트를 명시적으로 사용하지 않았고, 목록/상세 영역의 텍스트 크기가 작아 명령어명이 한눈에 들어오지 않는 문제가 있었다. 특히 `git pull`, `git fetch`는 짧은 명령어라 목록 카드 안에서 다른 커맨드보다 시각적 강조가 필요했다.

### Decision

도감 모달 최상위 dialog 컨테이너에 `font-pixel`을 적용해 내부 텍스트가 `NeoDunggeunGothicPro`를 상속하도록 했다.

모달 내부의 Tailwind 텍스트 크기는 기존보다 한 단계씩 키웠다. 상세 제목은 `text-2xl`에서 `text-3xl`로, 본문/검색/상태 텍스트는 `text-sm`에서 `text-base`로, 작은 배지/목록 텍스트는 `text-xs`에서 `text-sm`로 조정했다.

목록의 `git pull`, `git fetch` 커맨드 이름은 `LARGE_COMMAND_NAMES` Set으로 분리해 `text-base`를 적용했다. 검색 input에는 모달 접근성 규칙에 맞춰 `aria-label`을 추가했다.

### Test Plan

- `npm run build`
- 도감 모달에서 커스텀 픽셀 폰트 적용 여부 확인
- 도감 목록에서 `git pull`, `git fetch` 커맨드명이 다른 목록 텍스트보다 크게 보이는지 확인
- 검색 input이 접근성 이름을 갖는지 확인
