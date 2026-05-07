export interface CharacterAsset {
  characterHair: string;
  characterHairColor: string;
  characterBody: string;
  characterEye: string;
  characterOutfit: string;
  characterOutfitColor: string;
}

export interface MyRecord extends CharacterAsset {
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

export interface EditCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAsset: CharacterAsset;
}

export type CharacterSelectState = CharacterAsset;
