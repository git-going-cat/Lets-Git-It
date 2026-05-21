import { http } from '@/core/http';
import { useAuthStore } from '@/features/auth/store/authStore';

import {
  emptyMyPageResponseSchema,
  myAuthUserResponseSchema,
  myPageResponseSchema,
} from '../schemas/mypage.schema';

import type {
  MyAuthUserResponseData,
  MyPageRecord,
  MyPageResponseData,
} from '../schemas/mypage.schema';
import type { CharacterAsset, MyRecord } from '../types/mypage.types';
import type { AuthUser } from '@/features/auth/types/auth.types';

interface WithdrawMemberRequest {
  password?: string;
}

export async function fetchMyRecord(): Promise<MyRecord> {
  const { data } = await http.get('/api/v1/members/me');
  const parsed = myPageResponseSchema.parse(data);

  return toMyRecord(parsed.data);
}

export async function fetchMyAuthUser(): Promise<AuthUser> {
  const { data } = await http.get('/api/v1/members/me');
  const parsed = myAuthUserResponseSchema.parse(data);

  return toAuthUser(parsed.data);
}

function toAuthUser(data: MyAuthUserResponseData): AuthUser {
  return {
    memberId: data.memberId ?? useAuthStore.getState().user?.memberId ?? null,
    nickname: data.nickname,
    onboardingStatus:
      data.onboardingStatus ?? useAuthStore.getState().user?.onboardingStatus ?? 'NONE',
    characterHair: data.characterHair ?? 'Hairstyle_01',
    characterHairColor: data.characterHairColor ?? 'Hairstyle-color_01',
    characterBody: data.characterBody ?? 'Body_01',
    characterEye: data.characterEye ?? 'Eyes_01',
    characterOutfit: data.characterOutfit ?? 'Outfit_01',
    characterOutfitColor: data.characterOutfitColor ?? 'Outfit-color_01',
  };
}

function toMyRecord(data: MyPageResponseData): MyRecord {
  const singleEasy = findRecord(data.records, 'SINGLE_EASY');
  const singleNormal = findRecord(data.records, 'SINGLE_NORMAL');
  const singleHard = findRecord(data.records, 'SINGLE_HARD');
  const contribution = findRecord(data.records, 'CONTRIBUTION');
  const timeattack = findRecord(data.records, 'TIME_ATTACK');
  const coop = findRecord(data.records, 'COOP');

  return {
    nickname: data.nickname ?? '',
    authType: data.authType,
    totalPlayTime: formatTotalPlayTime(data.totalPlayTime),
    characterHair: data.characterHair,
    characterHairColor: data.characterHairColor,
    characterBody: data.characterBody,
    characterEye: data.characterEye,
    characterOutfit: data.characterOutfit,
    characterOutfitColor: data.characterOutfitColor,
    singleEasyBest: singleEasy?.bestScore ?? 0,
    singleNormalBest: singleNormal?.bestScore ?? 0,
    singleHardBest: singleHard?.bestScore ?? 0,
    contributionTotal: contribution?.totalContribution ?? 0,
    timeattackCount: timeattack?.totalCount ?? 0,
    coopBestTime: formatClearTime(coop?.bestClearTime),
  };
}

function findRecord(records: MyPageRecord[], mode: MyPageRecord['mode']) {
  return records.find((record) => record.mode === mode);
}

function formatClearTime(milliseconds?: number) {
  if (milliseconds == null) return '00:00.00';

  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((milliseconds % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    centiseconds
  ).padStart(2, '0')}`;
}

function formatTotalPlayTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

export async function checkNicknameDuplicate(nickname: string) {
  const { data } = await http.get('/api/v1/members/nickname/check', {
    params: { nickname },
  });
  emptyMyPageResponseSchema.parse(data);
}

export async function updateNickname(nickname: string) {
  const { data } = await http.patch('/api/v1/members/me/nickname', {
    nickname,
  });
  emptyMyPageResponseSchema.parse(data);
}

export async function saveCharacterAsset(asset: CharacterAsset): Promise<void> {
  const { data } = await http.patch('/api/v1/members/me/character', asset);
  emptyMyPageResponseSchema.parse(data);
}

export async function verifyPassword(password: string) {
  const { data } = await http.post('/api/v1/members/me/password/verify', {
    password,
  });
  emptyMyPageResponseSchema.parse(data);
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const { data } = await http.patch('/api/v1/members/me/password/reset', {
    currentPassword,
    newPassword,
  });
  emptyMyPageResponseSchema.parse(data);
}

export async function withdrawMember(body: WithdrawMemberRequest): Promise<void> {
  const { data } = await http.delete('/api/v1/members/withdraw', {
    data: body,
  });
  emptyMyPageResponseSchema.parse(data);
}
