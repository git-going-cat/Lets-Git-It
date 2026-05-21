export const MAP_PAGE_SIZE = 3;
export const CONTRIBUTION_PLAYER_OPTIONS = [2, 3, 4];

export type PasswordPayload = {
  password: string | null;
};

export function buildPasswordPayload(
  draftHasPassword: boolean,
  nextPassword: string
): PasswordPayload {
  if (!draftHasPassword) {
    return { password: null };
  }

  if (nextPassword) {
    return { password: nextPassword };
  }

  return { password: null };
}
