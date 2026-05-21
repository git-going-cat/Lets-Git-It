/** 명령어가 레인 상단에서 중앙 freeze 위치까지 낙하하는 시간 (ms) */
export const TUTORIAL_FALL_DURATION_MS = 2000;
/** 블러 오버레이가 유지되는 시간 (ms) — 낙하 완료보다 약간 길게 */
export const TUTORIAL_BLUR_DURATION_MS = 2500;

export type TutorialStepBehavior = 'INFO' | 'PRACTICE' | 'ITEM_USE';
export type TutorialHighlightTarget =
  | 'lanes'
  | 'cat-churu'
  | 'hud-lives'
  | 'hud-combo'
  | 'item-slot'
  | 'history';
export type TutorialItemKind = 'restore' | 'stash' | 'cherry-pick';
export type TutorialItemSlot = 0 | 1 | 2;

/** StartModal이 step 1을 커버하므로 game:start 후 시작하는 stepIndex */
export const TUTORIAL_START_STEP = 2;

/**
 * step 1개의 메타데이터. step 추가/이동/삭제 시 이 객체 한 곳만 수정한다.
 * 아래 derived export 6종이 이 객체로부터 자동 생성되므로 사용처 코드는 그대로.
 */
export interface TutorialStepMeta {
  behavior: TutorialStepBehavior;
  /** 진입 시 강조할 UI 영역 */
  highlight?: TutorialHighlightTarget[];
  /** ITEM_USE에서 사용해야 하는 슬롯 (0=stash, 1=cherry-pick, 2=restore) */
  itemUseSlot?: TutorialItemSlot;
  /** ITEM_USE이지만 command 노드도 함께 표시해야 하는 step */
  showCommand?: true;
  /** 진입 시 lives -1 (restore 학습 효과 시각화) */
  forceMiss?: true;
  /** PRACTICE 처리 후 획득하는 아이템 */
  itemDrop?: TutorialItemKind;
}

export const TUTORIAL_STEPS_META: Record<number, TutorialStepMeta> = {
  1: { behavior: 'INFO' },
  2: { behavior: 'INFO', highlight: ['hud-lives', 'hud-combo'] },
  3: { behavior: 'PRACTICE' },
  4: { behavior: 'INFO', highlight: ['history', 'cat-churu'] },
  5: { behavior: 'PRACTICE', itemDrop: 'cherry-pick' },
  6: { behavior: 'PRACTICE', itemDrop: 'restore' },
  7: { behavior: 'PRACTICE', itemDrop: 'stash' },
  8: {
    behavior: 'ITEM_USE',
    itemUseSlot: 1,
    showCommand: true,
    highlight: ['item-slot'],
  },
  9: { behavior: 'PRACTICE' },
  10: { behavior: 'PRACTICE' },
  11: { behavior: 'INFO', forceMiss: true, highlight: ['hud-lives'] },
  12: { behavior: 'ITEM_USE', itemUseSlot: 2, highlight: ['item-slot'] },
  13: { behavior: 'PRACTICE' },
};

// ── derived exports ──────────────────────────────────────────────────────────
// 사용처는 모두 아래 6개 const를 import. step 추가/이동 시 META만 수정하면 자동 반영.

function buildRecord<V>(pick: (m: TutorialStepMeta) => V | undefined): Record<number, V> {
  const out: Record<number, V> = {};
  for (const [k, meta] of Object.entries(TUTORIAL_STEPS_META)) {
    const v = pick(meta);
    if (v !== undefined) out[Number(k)] = v;
  }
  return out;
}

function buildList(pick: (m: TutorialStepMeta) => boolean): number[] {
  return Object.entries(TUTORIAL_STEPS_META)
    .filter(([, meta]) => pick(meta))
    .map(([k]) => Number(k));
}

export const TUTORIAL_STEP_BEHAVIOR: Record<number, TutorialStepBehavior> = buildRecord(
  (m) => m.behavior
);

export const TUTORIAL_ITEM_DROPS: Record<number, TutorialItemKind> = buildRecord((m) => m.itemDrop);

export const TUTORIAL_ITEM_USE_SLOT: Record<number, TutorialItemSlot> = buildRecord(
  (m) => m.itemUseSlot
);

export const TUTORIAL_ITEM_USE_SHOW_COMMAND_STEPS: number[] = buildList(
  (m) => m.showCommand === true
);

export const TUTORIAL_HIGHLIGHT_TARGETS: Record<number, TutorialHighlightTarget[]> = buildRecord(
  (m) => m.highlight
);

/**
 * 진입 시 인위적으로 lives를 1 감소시키는 stepIndex 목록.
 * step 11 INFO 진입 시점에 한 칸 감소시켜 step 12 restore 아이템 효과를 실제로 보이게 함.
 */
export const TUTORIAL_FORCE_MISS_STEPS: number[] = buildList((m) => m.forceMiss === true);
