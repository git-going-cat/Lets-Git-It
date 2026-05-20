interface NarrativeStripProps {
  narrative: string;
}

export default function NarrativeStrip({ narrative }: NarrativeStripProps) {
  return (
    <div
      className="nes-container bg-white !px-4 !py-3"
      style={{ borderColor: '#5fbef0' }} /* NES .nes-container border-color override */
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-nes-blue bg-nes-blue-tint text-lg font-bold leading-none text-nes-blue">
          i
        </div>

        <div className="flex-1 text-xl leading-snug text-gray-800">{narrative}</div>
      </div>
    </div>
  );
}
