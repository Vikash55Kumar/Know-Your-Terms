// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Controls,
//   Background,
//   useNodesState,
//   useEdgesState,
//   ReactFlow,
//   MarkerType,
//   Position,
// } from '@xyflow/react';
// import type { Node, Edge } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
// import dagre from 'dagre';

// // --- 1. Define Types ---
// interface MindMapData {
//   nodes: Node[];
//   edges: Edge[];
// }

// interface MindMapModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   // summaryJson: any; // Prop for when you switch to live data
// }

// // --- 2. Dagre Layouting Utility ---
// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));

// const nodeWidth = 250;
// const nodeHeight = 50;

// const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR'): { nodes: Node[], edges: Edge[] } => {
//   dagreGraph.setGraph({ rankdir: direction });

//   nodes.forEach((node) => {
//     // Use the node's actual style if it exists (for varied sizes)
//     const w = (node.style?.width as number) || nodeWidth;
//     const h = (node.style?.height as number) || nodeHeight;
//     dagreGraph.setNode(node.id, { width: w, height: h });
//   });

//   edges.forEach((edge) => {
//     dagreGraph.setEdge(edge.source, edge.target);
//   });

//   dagre.layout(dagreGraph);

//   nodes.forEach((node) => {
//     const nodeWithPosition = dagreGraph.node(node.id);
//     const w = (node.style?.width as number) || nodeWidth;
//     const h = (node.style?.height as number) || nodeHeight;
    
//     node.position = {
//       x: nodeWithPosition.x - w / 2,
//       y: nodeWithPosition.y - h / 2,
//     };
//     node.sourcePosition = Position.Right;
//     node.targetPosition = Position.Left;
//     return node;
//   });

//   return { nodes, edges };
// };

// // --- 3. Helper Component: Loading Spinner ---
// const LoadingSpinner: React.FC = () => (
//   <div className="flex h-full w-full items-center justify-center">
//     <div className="h-20 w-20 animate-spin rounded-full border-8 border-dashed border-blue-500" role="status">
//       <span className="sr-only">Loading...</span>
//     </div>
//   </div>
// );

// // --- 4. Main Mind Map Modal Component ---
// export const MindMapModal: React.FC<MindMapModalProps> = ({ isOpen, onClose }) => {
//   // `nodes` and `edges` are the *currently visible* elements
//   const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

//   // `allNodes` and `allEdges` are the *master list* from the JSON
//   const [allNodes, setAllNodes] = useState<Node[]>([]);
//   const [allEdges, setAllEdges] = useState<Edge[]>([]);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // --- Data Fetching & Initial Layout ---
//   useEffect(() => {
//     if (isOpen && allNodes.length === 0) { // Only load once
//       setLoading(true);
//       setError(null);

//       fetch('/mock-mindmap-data.json')
//         .then((response) => response.json())
//         .then((data: MindMapData) => {
//           const rootNodeId = "rf-node-1bc851e9"; // Your root node
          
//           // Store the master list of all elements
//           setAllNodes(data.nodes.map(n => ({ ...n, position: { x: 0, y: 0 } })));
//           setAllEdges(data.edges.map(e => ({ ...e, type: 'smoothstep' })));

//           // Find the root node to display initially
//           const rootNode = data.nodes.find(n => n.id === rootNodeId);
//           if (!rootNode) {
//             throw new Error("Root node not found in mock data.");
//           }

//           // Calculate layout for *only* the root node
//           const { nodes: layoutedNodes } = getLayoutedElements([rootNode], [], 'LR');
          
//           setNodes(layoutedNodes); // Set the active nodes (just the root)
//           setEdges([]); // No edges visible yet
//         })
//         .catch((err: any) => {
//           console.error("Error fetching mock mind map data:", err);
//           setError(err.message || "Could not load mock data.");
//         })
//         .finally(() => {
//           setLoading(false);
//         });
//     }
//   }, [isOpen, allNodes.length, setNodes, setEdges]); // Rerun if 'isOpen' changes
  
  
//   // --- *** FULLY REWRITTEN onNodeClick Handler (Fixes Expand/Collapse) *** ---
//   const onNodeClick = useCallback((event: React.MouseEvent, clickedNode: Node) => {
    
