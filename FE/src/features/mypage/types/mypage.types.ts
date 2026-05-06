export interface MyRecord {
  nickname: string;
  authType: AuthType;
  singleEasyBest: number;
  singleNormalBest: number;
  singleHardBest: number;
  contributionTotal: number;
  timeattackCount: number;
  coopBestTime: string;
}

export type AuthType = 'LOCAL' | 'OAUTH';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  authType: AuthType;
  currentNickname?: string;
}

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}
