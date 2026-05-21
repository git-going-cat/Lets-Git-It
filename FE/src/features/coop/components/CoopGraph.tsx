const GRAPH_COLORS = {
  completed: '#05AFF2',
  active: '#F2CB05',
  inactive: '#4a5568',
  edge: '#2d3748',
  edgeDone: '#05AFF2',
} as const;

interface CoopGraphNode {
  sequence: number;
  x: number;
  y: number;
  label: string;
  branch?: string;
  activateOnRound?: number;
  activateOnStep?: number;
}

interface CoopGraphEdge {
  from: number;
  to: number;
  type?: 'solid' | 'dashed' | 'curve';
}

interface CoopGraphData {
  viewBox: string;
  nodes: CoopGraphNode[];
  edges: CoopGraphEdge[];
}

interface CoopGraphProps {
  graphData: unknown;
  completedSequences: number[];
  activeSequence: number | null;
}

function isGraphNode(node: unknown): node is CoopGraphNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as Record<string, unknown>;
  return (
    typeof candidate.sequence === 'number' &&
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.label === 'string'
  );
}

function isGraphEdge(edge: unknown): edge is CoopGraphEdge {
  if (typeof edge !== 'object' || edge === null) return false;
  const candidate = edge as Record<string, unknown>;
  return typeof candidate.from === 'number' && typeof candidate.to === 'number';
}

function isCoopGraphData(data: unknown): data is CoopGraphData {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.viewBox === 'string' &&
    Array.isArray(candidate.nodes) &&
    candidate.nodes.every(isGraphNode) &&
    Array.isArray(candidate.edges) &&
    candidate.edges.every(isGraphEdge)
  );
}

function getNodeColor(sequence: number, completedSet: Set<number>, activeSequence: number | null) {
  if (sequence === activeSequence) return GRAPH_COLORS.active;
  if (completedSet.has(sequence)) return GRAPH_COLORS.completed;
  return GRAPH_COLORS.inactive;
}

function getNodeState(sequence: number, completedSet: Set<number>, activeSequence: number | null) {
  if (sequence === activeSequence) return 'active';
  if (completedSet.has(sequence)) return 'completed';
  return 'inactive';
}

export default function CoopGraph({
  graphData,
  completedSequences,
  activeSequence,
}: CoopGraphProps) {
  if (!isCoopGraphData(graphData)) return null;

  const completedSet = new Set(completedSequences);
  const nodeMap = new Map(graphData.nodes.map((node) => [node.sequence, node]));

  return (
    <svg
      viewBox={graphData.viewBox}
      role="img"
      aria-label="Coop mode Git graph"
      className="h-full w-full overflow-visible"
    >
      <defs>
        <filter id="coop-graph-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes coop-node-light-on {
          0% { opacity: 0; transform: scale(0.45); }
          60% { opacity: 0.95; transform: scale(1.35); }
          100% { opacity: 0.28; transform: scale(1); }
        }

        .coop-graph-node {
          transform-box: fill-box;
          transform-origin: center;
          transition:
            fill 240ms ease,
            opacity 240ms ease,
            filter 240ms ease;
        }

        .coop-graph-node-glow {
          transform-box: fill-box;
          transform-origin: center;
          animation: coop-node-light-on 520ms ease-out;
        }
      `}</style>

      <g>
        {graphData.edges.map((edge, index) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;

          const isDone = completedSet.has(edge.from) && completedSet.has(edge.to);

          return (
            <line
              key={`${edge.from}-${edge.to}-${index}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={isDone ? GRAPH_COLORS.edgeDone : GRAPH_COLORS.edge}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={edge.type === 'dashed' ? '8 8' : undefined}
            />
          );
        })}
      </g>

      <g>
        {graphData.nodes.map((node, index) => {
          const nodeColor = getNodeColor(node.sequence, completedSet, activeSequence);
          const nodeState = getNodeState(node.sequence, completedSet, activeSequence);
          const isLit = nodeState !== 'inactive';

          return (
            <g key={`${node.sequence}-${index}`}>
              {isLit && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="22"
                  fill={nodeState === 'active' ? GRAPH_COLORS.active : GRAPH_COLORS.completed}
                  opacity="0.28"
                  className="coop-graph-node-glow"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="11"
                fill={nodeColor}
                stroke="#ffffff"
                strokeWidth="2"
                filter={isLit ? 'url(#coop-graph-glow)' : undefined}
                className="coop-graph-node"
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