//     // Find *all* children and edges from the master list
//     const outgoingEdges = allEdges.filter((edge) => edge.source === clickedNode.id);
//     const childNodeIds = new Set(outgoingEdges.map((edge) => edge.target));

//     if (childNodeIds.size === 0) return; // It's a leaf node, do nothing

//     // Check if the children are *currently* visible
//     const isCurrentlyExpanded = nodes.some(n => childNodeIds.has(n.id));

//     let newNodes: Node[];
//     let newEdges: Edge[];

//     if (isCurrentlyExpanded) {
//         // --- COLLAPSE ---
//         // Find ALL descendants recursively and remove them
//         const idsToRemove = new Set<string>(childNodeIds);
//         const stack = Array.from(childNodeIds);

//         while (stack.length > 0) {
//             const currentId = stack.pop()!;
//             const children = allEdges
//                 .filter(e => e.source === currentId)
//                 .map(e => e.target);
                
//             children.forEach(childId => {
//                 if (!idsToRemove.has(childId)) {
//                     idsToRemove.add(childId);
//                     stack.push(childId);
//                 }
//             });
//         }
        
//         // Filter nodes: keep any node *not* in the removal set
//         newNodes = nodes.filter(n => !idsToRemove.has(n.id));
//         // Filter edges: keep any edge *not* connected to a removed node
//         newEdges = edges.filter(e => !idsToRemove.has(e.target) && !idsToRemove.has(e.source));

//     } else {
//         // --- EXPAND ---
//         // Add *only* the immediate children nodes
//         const nodesToShow = allNodes.filter(n => childNodeIds.has(n.id));
//         // Add *only* the immediate outgoing edges
//         const edgesToShow = allEdges.filter(e => e.source === clickedNode.id);
        
//         newNodes = [...nodes, ...nodesToShow];
//         newEdges = [...edges, ...edgesToShow];
//     }
    
//     // --- FEATURE: Animate Lines ---
//     // Make *only* the immediate children of the clicked node animated
//     // Make all other edges solid
//     const finalEdges = newEdges.map(edge => ({
//       ...edge,
//       animated: !isCurrentlyExpanded && edge.source === clickedNode.id
//     }));

//     // --- Recalculate Layout ---
//     const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
//       newNodes,
//       finalEdges.filter(e => !e.hidden), // Layout only visible edges
//       'LR' // Ensure Left-to-Right flow
//     );
    
//     setNodes(layoutedNodes);
//     setEdges(finalEdges); // Set all edges (hidden and visible)

//   }, [nodes, edges, allNodes, allEdges, setNodes, setEdges]); // Depend on all lists


//   // --- Render ---
//   if (!isOpen) {
//     return null;
//   }

//   // --- FIX: Use inline style for background ---
//   const reactFlowStyle = {
//     backgroundColor: '#ffffff', // <-- Set background to white
//   };

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
//       onClick={onClose}
//     >
//       <div
//         // --- FIX: Set modal panel to white ---
//         className="flex h-[90vh] w-[95vw] max-w-7xl flex-col rounded-xl bg-white shadow-2xl"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Modal Header */}
//         <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-300 p-4">
//           <h2 className="text-xl font-semibold text-gray-900">
//             Document Mind Map
//           </h2>
//           <button
//             onClick={onClose}
//             // --- FIX: Style for light theme ---
//             className="rounded-full p-1 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-900"
//             aria-label="Close"
//           >
//             <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Modal Body */}
//         <div className="h-full flex-1 overflow-hidden rounded-b-xl">
//           {loading && <LoadingSpinner />}
//           {error && (
//             <div className="flex h-full w-full items-center justify-center p-8">
//               <p className="rounded-md bg-red-100 p-4 text-center text-red-700">
//                 <strong>Error:</strong> {error}
//               </p>
//             </div>
//           )}
//           {!loading && !error && (
//             <ReactFlow
//               nodes={nodes}
//               edges={edges}
//               onNodesChange={onNodesChange}
//               onEdgesChange={onEdgesChange}
//               onNodeClick={onNodeClick} // <-- Your expand/collapse handler
//               fitView
//               style={reactFlowStyle} // <-- Use inline style for background
//               nodesDraggable={true}
//               nodesConnectable={false}
//               elementsSelectable={true}
//             >
//               <Controls 
//                 showInteractive={false}
//                 // --- FIX: Style for light theme ---
//                 className="[&>button]:bg-gray-100 [&>button]:text-gray-800 [&>button]:border-gray-300 hover:[&>button]:bg-gray-200" 
//               />
//               <Background variant="dots" gap={12} size={1} color="#cccccc" />
//             </ReactFlow>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };












