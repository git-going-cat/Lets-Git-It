import type { MyRecord } from '../types/mypage.types';

// TODO: 마이페이지 전적 API 엔드포인트 확인 후 연동
export async function fetchMyRecord(): Promise<MyRecord> {
  return {
    singleEasyBest: 0,
    singleNormalBest: 0,
    singleHardBest: 0,
    contributionTotal: 0,
    timeattackCount: 0,
    coopBestTime: '00:00.00',
  };
}
