import HUDCombo from './HUDCombo';
import HUDItemSlots from './HUDItemSlots';
import HUDLives from './HUDLives';

export default function SingleHUD() {
  return (
    <aside className="flex flex-col justify-between h-full p-4">
      <HUDLives />
      <HUDCombo />
      <HUDItemSlots />
    </aside>
  );
}