import React, { useState, useEffect, useCallback } from 'react';
import {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlow,
  MarkerType,
  Position,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { nodeTypes } from '../common/InfoNode';

// --- 1. Define Types ---
// This is the HIERARCHICAL format from your backend
interface HierarchicalNode {
  id: string;
  label: string;
  icon: string;
  status: string;
  secondaryLabel?: string;
  children?: HierarchicalNode[];
  details?: string; // Added details based on your JSON
}

interface MindMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mindmapData: any; // Added mindmapData prop
}

// --- 2. Dagre Layouting Utility ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 250;
const nodeHeight = 60;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR'): { nodes: Node[], edges: Edge[] } => {
  // Double the separation between 1st/2nd and 2nd/3rd child nodes
  dagreGraph.setGraph({ rankdir: direction, nodesep: 25, ranksep: 120 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: (node.data.width as number) || nodeWidth, 
      height: (node.data.height as number) || nodeHeight 
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const w = (node.data.width as number) || nodeWidth;
    const h = (node.data.height as number) || nodeHeight;
    
    node.position = {
      x: nodeWithPosition.x - w / 2,
      y: nodeWithPosition.y - h / 2,
    };
    node.sourcePosition = Position.Right;
    node.targetPosition = Position.Left;
    return node;
  });

  return { nodes, edges };
};

// --- 3. Frontend Conversion Function ---
const convertHierarchicalToReactFlow = (hierNode: HierarchicalNode): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const addNodeRecursive = (nodeData: HierarchicalNode, parentId: string | null, level: number) => {
    const { id, label, icon, status, secondaryLabel, children, details } = nodeData;

    // --- Dynamic Sizing and Styling ---
    let width = nodeWidth;
    let height = nodeHeight;
    let type = 'infoNode'; // Use our custom node
    
    if (level === 0) {
      type = 'input';
      width = 300;
      height = 70;
    } else if (!children || children.length === 0) {
      type = 'output';
      width = 220;
    }

    nodes.push({
      id: id,
      type: type,
      position: { x: 0, y: 0 }, // Dagre will set this
      data: {
        label,
        icon,
        status,
        secondaryLabel,
        details: details || '', // Always pass details as a string
        width,
        height
      }
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    }

    if (children && children.length > 0) {
      children.forEach(child => addNodeRecursive(child, id, level + 1));
    }
  };

  addNodeRecursive(hierNode, null, 0);
  return { nodes, edges };
};

// --- 4. Helper Component: Loading Spinner ---
const LoadingSpinner: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-20 w-20 animate-spin rounded-full border-8 border-dashed border-blue-500" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

