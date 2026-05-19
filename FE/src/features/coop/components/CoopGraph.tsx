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
      aria-label="협력 모드 Git 형상 그래프"
      className="h-full w-full overflow-visible"
    >
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

          return (
            <g key={`${node.sequence}-${index}`}>
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
