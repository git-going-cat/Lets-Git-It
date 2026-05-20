import CommitPane from './CommitPane';
import Pane from './Pane';

import type { FlyingState, VizState } from '../types/incident.types';

interface VisualizationProps {
  viz: VizState;
  flying: FlyingState | null;
}

export default function Visualization({ viz, flying }: VisualizationProps) {
  const isFlying = (paneName: 'working' | 'staging' | 'commits', fileName: string) => {
    if (!flying || flying.from !== paneName) return false;
    return flying.files.includes(fileName) || flying.files.includes('all');
  };

  const flyDir = (paneName: 'working' | 'staging' | 'commits'): 'forward' | 'back' | null => {
    if (!flying || flying.from !== paneName) return null;
    return flying.to === 'commits' ? 'forward' : 'back';
  };

  return (
    <div className="relative grid h-full grid-cols-3 gap-3">
      <Pane
        label="WORKING DIRECTORY"
        sublabel="작업 영역"
        files={viz.working}
        isFlying={(n) => isFlying('working', n)}
        flyDir={flyDir('working')}
        flashIn={viz.flashIn === 'working'}
      />

      <Pane
        label="STAGING AREA"
        sublabel="스테이지 (인덱스)"
        files={viz.staging}
        warning={viz.stagingWarn}
        isFlying={(n) => isFlying('staging', n)}
        flyDir={flyDir('staging')}
      />

      <CommitPane commits={viz.commits} flashIn={viz.flashIn === 'commits'} />
    </div>
  );
}
