import { COOP_MAP_DATA } from '../data/coopMapData';

const GRAPH_COLORS = {
  completed: '#05AFF2',
  active: '#F2CB05',
  inactive: '#4a5568',
  edge: '#2d3748',
  edgeDone: '#05AFF2',
} as const;

interface CoopGraphProps {
  mapId: number;
  completedSequences: number[];
  activeSequence: number;
}

function getNodeColor(sequence: number, completedSet: Set<number>, activeSequence: number) {
  if (sequence === activeSequence) return GRAPH_COLORS.active;
  if (completedSet.has(sequence)) return GRAPH_COLORS.completed;
  return GRAPH_COLORS.inactive;
}

export default function CoopGraph({ mapId, completedSequences, activeSequence }: CoopGraphProps) {
  const mapData = COOP_MAP_DATA.find((map) => map.mapId === mapId);
  if (!mapData) return null;

  const completedSet = new Set(completedSequences);
  const nodeMap = new Map(mapData.nodes.map((node) => [node.sequence, node]));

  return (
    <svg
      viewBox={mapData.viewBox}
      role="img"
      aria-label="협력 모드 Git 형상 그래프"
      className="h-full w-full overflow-visible"
    >
      <style>{`
        @keyframes coop-ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>

      <g>
        {mapData.edges.map((edge) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;

          const isDone = completedSet.has(edge.from) && completedSet.has(edge.to);

          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={isDone ? GRAPH_COLORS.edgeDone : GRAPH_COLORS.edge}
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      <g>
        {mapData.nodes.map((node) => {
          const isActive = node.sequence === activeSequence;
          const nodeColor = getNodeColor(node.sequence, completedSet, activeSequence);

          return (
            <g key={node.sequence}>
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="15"
                  fill={GRAPH_COLORS.active}
                  opacity="0.35"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: `${node.x}px ${node.y}px`,
                    animation: 'coop-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="11"
                fill={nodeColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={node.x}
                y={node.y + 28}
                textAnchor="middle"
                className="fill-white font-mono text-xs"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
