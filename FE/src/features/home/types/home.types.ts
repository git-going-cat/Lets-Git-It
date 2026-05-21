export type HomeModalType =
  | 'settings'
  | 'logout'
  | 'ranking'
  | 'dictionary'
  | 'explorer-single'
  | 'explorer-multi';

export interface MyRecord {
  singleEasyBest: number;
  singleNormalBest: number;
  singleHardBest: number;
  contributionTotal: number;
  timeattackCount: number;
  coopBestTime: string;
}