// --- 5. Main Mind Map Modal Component ---
export const MindMapModal: React.FC<MindMapModalProps> = ({ isOpen, onClose, mindmapData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching & Layout ---
  useEffect(() => {
    if (isOpen && allNodes.length === 0) {
      setLoading(true);
      setError(null);
      try {
        // Use mindmapData prop directly
        const parsedData = mindmapData;
        if (parsedData.nodes && parsedData.edges) {
          setAllNodes(parsedData.nodes.map((n: Node) => ({ ...n, position: { x: 0, y: 0 } })));
          setAllEdges(parsedData.edges.map((e: Edge) => ({ ...e, type: 'smoothstep', animated: false })));
          const rootNode = parsedData.nodes.find((n: Node) => n.id === 'root' || n.type === 'input');
          if (!rootNode) throw new Error('Root node not found in mock data.');
          const { nodes: layoutedNodes } = getLayoutedElements([rootNode], [], 'LR');
          setNodes(layoutedNodes);
          setEdges([]);
        } else if (parsedData.id && parsedData.label) {
          const { nodes: convertedNodes, edges: convertedEdges } = convertHierarchicalToReactFlow(parsedData);
          setAllNodes(convertedNodes);
          setAllEdges(convertedEdges.map(e => ({ ...e, animated: false })));
          const rootNode = convertedNodes.find(n => n.type === 'input');
          if (!rootNode) throw new Error("Root node (type: 'input') not found in mock data.");
          const { nodes: layoutedNodes } = getLayoutedElements([rootNode], [], 'LR');
          setNodes(layoutedNodes);
          setEdges([]);
        } else {
          throw new Error('Mock data format not recognized.');
        }
      } catch (err) {
        console.error('Error loading mind map data:', err);
        setError((err as Error).message || 'Could not load mind map data.');
      } finally {
        setLoading(false);
      }
    }
  }, [isOpen, allNodes.length, setNodes, setEdges, mindmapData]);
  
  
  // --- onNodeClick Handler (This logic is correct for expand/collapse) ---
  const onNodeClick = useCallback((event: React.MouseEvent, clickedNode: Node) => {
    const outgoingEdges = allEdges.filter((edge) => edge.source === clickedNode.id);
    const childNodeIds = new Set(outgoingEdges.map((edge) => edge.target));
    if (childNodeIds.size === 0) return;
    const isCurrentlyExpanded = nodes.some(n => childNodeIds.has(n.id));
    let newNodes: Node[];
    let newEdges: Edge[];

    if (isCurrentlyExpanded) {
        const idsToRemove = new Set<string>(childNodeIds);
        const stack = Array.from(childNodeIds);
        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const children = allEdges.filter(e => e.source === currentId).map(e => e.target);
            children.forEach(childId => {
                if (nodes.some(n => n.id === childId) && !idsToRemove.has(childId)) {
                    idsToRemove.add(childId);
                    stack.push(childId);
                }
            });
        }
        newNodes = nodes.filter(n => !idsToRemove.has(n.id));
        newEdges = edges.filter(e => !idsToRemove.has(e.target) && !idsToRemove.has(e.source));
    } else {
        const nodesToShow = allNodes.filter(n => childNodeIds.has(n.id));
        const edgesToShow = allEdges.filter(e => e.source === clickedNode.id);
        newNodes = [...nodes, ...nodesToShow];
        newEdges = [...edges, ...edgesToShow];
    }
    
    // Set animated flag for new edges
    const finalEdges = newEdges.map(edge => ({
      ...edge,
      animated: !isCurrentlyExpanded && edge.source === clickedNode.id
    }));

    // Re-calculate layout
    const { nodes: layoutedNodes } = getLayoutedElements(
      newNodes,
      finalEdges.filter(e => !e.hidden),
      'LR'
    );
    
    setNodes(layoutedNodes);
    setEdges(finalEdges);

  }, [nodes, edges, allNodes, allEdges, setNodes, setEdges]);


  // --- Render ---
  if (!isOpen) return null;

  const reactFlowStyle = { backgroundColor: '#ffffff' }; // White background

  return (
    <div
      className="fixed inset-0 z-99 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-[78vw] max-w-7xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-300 p-4">
          <h2 className="text-xl font-semibold text-gray-900">Document Mind Map</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-900"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="h-full flex-1 overflow-hidden rounded-b-xl">
          {loading && <LoadingSpinner />}
          {error && (
            <div className="flex h-full w-full items-center justify-center p-8">
              <p className="rounded-md bg-red-100 p-4 text-center text-red-700">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}
          {!loading && !error && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              style={reactFlowStyle}
              nodeTypes={nodeTypes} // <-- Tell React Flow to use our Custom Nodes
              nodesDraggable={true}
              nodesConnectable={false}
              elementsSelectable={true}
            >
              <Controls 
                showInteractive={false}
                className="[&>button]:bg-gray-100 [&>button]:text-gray-800 [&>button]:border-gray-300 hover:[&>button]:bg-gray-200" 
              />
              <Background variant="dots" gap={12} size={1} color="#cccccc" />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
};







































// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//   Controls,
//   Background,
//   useNodesState,
//   useEdgesState,
//   ReactFlow,
//   MarkerType,
//   Position,
// } from '@xyflow/react';
// import type { Node, Edge } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
// import dagre from 'dagre';

// // --- 1. Define Types ---
// interface MindMapData {
//   nodes: Node[];
//   edges: Edge[];
// }

// interface MindMapModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   // summaryJson: any; // We'll add this prop back when we fetch from the API
// }

// // --- 2. Dagre Layouting Utility ---
// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));

// // We get node dimensions from the style in the JSON
// const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR'): { nodes: Node[], edges: Edge[] } => {
//   dagreGraph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 100 }); // Adjust spacing

//   nodes.forEach((node) => {
//     // Use the node's actual style if it exists
//     const width = (node.style?.width as number) || 250;
//     const height = (node.style?.height as number) || 50;
//     dagreGraph.setNode(node.id, { width, height });
//   });

//   edges.forEach((edge) => {
//     dagreGraph.setEdge(edge.source, edge.target);
//   });

//   dagre.layout(dagreGraph);

//   nodes.forEach((node) => {
//     const nodeWithPosition = dagreGraph.node(node.id);
//     const width = (node.style?.width as number) || 250;
//     const height = (node.style?.height as number) || 50;
    
//     node.position = {
//       x: nodeWithPosition.x - width / 2,
//       y: nodeWithPosition.y - height / 2,
//     };
//     node.sourcePosition = Position.Right;
//     node.targetPosition = Position.Left;
//     return node;
//   });

//   return { nodes, edges };
// };


// // --- 3. Helper Component: Loading Spinner ---
// const LoadingSpinner: React.FC = () => (
//   <div className="flex h-full w-full items-center justify-center">
//     <div className="h-20 w-20 animate-spin rounded-full border-8 border-dashed border-blue-500" role="status">
//       <span className="sr-only">Loading...</span>
//     </div>
//   </div>
// );

// // --- 4. Main Mind Map Modal Component ---
// export const MindMapModal: React.FC<MindMapModalProps> = ({ isOpen, onClose }) => {
//   // `nodes` and `edges` are the *currently visible* elements
//   const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

//   // `allNodes` and `allEdges` are the *master list* from the JSON
//   const [allNodes, setAllNodes] = useState<Node[]>([]);
//   const [allEdges, setAllEdges] = useState<Edge[]>([]);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // --- Data Fetching & Initial Layout ---
//   useEffect(() => {
//     if (isOpen && allNodes.length === 0) { // Only load once
//       setLoading(true);
//       setError(null);

//       fetch('/mock-mindmap-data.json') // Fetches from the 'public' folder
//         .then((response) => response.json())
//         .then((data: MindMapData) => {
          
//           const rootNodeId = "root"; // This is your root node ID from the JSON
          
//           // Store the master list of all elements
//           setAllNodes(data.nodes.map(n => ({ 
//             ...n, 
//             position: { x: 0, y: 0 } // Clear positions from JSON
//           })));
          
//           setAllEdges(data.edges.map(e => ({ 
//             ...e, 
//             type: 'smoothstep', // Use smoothstep edges
//             animated: false, // Start as not animated
//             markerEnd: { type: MarkerType.ArrowClosed } // Add arrowheads
//           })));

//           // Find the root node to display initially
//           const rootNode = data.nodes.find(n => n.id === rootNodeId);
//           if (!rootNode) {
//             throw new Error("Root node not found in mock data.");
//           }

//           // Calculate layout for *only* the root node
//           const { nodes: layoutedNodes } = getLayoutedElements([rootNode], [], 'LR');
          
//           setNodes(layoutedNodes); // Set the active nodes (just the root)
//           setEdges([]); // No edges visible yet
//         })
//         .catch((err: any) => {
//           console.error("Error fetching mock mind map data:", err);
//           setError(err.message || "Could not load mock data.");
//         })
//         .finally(() => {
//           setLoading(false);
//         });
//     }
//   }, [isOpen, allNodes.length, setNodes, setEdges]);
  
  
//   // --- onNodeClick Handler (Expand/Collapse Logic) ---
//   const onNodeClick = useCallback((event: React.MouseEvent, clickedNode: Node) => {
    
//     // Find *all* children and edges from the master list
//     const outgoingEdges = allEdges.filter((edge) => edge.source === clickedNode.id);
//     const childNodeIds = new Set(outgoingEdges.map((edge) => edge.target));

//     if (childNodeIds.size === 0) return; // It's a leaf node, do nothing

//     // Check if the children are *currently* visible
//     const isCurrentlyExpanded = nodes.some(n => childNodeIds.has(n.id));

//     let newNodes: Node[];
//     let newEdges: Edge[];

//     if (isCurrentlyExpanded) {
//         // --- COLLAPSE ---
//         // Find ALL descendants recursively and remove them
//         const idsToRemove = new Set<string>(childNodeIds);
//         const stack = Array.from(childNodeIds);

//         while (stack.length > 0) {
//             const currentId = stack.pop()!;
//             const children = allEdges
//                 .filter(e => e.source === currentId)
//                 .map(e => e.target);
                
//             children.forEach(childId => {
//                 // Check if this node is already in the *current* nodes list
//                 const nodeIsVisible = nodes.some(n => n.id === childId);
//                 if (nodeIsVisible && !idsToRemove.has(childId)) {
//                     idsToRemove.add(childId);
//                     stack.push(childId);
//                 }
//             });
//         }
        
//         newNodes = nodes.filter(n => !idsToRemove.has(n.id));
//         newEdges = edges.filter(e => !idsToRemove.has(e.target) && !idsToRemove.has(e.source));

//     } else {
//         // --- EXPAND ---
//         // Add *only* the immediate children nodes
//         const nodesToShow = allNodes.filter(n => childNodeIds.has(n.id));
//         // Add *only* the immediate outgoing edges
//         const edgesToShow = allEdges.filter(e => e.source === clickedNode.id);
        
//         newNodes = [...nodes, ...nodesToShow];
//         newEdges = [...edges, ...edgesToShow];
//     }
    
//     // --- FEATURE: Animate Lines ---
//     // Make *only* the immediate children of the clicked node animated
//     // Make all other edges solid
//     const finalEdges = newEdges.map(edge => ({
//       ...edge,
//       animated: !isCurrentlyExpanded && edge.source === clickedNode.id
//     }));

//     // --- Recalculate Layout ---
//     const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
//       newNodes,
//       finalEdges.filter(e => !e.hidden), // Layout only visible edges
//       'LR' // Ensure Left-to-Right flow
//     );
    
//     setNodes(layoutedNodes);
//     setEdges(finalEdges); // Set all edges (hidden and visible)

//   }, [nodes, edges, allNodes, allEdges, setNodes, setEdges]);


//   // --- Render ---
//   if (!isOpen) {
//     return null;
//   }

//   // --- FIX: Use inline style for background ---
//   const reactFlowStyle = {
//     backgroundColor: '#ffffff', // <-- Set background to white
//   };

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
//       onClick={onClose}
//     >
//       <div
//         // --- FIX: Set modal panel to white ---
//         className="flex h-[90vh] w-[95vw] max-w-7xl flex-col rounded-xl bg-white shadow-2xl"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Modal Header */}
//         <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-300 p-4">
//           <h2 className="text-xl font-semibold text-gray-900">
//             Document Mind Map
//           </h2>
//           <button
//             onClick={onClose}
//             // --- FIX: Style for light theme ---
//             className="rounded-full p-1 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-900"
//             aria-label="Close"
//           >
//             <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Modal Body */}
//         <div className="h-full flex-1 overflow-hidden rounded-b-xl">
//           {loading && <LoadingSpinner />}
//           {error && (
//             <div className="flex h-full w-full items-center justify-center p-8">
//               <p className="rounded-md bg-red-100 p-4 text-center text-red-700">
//                 <strong>Error:</strong> {error}
//               </p>
//             </div>
//           )}
//           {!loading && !error && (
//             <ReactFlow
//               nodes={nodes}
//               edges={edges}
//               onNodesChange={onNodesChange}
//               onEdgesChange={onEdgesChange}
//               onNodeClick={onNodeClick} // <-- Your expand/collapse handler
//               fitView
//               style={reactFlowStyle} // <-- Use inline style for background
//               nodesDraggable={true}
//               nodesConnectable={false}
//               elementsSelectable={true}
//             >
//               <Controls 
//                 showInteractive={false}
//                 // --- FIX: Style for light theme ---
//                 className="[&>button]:bg-gray-100 [&>button]:text-gray-800 [&>button]:border-gray-300 hover:[&>button]:bg-gray-200" 
//               />
//               <Background variant="dots" gap={12} size={1} color="#cccccc" />
//             </ReactFlow>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };







// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   Controls,
//   Background,
//   useNodesState,
//   useEdgesState,
//   ReactFlow,
//   MarkerType,
// } from '@xyflow/react';
// import type { Node, Edge } from '@xyflow/react';
// import '@xyflow/react/dist/style.css'; // Import default styles

// // --- 1. Define the Types ---
// interface MindMapData {
//   nodes: Node[];
//   edges: Edge[];
// }

// interface MindMapModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   summaryJson: any; // The RAG summary JSON (the big one)
//   category: 'business' | 'citizen' | 'student'; // Pass the category
// }

// // --- 2. Helper Component: Loading Spinner ---
// const LoadingSpinner: React.FC = () => (
//   <div className="flex h-full w-full items-center justify-center">
//     <div className="h-20 w-20 animate-spin rounded-full border-8 border-dashed border-blue-500" role="status">
//       <span className="sr-only">Loading...</span>
//     </div>
//   </div>
// );

// // --- 3. Main Mind Map Modal Component ---
// export const MindMapModal: React.FC<MindMapModalProps> = ({ isOpen, onClose, summaryJson, category }) => {
//   const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // --- Data Fetching Effect ---
//   useEffect(() => {
//     // Only fetch if the modal is opening and we don't have data yet
//     if (isOpen && nodes.length === 0) {
//       setLoading(true);
//       setError(null);

//       // --- THIS IS THE API INTEGRATION ---
//       // We are no longer fetching a static file.
      
//       const fetchMindMapData = async () => {
//         try {
//           // 1. Call your backend endpoint
//           const response = await fetch('/generate_mindmap', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             // Send the *full summary JSON* and the *category*
//             body: JSON.stringify({
//                 summary_json: summaryJson,
//                 category: category
//             }), 
//           });

//           if (!response.ok) {
//             const errData = await response.json();
//             throw new Error(errData.error || `Failed to generate mind map`);
//           }

//           const data: MindMapData = await response.json();
          
//           // 2. Set the data
//           // Your backend already provided nodes with positions and styles.
//           // React Flow will render them exactly as specified.
//           setNodes(data.nodes);
//           setEdges(data.edges);

//         } catch (err: any) {
//           console.error("Error fetching mind map data:", err);
//           setError(err.message || "Could not load mind map data.");
//         } finally {
//           setLoading(false);
//         }
//       };

//       fetchMindMapData();
//     }
//   }, [isOpen, summaryJson, category, nodes.length, setNodes, setEdges]); // Re-run if 'isOpen' changes

//   // --- Render ---
//   if (!isOpen) {
//     return null; // Don't render anything if the modal is closed
//   }

//   // --- FIX: Use inline style for background ---
//   const reactFlowStyle = {
//     backgroundColor: '#ffffff', // Set background to white
//   };

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
//       onClick={onClose}
//     >
//       {/* --- FIX: Set modal panel to white --- */}
//       <div
//         className="flex h-[90vh] w-[95vw] max-w-7xl flex-col rounded-xl bg-white shadow-2xl"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Modal Header */}
//         <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-300 p-4">
//           <h2 className="text-xl font-semibold text-gray-900">
//             Document Mind Map
//           </h2>
//           <button
//             onClick={onClose}
//             className="rounded-full p-1 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-900"
//             aria-label="Close"
//           >
//             <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/* Modal Body */}
//         <div className="h-full flex-1 overflow-hidden rounded-b-xl">
//           {loading && <LoadingSpinner />}
//           {error && (
//             <div className="flex h-full w-full items-center justify-center p-8">
//               <p className="rounded-md bg-red-100 p-4 text-center text-red-700">
//                 <strong>Error:</strong> {error}
//               </p>
//             </div>
//           )}
//           {!loading && !error && (
//             <ReactFlow
//               nodes={nodes}
//               edges={edges}
//               onNodesChange={onNodesChange}
//               onEdgesChange={onEdgesChange}
//               // We removed onNodeClick and layout logic
//               fitView // This is critical. It will zoom to show the whole map.
//               style={reactFlowStyle} // Use inline style for white background
//               nodesDraggable={true}
//               nodesConnectable={false}
//               elementsSelectable={true}
//             >
//               <Controls 
//                 showInteractive={false}
//                 className="[&>button]:bg-gray-100 [&>button]:text-gray-800 [&>button]:border-gray-300 hover:[&>button]:bg-gray-200" 
//               />
//               <Background variant="dots" gap={12} size={1} color="#cccccc" />
//             </ReactFlow>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };