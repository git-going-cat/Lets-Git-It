import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AssetSelectorProps {
  label: string;
  assetIds: string[];
  currentId: string;
  onChange: (id: string) => void;
  previewImageSrc?: string;
  className?: string;
  hideLabel?: boolean;
}

export default function AssetSelector({
  label,
  assetIds,
  currentId,
  onChange,
  previewImageSrc,
  className = '',
  hideLabel = false,
}: AssetSelectorProps) {
  const currentIndex = Math.max(
    0,
    assetIds.findIndex((id) => id === currentId)
  );
  const currentAsset = assetIds[currentIndex] ?? currentId;
  const hasAssets = assetIds.length > 0;

  const handlePrev = () => {
    if (!hasAssets) return;
    const nextIndex = (currentIndex - 1 + assetIds.length) % assetIds.length;
    onChange(assetIds[nextIndex]);
  };

  const handleNext = () => {
    if (!hasAssets) return;
    const nextIndex = (currentIndex + 1) % assetIds.length;
    onChange(assetIds[nextIndex]);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {!hideLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-gray-500">{label}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        {previewImageSrc && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
            <img src={previewImageSrc} alt="" className="max-h-8 max-w-8 object-contain" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasAssets}
            className="nes-rounded-button flex h-9 w-9 shrink-0 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${label} 이전`}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-800">
            {formatAssetLabel(label, currentAsset, currentIndex, assetIds.length)}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAssets}
            className="nes-rounded-button flex h-9 w-9 shrink-0 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${label} 다음`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatAssetLabel(label: string, assetId: string, index: number, total: number) {
  const totalText = String(total).padStart(2, '0');
  const number = assetId.match(/(\d+)$/)?.[1] ?? String(index + 1);
  const currentText = number.padStart(2, '0');
  const displayLabel = label.includes('COLOR') ? 'Color' : toSingularLabel(label);

  return `${displayLabel} ${currentText} / ${totalText}`;
}

function toSingularLabel(label: string) {
  if (label === 'EYES') return 'Eyes';
  if (label === 'HAIRSTYLE') return 'Hairstyle';
  if (label === 'OUTFIT') return 'Outfit';
  if (label === 'BODY') return 'Body';
  return label.charAt(0) + label.slice(1).toLowerCase();
}
