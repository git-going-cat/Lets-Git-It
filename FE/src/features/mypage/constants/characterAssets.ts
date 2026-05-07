import { CHARACTER_ASSET_OPTIONS } from '@/features/auth/utils/characterAssets';

const bodyAssetModules = import.meta.glob('/src/assets/character/body/*.png');
const eyeAssetModules = import.meta.glob('/src/assets/character/eye/*.png');
const hairAssetModules = import.meta.glob('/src/assets/character/hair/*.png');
const outfitAssetModules = import.meta.glob('/src/assets/character/outfit/*.png');

const FALLBACK_BODY_ASSETS = CHARACTER_ASSET_OPTIONS.body.map((asset) => asset.id);
const FALLBACK_EYE_ASSETS = CHARACTER_ASSET_OPTIONS.eye.map((asset) => asset.id);
const FALLBACK_HAIR_ASSETS = CHARACTER_ASSET_OPTIONS.hair.map((asset) => asset.id);
const FALLBACK_OUTFIT_ASSETS = CHARACTER_ASSET_OPTIONS.outfit.map((asset) => asset.id);

export const BODY_ASSETS = resolveAssetIds(bodyAssetModules, FALLBACK_BODY_ASSETS);
export const EYE_ASSETS = resolveAssetIds(eyeAssetModules, FALLBACK_EYE_ASSETS);
export const HAIR_ASSETS = resolveAssetIds(hairAssetModules, FALLBACK_HAIR_ASSETS);
export const OUTFIT_ASSETS = resolveAssetIds(outfitAssetModules, FALLBACK_OUTFIT_ASSETS);

function resolveAssetIds(modules: Record<string, unknown>, fallback: string[]) {
  const ids = Object.keys(modules)
    .map((path) => path.split('/').pop()?.replace('.png', ''))
    .filter((id): id is string => Boolean(id))
    .sort();

  return ids.length > 0 ? ids : fallback;
}
