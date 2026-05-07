export const WITHDRAWAL_DELETED_ITEMS = [
  '현재 로그인 된 계정 정보',
  '모든 게임 기록',
  '캐릭터 설정 및 프로필 정보',
] as const;

export const ACCOUNT_ACTION_COPY = {
  logout: {
    title: '로그아웃',
    description: '로그아웃 하시겠습니까?',
    confirmLabel: '예',
    cancelLabel: '아니오',
  },
  withdraw: {
    title: '회원탈퇴',
    description:
      '정말로 탈퇴하시겠어요?\n\n탈퇴 시 모든 게임 기록과 현재 로그인 된 계정 정보가 모두 사라지며, 이는 복구할 수 없습니다.',
    confirmLabel: '탈퇴하기',
    cancelLabel: '취소',
    passwordLabel: '현재 비밀번호',
    passwordPlaceholder: '현재 비밀번호를 입력하세요',
  },
} as const;
