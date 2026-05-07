import { http } from '@/core/http';

import { nicknameSchema, tutorialResponseSchema } from '../schemas/onboarding.schema';
import { emptyResponseSchema } from '../schemas/response.schema';

import type { CharacterFormValues } from '../types/onboarding.types';

export const onboardingApi = {
  /**
   * 닉네임 저장.
   * 성공 시 onboardingStatus → NICKNAME_SET_DONE
   */
  saveNickname: async (nickname: string) => {
    nicknameSchema.parse(nickname);
    const res = await http.post('/api/v1/members/me/nickname', { nickname });
    emptyResponseSchema.parse(res.data);
  },

  /**
   * 닉네임 중복 확인.
   * @returns true: 사용 가능, false: 이미 사용 중
   */
  checkNickname: async (nickname: string): Promise<boolean> => {
    try {
      await http.get(`/api/v1/members/nickname/check?nickname=${encodeURIComponent(nickname)}`);
      return true;
    } catch {
      return false;
    }
  },

  /** 캐릭터 에셋 저장 */
  saveCharacter: async (body: CharacterFormValues) => {
    const res = await http.patch('/api/v1/members/me/character', body);
    emptyResponseSchema.parse(res.data);
  },

  /**
   * 튜토리얼 단계 목록 조회 (accessToken 인증 필요).
   */
  getTutorialSteps: async () => {
    const res = await http.get('/api/v1/tutorial');
    const parsed = tutorialResponseSchema.parse(res.data);
    return parsed.data.steps;
  },

  /**
   * 튜토리얼 완료 처리.
   * 반드시 회원가입 과정 중 최초 튜토리얼(스킵 포함) 완료 시에만 호출할 것.
   * onboardingStatus가 이미 TUTORIAL_DONE이면 백엔드에서 예외 발생.
   */
  completeTutorial: async () => {
    const res = await http.post('/api/v1/members/me/tutorial');
    emptyResponseSchema.parse(res.data);
  },
};
