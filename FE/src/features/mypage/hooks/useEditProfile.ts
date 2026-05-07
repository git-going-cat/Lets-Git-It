import { useMutation } from '@tanstack/react-query';

import {
  checkNicknameDuplicate,
  updateNickname,
  updatePassword,
  verifyPassword,
  withdrawMember,
} from '../api/mypageApi';

/**
 * 닉네임 중복 확인 요청 상태를 관리합니다.
 */
export function useCheckNickname() {
  return useMutation({
    mutationFn: (nickname: string) => checkNicknameDuplicate(nickname),
  });
}

/**
 * 닉네임 변경 요청 상태를 관리합니다.
 */
export function useUpdateNickname() {
  return useMutation({
    mutationFn: (nickname: string) => updateNickname(nickname),
  });
}

/**
 * 현재 비밀번호 검증 요청 상태를 관리합니다.
 */
export function useVerifyPassword() {
  return useMutation({
    mutationFn: (password: string) => verifyPassword(password),
  });
}

/**
 * 비밀번호 변경 요청 상태를 관리합니다.
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => updatePassword(currentPassword, newPassword),
  });
}

/**
 * 회원 탈퇴 요청 상태를 관리합니다.
 */
export function useWithdrawMember() {
  return useMutation({
    mutationFn: (password?: string) => withdrawMember(password ? { password } : {}),
  });
}
