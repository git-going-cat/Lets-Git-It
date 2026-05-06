import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
  checkNicknameDuplicate,
  updateNickname,
  updatePassword,
  verifyPassword,
  withdrawMember,
} from '../api/mypageApi';

export function useCheckNickname() {
  return useMutation({
    mutationFn: (nickname: string) => checkNicknameDuplicate(nickname),
  });
}

export function useUpdateNickname() {
  return useMutation({
    mutationFn: (nickname: string) => updateNickname(nickname),
  });
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: (password: string) => verifyPassword(password),
    onError: (error) => {
      if (isAxiosError(error) && error.response) {
        console.error(error.response.data.message);
      }
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => updatePassword(currentPassword, newPassword),
    onError: (error) => {
      if (isAxiosError(error) && error.response) {
        console.error(error.response.data.message);
      }
    },
  });
}

export function useWithdrawMember() {
  return useMutation({
    mutationFn: (password?: string) => withdrawMember(password ? { password } : {}),
  });
}
