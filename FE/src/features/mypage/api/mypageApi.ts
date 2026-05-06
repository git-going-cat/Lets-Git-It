import { http } from '@/core/http';

import type { MyRecord } from '../types/mypage.types';

// TODO: 마이페이지 전적 API 엔드포인트 확인 후 연동
export async function fetchMyRecord(): Promise<MyRecord> {
  return {
    nickname: 'dobby',
    authType: 'LOCAL',
    singleEasyBest: 0,
    singleNormalBest: 0,
    singleHardBest: 0,
    contributionTotal: 0,
    timeattackCount: 0,
    coopBestTime: '00:00.00',
  };
}

export async function checkNicknameDuplicate(nickname: string) {
  const { data } = await http.get('/api/v1/members/nickname/check', {
    params: { nickname },
  });
  return data;
}

export async function updateNickname(nickname: string) {
  const { data } = await http.patch('/api/v1/members/me/nickname', {
    nickname,
  });
  return data;
}

export async function verifyPassword(password: string) {
  const { data } = await http.post('/api/v1/members/me/password/verify', {
    password,
  });
  return data;
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const { data } = await http.patch('/api/v1/members/me/password/reset', {
    currentPassword,
    newPassword,
  });
  return data;
}
