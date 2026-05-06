/**
 * 캐릭터 에셋 경로 빌더
 *
 * public/ 폴더 구조:
 *   Bodies/48x48/Body_48x48_{skinNum}.png          (01~09)
 *   Eyes/48x48/Eyes_48x48_{eyeNum}.png             (01~07)
 *   Hairstyles/48x48/Hairstyle_{style}_48x48_{color}.png  (style 01~29, color 01~07)
 *   Outfits/48x48/Outfit_{style}_48x48_{color}.png        (style 01~33, color varies)
 *
 * API ID 형식:
 *   characterBody:       "Body_01" ~ "Body_09"
 *   characterEye:        "Eyes_01" ~ "Eyes_07"  (Eyes_48x48_ prefix는 파일명에서만)
 *   characterHair:       "Hairstyle_01" ~ "Hairstyle_29"
 *   characterHairColor:  "Hairstyle-color_01" ~ "Hairstyle-color_07"
 *   characterOutfit:     "Outfit_01" ~ "Outfit_33"
 *   characterOutfitColor:"Outfit-color_01" ~ "Outfit-color_NN"
 */

import type { CharacterFormValues } from '../schemas/onboarding.schema';

/** API ID → public 경로 변환 */
export function buildCharacterPaths(values: CharacterFormValues): CharacterLayerPaths {
  const bodyNum = extractNum(values.characterBody); // "Body_01" → "01"
  const eyeNum = extractNum(values.characterEye); // "Eyes_01" → "01"
  const hairStyle = extractNum(values.characterHair); // "Hairstyle_01" → "01"
  const hairColorNum = extractColorNum(values.characterHairColor); // "Hairstyle-color_01" → "01"
  const outfitStyle = extractNum(values.characterOutfit); // "Outfit_01" → "01"
  const outfitColorNum = extractColorNum(values.characterOutfitColor); // "Outfit-color_01" → "01"

  return {
    body: `/Bodies/48x48/Body_48x48_${bodyNum}.png`,
    eyes: `/Eyes/48x48/Eyes_48x48_${eyeNum}.png`,
    hair: `/Hairstyles/48x48/Hairstyle_${hairStyle}_48x48_${hairColorNum}.png`,
    outfit: `/Outfits/48x48/Outfit_${outfitStyle}_48x48_${outfitColorNum}.png`,
  };
}

export interface CharacterLayerPaths {
  body: string;
  eyes: string;
  hair: string;
  outfit: string;
}

/** "Body_01" → "01", "Eyes_03" → "03", "Hairstyle_12" → "12", "Outfit_05" → "05" */
function extractNum(id: string): string {
  const match = id.match(/(\d+)$/);
  return match ? match[1].padStart(2, '0') : '01';
}

/** "Hairstyle-color_03" → "03", "Outfit-color_02" → "02" */
function extractColorNum(id: string): string {
  const match = id.match(/(\d+)$/);
  return match ? match[1].padStart(2, '0') : '01';
}

// ── 선택 옵션 목록 ────────────────────────────────────────────────────────────

/** 숫자 범위로 옵션 배열 생성 */
function range(prefix: string, count: number, label: string): { id: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return { id: `${prefix}${num}`, label: `${label} ${i + 1}` };
  });
}

export const CHARACTER_ASSET_OPTIONS = {
  /** Body_01 ~ Body_09 */
  body: range('Body_', 9, '피부'),
  /** Eyes_01 ~ Eyes_07  (파일명은 Eyes_48x48_NN, API값은 Eyes_NN) */
  eye: range('Eyes_', 7, '눈'),
  /** Hairstyle_01 ~ Hairstyle_29 */
  hair: range('Hairstyle_', 29, '헤어'),
  /** Outfit_01 ~ Outfit_33 */
  outfit: range('Outfit_', 33, '복장'),
} as const;

/**
 * 헤어 스타일별 실제 색상 수 (index 0 = Hairstyle_01)
 * 출처: 스프라이트 시트 파일 목록 기준
 */
export const HAIR_COLOR_COUNTS: readonly number[] = [
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6,
];

/**
 * 복장 스타일별 실제 색상 수 (index 0 = Outfit_01)
 * 출처: 스프라이트 시트 파일 목록 기준
 */
export const OUTFIT_COLOR_COUNTS: readonly number[] = [
  10, 4, 4, 3, 5, 4, 4, 3, 3, 5, 4, 3, 4, 5, 3, 3, 3, 4, 4, 3, 4, 4, 4, 4, 5, 3, 3, 4, 4, 3, 5, 5,
  3,
];

/** 선택된 헤어 스타일 ID에 대해 유효한 색상 옵션만 반환 */
export function getHairColorOptions(hairStyleId: string): { id: string; label: string }[] {
  const num = parseInt(hairStyleId.match(/(\d+)$/)?.[1] ?? '1', 10);
  const count = HAIR_COLOR_COUNTS[num - 1] ?? 7;
  return range('Hairstyle-color_', count, '헤어 색');
}

/** 선택된 복장 스타일 ID에 대해 유효한 색상 옵션만 반환 */
export function getOutfitColorOptions(outfitStyleId: string): { id: string; label: string }[] {
  const num = parseInt(outfitStyleId.match(/(\d+)$/)?.[1] ?? '1', 10);
  const count = OUTFIT_COLOR_COUNTS[num - 1] ?? 5;
  return range('Outfit-color_', count, '복장 색');
}

/** 기본값 (로그인 후 서버에서 내려오는 디폴트와 맞춤) */
export const DEFAULT_CHARACTER_VALUES: CharacterFormValues = {
  characterHair: 'Hairstyle_01',
  characterHairColor: 'Hairstyle-color_01',
  characterBody: 'Body_01',
  characterEye: 'Eyes_01',
  characterOutfit: 'Outfit_01',
  characterOutfitColor: 'Outfit-color_01',
};

/**
 * 이미지를 메모리에 캐싱하여 반복 요청을 방지합니다.
 * 모듈 레벨에서 선언하여 컴포넌트 리렌더링과 무관하게 유지됩니다.
 */
const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
