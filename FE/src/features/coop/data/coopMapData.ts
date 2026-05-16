/**
 * 협력 모드 맵별 Git 그래프 노드/엣지 좌표 데이터
 * sequence: 전체 게임 기준 1~20
 * x, y: SVG viewBox 기준 좌표
 */

export interface CoopNode {
  sequence: number;
  x: number;
  y: number;
  label: string;
}

export interface CoopEdge {
  from: number;
  to: number;
}

export interface CoopMapData {
  mapId: number;
  viewBox: string;
  nodes: CoopNode[];
  edges: CoopEdge[];
}

// mapId=1: main 브랜치 직선형 (가장 단순한 형태)
// sequence 1~20이 main 브랜치를 따라 순서대로 배치
const MAP_1: CoopMapData = {
  mapId: 1,
  viewBox: '0 0 600 200',
  nodes: [
    { sequence: 1, x: 30, y: 100, label: 'init' },
    { sequence: 2, x: 90, y: 100, label: 's2' },
    { sequence: 3, x: 150, y: 100, label: 's3' },
    { sequence: 4, x: 210, y: 100, label: 's4' },
    { sequence: 5, x: 270, y: 100, label: 's5' },
    { sequence: 6, x: 330, y: 100, label: 's6' },
    { sequence: 7, x: 390, y: 100, label: 's7' },
    { sequence: 8, x: 450, y: 100, label: 's8' },
    { sequence: 9, x: 510, y: 100, label: 's9' },
    { sequence: 10, x: 570, y: 100, label: 's10' },
    { sequence: 11, x: 150, y: 50, label: 'b1' },
    { sequence: 12, x: 210, y: 50, label: 'b2' },
    { sequence: 13, x: 270, y: 50, label: 'b3' },
    { sequence: 14, x: 330, y: 50, label: 'b4' },
    { sequence: 15, x: 390, y: 50, label: 'b5' },
    { sequence: 16, x: 450, y: 50, label: 'b6' },
    { sequence: 17, x: 510, y: 50, label: 'b7' },
    { sequence: 18, x: 570, y: 50, label: 'b8' },
    { sequence: 19, x: 570, y: 75, label: 'merge' },
    { sequence: 20, x: 570, y: 100, label: 'end' },
  ],
  edges: [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
    { from: 5, to: 6 },
    { from: 6, to: 7 },
    { from: 7, to: 8 },
    { from: 8, to: 9 },
    { from: 9, to: 10 },
    { from: 3, to: 11 },
    { from: 11, to: 12 },
    { from: 12, to: 13 },
    { from: 13, to: 14 },
    { from: 14, to: 15 },
    { from: 15, to: 16 },
    { from: 16, to: 17 },
    { from: 17, to: 18 },
    { from: 18, to: 19 },
    { from: 19, to: 20 },
  ],
};

// TODO: mapId 2~5는 백엔드 맵 확정 후 추가
export const COOP_MAP_DATA: CoopMapData[] = [MAP_1];
