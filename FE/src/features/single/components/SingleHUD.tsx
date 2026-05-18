import HighlightRing from './HighlightRing';
import HUDCombo from './HUDCombo';
import HUDItemSlots from './HUDItemSlots';
import HUDLives from './HUDLives';

export default function SingleHUD() {
  return (
    <div className="flex flex-1 flex-col justify-between p-4">
      <HighlightRing target="hud-lives">
        <HUDLives />
      </HighlightRing>
      <HighlightRing target="hud-combo">
        <HUDCombo />
      </HighlightRing>
      <HighlightRing target="item-slot">
        <HUDItemSlots />
      </HighlightRing>
    </div>
  );
}
