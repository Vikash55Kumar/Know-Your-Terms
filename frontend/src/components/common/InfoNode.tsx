import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

// --- Icon Component (Example) ---
// You would expand this with your own SVGs or a library like react-icons
const NodeIcon = ({ name, status }: { name: string, status: string }) => {
  let icon = "ℹ️"; // default
  let color = "text-gray-500"; // default

  if (status === 'positive') color = 'text-green-500';
  if (status === 'negative') color = 'text-red-500';
  if (status === 'info') color = 'text-blue-500';

  if (name === 'document') icon = "📄";
  if (name === 'law') icon = "⚖️";
  if (name === 'people') icon = "👥";
  if (name === 'risk_high') icon = "⚠️";
  if (name === 'risk_low') icon = "🛡️";
  if (name === 'check') icon = "✅";
  if (name === 'money') icon = "💰";
  if (name === 'time') icon = "⏱️";
  if (name === 'recommendation') icon = "💡";
  if (name === 'star') icon = "⭐";

  return <div className={`mr-2 text-lg ${color}`}>{icon}</div>;
};

// --- The Custom Node Component ---
// This component reads the `data` payload from your JSON
const InfoNode: React.FC<NodeProps> = (props) => {
  const { data, type: nodeType } = props;
  // Use style from data if present, cast to Record<string, any> for safe property access
  const style = (data?.style || {}) as Record<string, unknown>;
  // Use the style from the backend JSON for colors and size
  const nodeStyle = {
    background: typeof style.background === 'string' ? style.background : '#f1f1f1',
    color: typeof style.color === 'string' ? style.color : '#333',
    border: typeof style.border === 'string' ? style.border : '1px solid #ccc',
    borderRadius: '8px',
    padding: typeof style.padding === 'string' ? style.padding : '8px 12px',
    fontSize: typeof style.fontSize === 'number' ? style.fontSize : 14,
    width: typeof style.width === 'number' ? `${style.width}px` : 'auto',
    minHeight: typeof style.height === 'number' ? `${style.height}px` : 'auto',
  };

  // Determine border color based on status
  let statusBorder = 'border-gray-400';
  if (data.status === 'positive') statusBorder = 'border-green-500';
  if (data.status === 'negative') statusBorder = 'border-red-500';
  if (data.status === 'info') statusBorder = 'border-blue-500';

  // Defensive: Ensure label and secondaryLabel are strings
  const label = typeof data.label === 'string' ? data.label : String(data.label ?? '');
  const secondaryLabel = typeof data.secondaryLabel === 'string' ? data.secondaryLabel : (data.secondaryLabel != null ? String(data.secondaryLabel) : '');
  const icon = typeof data.icon === 'string' ? data.icon : String(data.icon ?? '');
  const status = typeof data.status === 'string' ? data.status : String(data.status ?? '');

  return (
    <div 
      style={nodeStyle} 
      className={`shadow-md flex items-center border-l-4 ${statusBorder}`}
    >
      {/* Handles for connections (Left and Right) */}
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />

      {/* Informative Content */}
      <NodeIcon name={icon} status={status} />

      <div className="flex-1">
        <div className="font-bold">{label}</div>
        {secondaryLabel && (
          <div className="text-xs opacity-70">{secondaryLabel}</div>
        )}
        {data.details && nodeType !== 'input' && (
          <div className="text-xs mt-1 text-gray-600">{typeof data.details === 'string' ? data.details : String(data.details ?? '')}</div>
        )}
      </div>
    </div>
  );
};

// Export the node type mapping
export const nodeTypes = {
  // We tell React Flow that any node with type 'input', 'default', 'output',
  // OR 'infoNode' should use our new component.
  input: InfoNode,
  default: InfoNode,
  output: InfoNode,
  infoNode: InfoNode, // Explicitly
};