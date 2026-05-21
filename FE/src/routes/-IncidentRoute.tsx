import DictionaryModal from '@/features/dictionary/components/DictionaryModal';
import IncidentPage from '@/features/incident/components/IncidentPage';
import { useIncidentProgress } from '@/features/incident/store/incidentProgressStore';

// features/incident에서 features/dictionary를 직접 import하면 cross-feature 직접 의존이 된다.
// FE_CONVENTION §15 wiring 예외에 따라 routes/ 레이어에서 결합한다.
export default function IncidentRoute() {
  const { recordClear } = useIncidentProgress();
  return (
    <IncidentPage
      onScenarioClear={recordClear}
      renderDictionaryModal={(onClose) => <DictionaryModal onClose={onClose} />}
    />
  );
}
