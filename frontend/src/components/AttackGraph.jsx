import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, Server, Database, Globe } from 'lucide-react';

// Custom node component
function ServiceNode({ data }) {
  const isOrigin = data.isOrigin;
  const isAffected = data.isAffected;

  const getBorderColor = () => {
    if (isOrigin) return 'border-red-500 shadow-red-500/30';
    if (isAffected) return 'border-orange-500 shadow-orange-500/30';
    return 'border-gray-600';
  };

  const getIcon = () => {
    const serviceName = data.label.toLowerCase();
    if (serviceName.includes('db') || serviceName.includes('database')) {
      return <Database className="w-5 h-5" />;
    }
    if (serviceName.includes('gateway') || serviceName.includes('api')) {
      return <Globe className="w-5 h-5" />;
    }
    return <Server className="w-5 h-5" />;
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-dark-800
        ${getBorderColor()}
        ${isOrigin ? 'shadow-lg animate-pulse' : 'shadow-md'}
        transition-all
      `}
    >
      <div className="flex items-center gap-2">
        <div className={`${isOrigin ? 'text-red-400' : isAffected ? 'text-orange-400' : 'text-gray-400'}`}>
          {getIcon()}
        </div>
        <span className="text-sm font-medium text-white">{data.label}</span>
        {isOrigin && <AlertCircle className="w-4 h-4 text-red-400" />}
      </div>
      {data.errorType && (
        <div className="mt-1 text-xs text-gray-400">{data.errorType}</div>
      )}
    </div>
  );
}

const nodeTypes = {
  serviceNode: ServiceNode
};

function AttackGraph({ analysis }) {
  // Generate nodes and edges from analysis
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!analysis) {
      return { nodes: [], edges: [] };
    }

    const { correlation, analysis: errorAnalysis } = analysis;
    const nodes = [];
    const edges = [];

    // Get all services involved
    const allServices = correlation?.affectedServices || [];
    const originService = errorAnalysis?.originService || correlation?.originService;
    const propagationPath = errorAnalysis?.propagationPath || [];

    // Create nodes for each service
    const serviceSet = new Set(allServices);
    if (originService && !serviceSet.has(originService)) {
      serviceSet.add(originService);
    }

    const serviceArray = Array.from(serviceSet);
    const nodeCount = serviceArray.length;

    // Calculate positions in a circle or line
    serviceArray.forEach((service, index) => {
      const isOrigin = service === originService ||
        service.toLowerCase().includes(originService?.toLowerCase() || '');

      let x, y;
      if (nodeCount <= 3) {
        // Linear layout for few nodes
        x = 100 + index * 250;
        y = 150;
      } else {
        // Circular layout for more nodes
        const angle = (index / nodeCount) * 2 * Math.PI - Math.PI / 2;
        const radius = 150;
        x = 250 + Math.cos(angle) * radius;
        y = 200 + Math.sin(angle) * radius;
      }

      nodes.push({
        id: service,
        type: 'serviceNode',
        position: { x, y },
        data: {
          label: service,
          isOrigin,
          isAffected: !isOrigin,
          errorType: isOrigin ? errorAnalysis?.errorType : null
        }
      });
    });

    // Create edges based on propagation path
    if (propagationPath.length > 0) {
      // Extract service names from propagation steps
      const serviceOrder = [];
      propagationPath.forEach(step => {
        const stepLower = step.toLowerCase();
        serviceArray.forEach(service => {
          if (stepLower.includes(service.toLowerCase()) && !serviceOrder.includes(service)) {
            serviceOrder.push(service);
          }
        });
      });

      // Create edges following the order
      for (let i = 0; i < serviceOrder.length - 1; i++) {
        edges.push({
          id: `e-${serviceOrder[i]}-${serviceOrder[i + 1]}`,
          source: serviceOrder[i],
          target: serviceOrder[i + 1],
          animated: true,
          style: { stroke: '#ef4444', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ef4444'
          },
          label: `Step ${i + 1}`
        });
      }
    } else {
      // Fallback: connect origin to all affected services
      const affected = serviceArray.filter(s =>
        s !== originService && !s.toLowerCase().includes(originService?.toLowerCase() || '')
      );

      affected.forEach((service, i) => {
        edges.push({
          id: `e-${originService || 'origin'}-${service}`,
          source: nodes.find(n => n.data.isOrigin)?.id || nodes[0]?.id,
          target: service,
          animated: true,
          style: { stroke: '#f97316', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#f97316'
          }
        });
      });
    }

    return { nodes, edges };
  }, [analysis]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when analysis changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!analysis || initialNodes.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-dark-800 rounded-lg border border-dark-600">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No propagation data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-dark-800 rounded-lg border border-dark-600 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#30363d" gap={16} />
        <Controls
          className="bg-dark-700 border-dark-600 rounded"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(n) => n.data?.isOrigin ? '#ef4444' : '#f97316'}
          maskColor="rgba(13, 17, 23, 0.8)"
          className="bg-dark-800 border border-dark-600 rounded"
        />
      </ReactFlow>
    </div>
  );
}

export default AttackGraph;
