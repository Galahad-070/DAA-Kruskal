import React, { useState, useRef, useEffect, useCallback } from 'react';

const NODE_TYPES = {
  HOUSE: 'house',
  JUNCTION: 'junction',
  SOURCE: 'source'
};

const TOOLS = {
  SELECT: 'select',
  HOUSE: 'house',
  JUNCTION: 'junction',
  SOURCE: 'source',
  PIPE: 'pipe',
  DELETE: 'delete'
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getNodeRadius(type) {
  return type === NODE_TYPES.HOUSE ? 18 : type === NODE_TYPES.SOURCE ? 12 : 10;
}

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [mstResult, setMstResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [pipeStart, setPipeStart] = useState(null);
  const [pipePreview, setPipePreview] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'node' | 'edge'
  
  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    // rect.left/top already include the transform translation, so don't subtract canvasTransform again
    return {
      x: (clientX - rect.left) / canvasTransform.scale,
      y: (clientY - rect.top) / canvasTransform.scale
    };
  }, [canvasTransform]);

  const handleCanvasClick = useCallback((e) => {
    // Don't handle clicks on nodes/edges (they have their own handlers)
    if (e.target !== canvasRef.current && e.target !== svgRef.current) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    if (activeTool === TOOLS.DELETE) {
      // Delete tool clicks empty space - do nothing
      return;
    }
    
    if (activeTool === TOOLS.HOUSE || activeTool === TOOLS.JUNCTION || activeTool === TOOLS.SOURCE) {
      const newNode = {
        id: generateId(),
        type: activeTool === TOOLS.HOUSE ? NODE_TYPES.HOUSE : 
              activeTool === TOOLS.JUNCTION ? NODE_TYPES.JUNCTION : NODE_TYPES.SOURCE,
        x, y
      };
      setNodes(prev => [...prev, newNode]);
      return;
    }
    
    // Select tool - click empty space to deselect
    setSelectedId(null);
    setSelectedType(null);
  }, [activeTool, screenToCanvas]);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (activeTool === TOOLS.DELETE) {
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
      return;
    }
    if (activeTool === TOOLS.PIPE) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setPipeStart(node);
        setPipePreview({ x: node.x, y: node.y });
      }
      return;
    }
    // Select tool
    setSelectedId(nodeId);
    setSelectedType('node');
  }, [activeTool, nodes]);

  const handleNodeMouseUp = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (activeTool === TOOLS.PIPE && pipeStart) {
      if (pipeStart.id !== nodeId) {
        const weight = Math.round(distance(pipeStart.x, pipeStart.y, nodes.find(n => n.id === nodeId)?.x || 0, nodes.find(n => n.id === nodeId)?.y || 0));
        const targetNode = nodes.find(n => n.id === nodeId);
        if (targetNode) {
          const newEdge = {
            id: generateId(),
            source: pipeStart.id,
            target: targetNode.id,
            weight: Math.round(distance(pipeStart.x, pipeStart.y, targetNode.x, targetNode.y))
          };
          setEdges(prev => [...prev, newEdge]);
        }
      }
      setPipeStart(null);
      setPipePreview(null);
    }
  }, [activeTool, pipeStart, nodes]);

  const handleEdgeClick = useCallback((e, edgeId) => {
    e.stopPropagation();
    if (activeTool === TOOLS.DELETE) {
      setEdges(prev => prev.filter(e => e.id !== edgeId));
      return;
    }
    setSelectedId(edgeId);
    setSelectedType('edge');
  }, [activeTool]);

  const handleMouseDown = useCallback((e) => {
    // Middle mouse or Alt+Left click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Left click on canvas background for pipe tool (handled by canvas click)
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (pipeStart) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setPipePreview({ x, y });
    }
    
    // Tooltip for placement tools
    if (activeTool === TOOLS.HOUSE || activeTool === TOOLS.JUNCTION || activeTool === TOOLS.SOURCE) {
      setTooltip({ x: e.clientX + 15, y: e.clientY + 15, text: `Click to place ${activeTool}` });
    } else {
      setTooltip(null);
    }
  }, [isPanning, panStart, pipeStart, activeTool, screenToCanvas]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    
    // Cancel pipe if mouseup on canvas background (not on a node)
    if (pipeStart) {
      setPipeStart(null);
      setPipePreview(null);
    }
  }, [isPanning, pipeStart]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Mouse position in canvas coordinates (before transform)
    const mouseX = (e.clientX - rect.left) / canvasTransform.scale;
    const mouseY = (e.clientY - rect.top) / canvasTransform.scale;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(canvasTransform.scale * zoomFactor, 0.3), 3);
    
    setCanvasTransform(prev => {
      const scaleRatio = newScale / prev.scale;
      // Zoom towards mouse position in canvas coordinates
      return {
        scale: newScale,
        x: e.clientX - rect.left - mouseX * newScale,
        y: e.clientY - rect.top - mouseY * newScale
      };
    });
  }, [canvasTransform]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && selectedType === 'node') {
        setNodes(prev => prev.filter(n => n.id !== selectedId));
        setEdges(prev => prev.filter(e => e.source !== selectedId && e.target !== selectedId));
        setSelectedId(null);
        setSelectedType(null);
      } else if (selectedId && selectedType === 'edge') {
        setEdges(prev => prev.filter(e => e.id !== selectedId));
        setSelectedId(null);
        setSelectedType(null);
      }
    }
    if (e.key === 'Escape') {
      setPipeStart(null);
      setPipePreview(null);
      setSelectedId(null);
      setSelectedType(null);
      setActiveTool(TOOLS.SELECT);
    }
  }, [selectedId, selectedType]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const runKruskal = async () => {
    if (nodes.length < 2) {
      setModalType('error');
      setShowModal(true);
      return;
    }
    if (edges.length === 0) {
      setModalType('noEdges');
      setShowModal(true);
      return;
    }
    try {
      const response = await fetch('/api/kruskal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      const data = await response.json();
      setMstResult(data);
    } catch (err) {
      console.error('Error running Kruskal:', err);
      setModalType('serverError');
      setShowModal(true);
    }
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setMstResult(null);
    setPipeStart(null);
    setPipePreview(null);
    setSelectedId(null);
    setSelectedType(null);
  };

  const getEdgePath = (edge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!source || !target) return '';
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return '';
    
    const sourceRadius = getNodeRadius(source.type);
    const targetRadius = getNodeRadius(target.type);
    const ux = dx / dist;
    const uy = dy / dist;
    
    const x1 = source.x + ux * sourceRadius;
    const y1 = source.y + uy * sourceRadius;
    const x2 = target.x - ux * targetRadius;
    const y2 = target.y - uy * targetRadius;
    
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  };

  const getEdgeWeightPos = (edge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!source || !target) return { x: 0, y: 0 };
    
    const mx = (source.x + target.x) / 2;
    const my = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return { x: mx, y: my };
    
    const ux = -dy / dist;
    const uy = dx / dist;
    
    return { x: mx + ux * 18, y: my + uy * 18 };
  };

  const isNodeSelected = (nodeId) => selectedId === nodeId && selectedType === 'node';
  const isEdgeSelected = (edgeId) => selectedId === edgeId && selectedType === 'edge';

  return (
    <div className="app">
      <header className="header">
        <h1>🌊 Water Pipeline Network</h1>
        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
          Kruskal's MST Algorithm
        </div>
      </header>
      
      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Tools</h3>
            <button 
              className={`tool-btn ${activeTool === TOOLS.SELECT ? 'active' : ''}`}
              onClick={() => setActiveTool(TOOLS.SELECT)}
              title="Select / Pan (V)"
            >
              🖱️ Select / Pan
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.HOUSE ? 'active' : ''}`}
              onClick={() => setActiveTool(TOOLS.HOUSE)}
              title="Add House (H)"
            >
              🏠 Add House
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.JUNCTION ? 'active' : ''}`}
              onClick={() => setActiveTool(TOOLS.JUNCTION)}
              title="Add Junction (J)"
            >
              ● Add Junction
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.SOURCE ? 'active' : ''}`}
              onClick={() => setActiveTool(TOOLS.SOURCE)}
              title="Add Source (S)"
            >
              ▲ Add Source
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.PIPE ? 'active' : ''}`}
              onClick={() => setActiveTool(TOOLS.PIPE)}
              title="Connect Pipes (P)"
            >
              🔗 Connect Pipes
            </button>
            <button 
              className={`tool-btn ${activeTool === TOOLS.DELETE ? 'active' : ''}`}
              onClick={() => setActiveTool(TOOLS.DELETE)}
              title="Delete Elements (Del)"
            >
              🗑️ Delete
            </button>
          </div>
          
          <div className="sidebar-section">
            <h3>Actions</h3>
            <button 
              className="run-btn" 
              onClick={runKruskal}
              disabled={nodes.length < 2 || edges.length === 0}
            >
              ▶ Run Kruskal's Algorithm
            </button>
            <button className="clear-btn" onClick={clearAll}>
              🗑️ Clear Canvas
            </button>
          </div>
          
          <div className="info-panel instructions">
            <h4>Instructions</h4>
            <ul>
              <li><strong>Select (V):</strong> Click nodes/edges to select, drag empty space to pan</li>
              <li><strong>Add House/Junction/Source (H/J/S):</strong> Click on canvas to place</li>
              <li><strong>Connect Pipes (P):</strong> Click node, drag to another node</li>
              <li><strong>Delete (Del):</strong> Select element + press Delete, or use Delete tool</li>
              <li><strong>Scroll:</strong> Zoom in/out</li>
              <li><strong>Escape:</strong> Cancel current action</li>
            </ul>
          </div>
          
          <div className="info-panel">
            <h4>Stats</h4>
            <div>Nodes: {nodes.length}</div>
            <div>Edges: {edges.length}</div>
            {selectedId && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #eee', fontSize: '0.8rem', color: '#666' }}>
                Selected: {selectedType} {selectedId.slice(0, 6)}
              </div>
            )}
            {mstResult && (
              <>
                <div>MST Edges: {mstResult.edge_count}</div>
                <div style={{ color: '#27ae60', fontWeight: 600 }}>
                  Total Pipe Length: {mstResult.total_weight}
                </div>
              </>
            )}
          </div>
        </aside>
        
        <main className="canvas-container">
          <div 
            className="canvas-wrapper"
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{ 
              transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%'
            }}
          >
            <svg ref={svgRef} className="canvas-svg" style={{ width: '100%', height: '100%' }}>
              <defs>
                <pattern id="grid-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="#f8f9fa" />
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1" />
                </pattern>
                <pattern id="grid-pattern-major" x="0" y="0" width="250" height="250" patternUnits="userSpaceOnUse">
                  <rect width="250" height="250" fill="transparent" />
                  <path d="M 250 0 L 0 0 0 250" fill="none" stroke="#ccc" strokeWidth="1.5" />
                </pattern>
                <linearGradient id="pipe-gradient-normal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#bdc3c7" />
                  <stop offset="50%" stopColor="#95a5a6" />
                  <stop offset="100%" stopColor="#7f8c8d" />
                </linearGradient>
                <linearGradient id="pipe-gradient-mst" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#58d68d" />
                  <stop offset="50%" stopColor="#27ae60" />
                  <stop offset="100%" stopColor="#1e8c49" />
                </linearGradient>
                <filter id="pipe-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15"/>
                </filter>
                <filter id="pipe-shadow-mst" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#27ae60" floodOpacity="0.4"/>
                </filter>
              </defs>
              
              {/* Grid background - covers large area */}
              <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid-pattern)" pointerEvents="none" />
              <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid-pattern-major)" pointerEvents="none" />
              
              {/* Origin axes */}
              <line x1="-10000" y1="0" x2="10000" y2="0" stroke="#bbb" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" pointerEvents="none" />
              <line x1="0" y1="-10000" x2="0" y2="10000" stroke="#bbb" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" pointerEvents="none" />
              
              {/* Origin label */}
              <text x="10" y="-10" fontSize="11" fill="#999" fontFamily="monospace" pointerEvents="none">(0,0)</text>
              
              {/* Pipes (edges) */}
              {edges.map(edge => {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                const isMST = mstResult && mstResult.mst.some(e => e.id === edge.id);
                const weightPos = getEdgeWeightPos(edge);
                const pipeWidth = isMST ? 8 : 6;
                const gradientId = isMST ? 'pipe-gradient-mst' : 'pipe-gradient-normal';
                const shadowFilter = isMST ? 'pipe-shadow-mst' : 'pipe-shadow';
                const isSelected = isEdgeSelected(edge.id);
                
                return (
                  <g key={edge.id} className={`edge ${isMST ? 'mst' : ''} ${isSelected ? 'selected' : ''}`}>
                    <path
                      d={getEdgePath(edge)}
                      stroke={`url(#${gradientId})`}
                      strokeWidth={pipeWidth + (isSelected ? 2 : 0)}
                      fill="none"
                      filter={`url(#${shadowFilter})`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ 
                        transition: 'stroke-width 0.2s, filter 0.2s',
                        pointerEvents: 'none'
                      }}
                    />
                    {/* Invisible thick path for easier clicking */}
                    <path
                      d={getEdgePath(edge)}
                      stroke="transparent"
                      strokeWidth={20}
                      fill="none"
                      strokeLinecap="round"
                      onClick={(e) => handleEdgeClick(e, edge.id)}
                      style={{ cursor: activeTool === TOOLS.DELETE ? 'crosshair' : 'pointer' }}
                    />
                    <text
                      x={weightPos.x}
                      y={weightPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fontWeight={isMST ? '700' : '500'}
                      fill={isMST ? '#1e8c49' : '#34495e'}
                      stroke={isMST ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)'}
                      strokeWidth="3"
                      paintOrder="stroke fill"
                      style={{ 
                        pointerEvents: 'none',
                        fontFamily: 'monospace',
                        textShadow: isMST ? '0 0 4px rgba(39,174,96,0.5)' : 'none'
                      }}
                    >
                      {edge.weight}
                    </text>
                  </g>
                );
              })}
              
              {/* Pipe preview while dragging */}
              {pipeStart && pipePreview && (
                <line
                  x1={pipeStart.x}
                  y1={pipeStart.y}
                  x2={pipePreview.x}
                  y2={pipePreview.y}
                  stroke="url(#pipe-gradient-normal)"
                  strokeWidth={6}
                  strokeDasharray="8,4"
                  strokeLinecap="round"
                  filter="url(#pipe-shadow)"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>
            
            {/* Nodes (HTML divs for better interaction) */}
            {nodes.map(node => {
              const radius = getNodeRadius(node.type);
              const isSelected = isNodeSelected(node.id);
              
              return (
                <div
                  key={node.id}
                  className={`node ${node.type} ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${radius * 2}px`,
                    height: `${radius * 2}px`,
                    transform: 'translate(-50%, -50%)',
                    transformOrigin: 'center center',
                    cursor: activeTool === TOOLS.DELETE ? 'crosshair' : 
                           activeTool === TOOLS.PIPE ? 'crosshair' : 'default',
                    userSelect: 'none',
                    WebkitUserDrag: 'none'
                  }}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                  onMouseMove={(e) => {
                    if (pipeStart && activeTool === TOOLS.PIPE) {
                      const { x, y } = screenToCanvas(e.clientX, e.clientY);
                      setPipePreview({ x, y });
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleNodeMouseDown(e, node.id);
                  }}
                  title={`${node.type}: ${node.id.slice(0, 6)} ${activeTool === TOOLS.DELETE ? '- Click to delete' : activeTool === TOOLS.PIPE ? '- Drag to connect' : ''}`}
                >
                  {isSelected && (
                    <div className="delete-badge" onClick={(e) => {
                      e.stopPropagation();
                      setNodes(prev => prev.filter(n => n.id !== node.id));
                      setEdges(prev => prev.filter(e => e.source !== node.id && e.target !== node.id));
                      setSelectedId(null);
                      setSelectedType(null);
                    }}>
                      ×
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
      
      {mstResult && (
        <div className="result-panel">
          <h3>✅ Kruskal's Algorithm Result</h3>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">Total Nodes</span>
              <span className="stat-value">{mstResult.node_count}</span>
            </div>
            <div className="stat">
              <span className="stat-label">MST Edges</span>
              <span className="stat-value">{mstResult.edge_count}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Pipe Length</span>
              <span className="stat-value mst-weight">{mstResult.total_weight} units</span>
            </div>
            <div className="stat">
              <span className="stat-label">Savings</span>
              <span className="stat-value mst-weight">
                {edges.reduce((sum, e) => sum + e.weight, 0) - mstResult.total_weight} units
              </span>
            </div>
          </div>
        </div>
      )}
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>
              {modalType === 'error' ? '⚠️ Not Enough Nodes' :
               modalType === 'noEdges' ? '⚠️ No Connections' :
               '⚠️ Server Error'}
            </h3>
            <p>
              {modalType === 'error' ? 'Please add at least 2 nodes (houses, junctions, or sources) before running the algorithm.' :
               modalType === 'noEdges' ? 'Please connect some nodes with pipes before running Kruskal\'s algorithm.' :
               'Failed to connect to the backend server. Make sure the Python server is running on port 5000.'}
            </p>
            <div className="modal-buttons">
              <button className="modal-btn confirm" onClick={() => setShowModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
      
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default App;