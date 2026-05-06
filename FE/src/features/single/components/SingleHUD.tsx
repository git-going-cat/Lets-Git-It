import HUDCombo from './HUDCombo';
import HUDItemSlots from './HUDItemSlots';
import HUDLives from './HUDLives';

export default function SingleHUD() {
  return (
    <div className="flex flex-1 flex-col justify-between p-4">
      <HUDLives />
      <HUDCombo />
      <HUDItemSlots />
    </div>
  );
}
