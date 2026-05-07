import type { Command } from '../types/single.types';

/** 명령어가 레인 상단에서 중앙 freeze 위치까지 낙하하는 시간 (ms) */
export const TUTORIAL_FALL_DURATION_MS = 2000;
/** 블러 오버레이가 유지되는 시간 (ms) — 낙하 완료보다 약간 길게 */
export const TUTORIAL_BLUR_DURATION_MS = 2500;

export interface TutorialStepMeta {
  title: string;
  description: string;
  explanation: string;
}

/**
 * 튜토리얼 전용 커맨드셋 (step 1 git clone은 StartModal 처리, seq 0~12 = step 2~13).
 * EASY 난이도로 구동하며 SWITCH 커맨드도 레인에 명시적으로 표시됩니다.
 */
export const TUTORIAL_COMMAND_SET: Command[] = [
  {
    commandSequence: 0,
    text: 'git switch -c feature/login',
    displayText: 'git switch -c feature/login',
    branchName: 'main',
    type: 'CREATE',
  },
  {
    commandSequence: 1,
    text: 'git add .',
    displayText: 'git add .',
    branchName: 'feature/login',
    type: 'COMMON',
  },
  {
    commandSequence: 2,
    text: 'git commit -m "feat: add login page"',
    displayText: 'git commit -m "feat: add login page"',
    branchName: 'feature/login',
    type: 'COMMON',
  },
  {
    commandSequence: 3,
    text: 'git push origin feature/login',
    displayText: 'git push origin feature/login',
    branchName: 'feature/login',
    type: 'COMMON',
  },
  {
    commandSequence: 4,
    text: 'git switch main',
    displayText: 'git switch main',
    branchName: 'feature/login',
    type: 'SWITCH',
  },
  {
    commandSequence: 5,
    text: 'git switch -c feature/signup',
    displayText: 'git switch -c feature/signup',
    branchName: 'main',
    type: 'CREATE',
  },
  {
    commandSequence: 6,
    text: 'git add .',
    displayText: 'git add .',
    branchName: 'feature/signup',
    type: 'COMMON',
  },
  {
    commandSequence: 7,
    text: 'git commit -m "feat: add signup page"',
    displayText: 'git commit -m "feat: add signup page"',
    branchName: 'feature/signup',
    type: 'COMMON',
  },
  {
    commandSequence: 8,
    text: 'git push origin feature/signup',
    displayText: 'git push origin feature/signup',
    branchName: 'feature/signup',
    type: 'COMMON',
  },
  {
    commandSequence: 9,
    text: 'git switch main',
    displayText: 'git switch main',
    branchName: 'feature/signup',
    type: 'SWITCH',
  },
  {
    commandSequence: 10,
    text: 'git merge feature/login',
    displayText: 'git merge feature/login',
    branchName: 'main',
    type: 'MERGE',
  },
  {
    commandSequence: 11,
    text: 'git merge feature/signup',
    displayText: 'git merge feature/signup',
    branchName: 'main',
    type: 'MERGE',
  },
  {
    commandSequence: 12,
    text: 'git push origin main',
    displayText: 'git push origin main',
    branchName: 'main',
    type: 'COMMON',
  },
];

/**
 * 단계별 메타 정보.
 * 인덱스 0 = step 1 (git clone, StartModal 용)
 * 인덱스 1~13 = commandSequence 0~12 (튜토리얼 오버레이 용)
 */
export const TUTORIAL_STEP_META: TutorialStepMeta[] = [
  {
    title: '게임 시작',
    description: '프로젝트를 가져오는 것부터 시작해요. git clone으로 게임을 시작합니다.',
    explanation: '원격 저장소를 내 컴퓨터로 복사합니다. 모든 모드는 이 명령어로 시작해요.',
  },
  {
    title: '새 브랜치 만들기',
    description: 'switch -c로 새 브랜치를 만들고 바로 이동해봐요.',
    explanation: '새 브랜치를 생성하면서 동시에 이동합니다. -c는 create의 줄임말이에요.',
  },
  {
    title: '변경 사항 스테이징',
    description: '작업한 파일을 커밋 대기열에 올려요.',
    explanation: "변경된 파일을 스테이징 영역에 추가합니다. '.'은 모든 변경 파일을 의미해요.",
  },
  {
    title: '커밋하기',
    description: '스테이징한 내용을 기록으로 남겨요.',
    explanation: '변경 사항을 저장소에 기록합니다. 어떤 작업을 했는지 메시지로 남겨요.',
  },
  {
    title: '원격 저장소에 올리기',
    description: '내 브랜치를 원격 저장소에 올려봐요.',
    explanation: '로컬 브랜치의 커밋을 원격 저장소(origin)에 업로드합니다.',
  },
  {
    title: '브랜치 이동하기',
    description: 'switch로 브랜치를 이동할 수 있어요. main으로 돌아가볼게요.',
    explanation: '이미 있는 브랜치로 이동합니다. -c 없이 쓰면 이동만 해요.',
  },
  {
    title: '새 브랜치 만들기',
    description: '이번엔 두 번째 브랜치를 만들어봐요.',
    explanation: '새 브랜치를 생성하면서 동시에 이동합니다.',
  },
  {
    title: '변경 사항 스테이징',
    description: '작업한 파일을 다시 스테이징해요.',
    explanation: '변경된 파일을 스테이징 영역에 추가합니다.',
  },
  {
    title: '커밋하기',
    description: '스테이징한 내용을 기록으로 남겨요.',
    explanation: '변경 사항을 저장소에 기록합니다.',
  },
  {
    title: '원격 저장소에 올리기',
    description: '새 브랜치를 원격 저장소에 올려요.',
    explanation: '로컬 브랜치의 커밋을 원격 저장소(origin)에 업로드합니다.',
  },
  {
    title: 'main으로 돌아가기',
    description: '브랜치를 합치려면 먼저 main으로 이동해야 해요.',
    explanation: '머지 작업은 합쳐질 기준 브랜치에서 진행합니다.',
  },
  {
    title: '브랜치 합치기',
    description: '작업한 브랜치들을 main에 합쳐봐요.',
    explanation: '다른 브랜치의 작업 내용을 현재 브랜치로 가져와 합칩니다. 순서대로 진행해요.',
  },
  {
    title: '브랜치 합치기',
    description: 'feature/signup 브랜치도 main에 합쳐봐요.',
    explanation: '다른 브랜치의 작업 내용을 현재 브랜치로 가져와 합칩니다.',
  },
  {
    title: '최종 반영',
    description: '합쳐진 main 브랜치를 원격 저장소에 올리면 끝이에요!',
    explanation: '머지된 main 브랜치를 원격 저장소에 최종 반영합니다.',
  },
];

/** git clone URL (StartModal expectedCommand 용) */
export const TUTORIAL_CLONE_URL = 'https://github.com/gitcat/project.git';
