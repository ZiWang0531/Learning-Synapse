import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GraphData, GraphNode, GraphLink, AppState, SynthesisResult, NodeExplanation } from './types';
import { decomposeTopic, synthesizeConcepts } from './services/geminiService';
import KnowledgeGraph from './components/KnowledgeGraph';
import TopicInput from './components/TopicInput';
import InfoSidebar from './components/InfoSidebar';
import ResourceLibrary from './components/ResourceLibrary';
import LearningSummary from './components/LearningSummary';
import AddNodeModal from './components/AddNodeModal';

const App: React.FC = () => {
  // --- STATE ---
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection & Synthesis
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false); // Used for both Synthesis and Creator Mode selection
  const [selectedForSynthesis, setSelectedForSynthesis] = useState<Set<string>>(new Set());
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);

  // Creator Mode State
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  
  // Undo State
  const [undoData, setUndoData] = useState<{ nodes: GraphNode[], links: GraphLink[] } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Library & Review State
  const [savedNodes, setSavedNodes] = useState<GraphNode[]>([]);
  const savedNodeIds = useMemo(() => new Set(savedNodes.map(n => n.id)), [savedNodes]);
  const [showSummary, setShowSummary] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- LOGIC ---
  const filteredGraphData = useMemo(() => {
    if (!searchTerm.trim()) return graphData;
    const lowerTerm = searchTerm.toLowerCase();
    const visibleNodes = graphData.nodes.filter(n => n.label.toLowerCase().includes(lowerTerm));
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleLinks = graphData.links.filter(link => {
        const source = link.source;
        const target = link.target;
        const sourceId = typeof source === 'object' ? (source as GraphNode).id : (source as string);
        const targetId = typeof target === 'object' ? (target as GraphNode).id : (target as string);
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
    return { nodes: visibleNodes, links: visibleLinks };
  }, [graphData, searchTerm]);

  const handleInitialSearch = async (topic: string) => {
    setAppState(AppState.LOADING_GRAPH);
    setErrorMsg(null);
    setSelectedNode(null);
    setSynthesisResult(null);
    setIsSelectionMode(false);
    setIsCreatorMode(false);
    setSelectedForSynthesis(new Set());
    setSearchTerm('');
    setUndoData(null);
    try {
      const data = await decomposeTopic(topic);
      const processedNodes = data.nodes.map((n, i) => ({
        ...n,
        type: (n.label.toLowerCase() === topic.toLowerCase() || i === 0) ? 'root' as const : 'concept' as const,
        expanded: false,
        group: 1
      }));
      setGraphData({ nodes: processedNodes, links: data.links });
      setAppState(AppState.EXPLORING);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to initialize. Please try a different topic.");
      setAppState(AppState.ERROR);
    }
  };

  const handleExpandNode = async (node: GraphNode) => {
    if (node.expanded) return;
    setAppState(AppState.EXPANDING_NODE);
    try {
      const newData = await decomposeTopic(node.label, node.id);
      const updatedNodes = graphData.nodes.map(n => n.id === node.id ? { ...n, expanded: true } : n);
      const existingIds = new Set(updatedNodes.map(n => n.id));
      const newNodes = newData.nodes.filter(n => !existingIds.has(n.id)).map(n => ({ ...n, expanded: false, group: node.group + 1, type: 'concept' as const }));
      setGraphData(prev => ({ nodes: [...updatedNodes, ...newNodes], links: [...prev.links, ...newData.links] }));
      setAppState(AppState.EXPLORING);
    } catch (err) { console.error(err); setAppState(AppState.EXPLORING); }
  };

  const handleNodeClick = (node: GraphNode) => {
    if (isSelectionMode) {
        const newSet = new Set(selectedForSynthesis);
        if (newSet.has(node.id)) newSet.delete(node.id);
        else {
             // In Creator Mode, allow unlimited selection. In Synthesis mode, limit to 3.
             if (isCreatorMode || newSet.size < 3) {
                 newSet.add(node.id);
             }
        }
        setSelectedForSynthesis(newSet);
    } else { setSelectedNode(node); }
  };

  const handleSynthesize = async () => {
    if (selectedForSynthesis.size < 2) return;
    setAppState(AppState.SYNTHESIZING);
    try {
        const labels = graphData.nodes.filter(n => selectedForSynthesis.has(n.id)).map(n => n.label);
        const result = await synthesizeConcepts(labels);
        setSynthesisResult(result);
    } catch (err) { console.error(err); } finally { setAppState(AppState.EXPLORING); }
  };

  // --- CREATOR MODE ACTIONS ---

  const handleManualAddNode = (label: string, content: NodeExplanation) => {
      const id = `manual-${Date.now()}`;
      const newNode: GraphNode = {
          id,
          label,
          description: content.definition.substring(0, 100) + '...',
          type: 'concept',
          expanded: false,
          group: 2,
          x: dimensions.width / 2 + (Math.random() - 0.5) * 50,
          y: dimensions.height / 2 + (Math.random() - 0.5) * 50,
          userContent: content // Store the full content
      };
      setGraphData(prev => ({
          ...prev,
          nodes: [...prev.nodes, newNode]
      }));
      setShowAddNodeModal(false);
  };

  const handleUpdateNodeContent = (nodeId: string, content: NodeExplanation) => {
      setGraphData(prev => ({
          ...prev,
          nodes: prev.nodes.map(n => 
              n.id === nodeId ? { ...n, userContent: content } : n
          )
      }));
      // Also update selected node if it's the one being edited, to trigger re-render in Sidebar
      if (selectedNode && selectedNode.id === nodeId) {
          setSelectedNode(prev => prev ? { ...prev, userContent: content } : null);
      }
  };

  const handleManualDeleteSelected = () => {
      if (selectedForSynthesis.size === 0) return;
      
      const idsToDelete = new Set(selectedForSynthesis);

      // Identify what to save for Undo
      const nodesToDelete = graphData.nodes.filter(n => idsToDelete.has(n.id));
      const linksToDelete = graphData.links.filter(l => {
          const source = l.source;
          const target = l.target;
          const sid = typeof source === 'object' ? (source as GraphNode).id : (source as string);
          const tid = typeof target === 'object' ? (target as GraphNode).id : (target as string);
          return idsToDelete.has(sid) || idsToDelete.has(tid);
      });

      // Save to undo history
      setUndoData({ nodes: nodesToDelete, links: linksToDelete });

      // Clear existing timeout if any
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      // Auto-dismiss undo after 5 seconds
      undoTimeoutRef.current = setTimeout(() => setUndoData(null), 5000);

      // Perform Deletion
      setGraphData(prev => {
          const newNodes = prev.nodes.filter(n => !idsToDelete.has(n.id));
          // Remove links connected to deleted nodes
          const newLinks = prev.links.filter(l => {
              const source = l.source as any;
              const target = l.target as any;
              const sid = typeof source === 'object' ? source.id : source;
              const tid = typeof target === 'object' ? target.id : target;
              return !idsToDelete.has(sid) && !idsToDelete.has(tid);
          });
          return { nodes: newNodes, links: newLinks };
      });
      setSelectedForSynthesis(new Set());
  };

  const handleUndoDelete = () => {
      if (!undoData) return;
      
      setGraphData(prev => ({
          nodes: [...prev.nodes, ...undoData.nodes],
          links: [...prev.links, ...undoData.links]
      }));
      
      setUndoData(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleManualLinkSelected = () => {
      const ids = Array.from(selectedForSynthesis) as string[];
      if (ids.length < 2) {
          alert("Select at least 2 nodes to link.");
          return;
      }

      const newLinks: GraphLink[] = [];
      // Link chain: 1-2, 2-3, 3-4...
      for (let i = 0; i < ids.length - 1; i++) {
          const sourceId = ids[i];
          const targetId = ids[i+1];
          // Check if link exists
          const exists = graphData.links.some(l => {
              const source = l.source as any;
              const target = l.target as any;
              const s = typeof source === 'object' ? source.id : source;
              const t = typeof target === 'object' ? target.id : target;
              return (s === sourceId && t === targetId) || (s === targetId && t === sourceId);
          });
          
          if (!exists) {
              newLinks.push({ source: sourceId, target: targetId });
          }
      }

      if (newLinks.length > 0) {
          setGraphData(prev => ({
              ...prev,
              links: [...prev.links, ...newLinks]
          }));
      }
  };

  const handleManualUnlinkSelected = () => {
      const ids = Array.from(selectedForSynthesis);
      if (ids.length < 2) return;
      
      const idSet = new Set(ids);
      
      setGraphData(prev => ({
          ...prev,
          links: prev.links.filter(l => {
              const source = l.source as any;
              const target = l.target as any;
              const s = typeof source === 'object' ? source.id : source;
              const t = typeof target === 'object' ? target.id : target;
              // Remove if BOTH ends are in the selection
              return !(idSet.has(s) && idSet.has(t));
          })
      }));
  };

  // --- LIBRARY ACTIONS ---
  const handleToggleSave = (node: GraphNode) => {
    setSavedNodes(prev => {
        // Check existence in the previous state to prevent stale closure issues
        const exists = prev.some(n => n.id === node.id);
        if (exists) {
            return prev.filter(n => n.id !== node.id);
        } else {
            return [...prev, node];
        }
    });
  };

  const handleSaveNode = (node: GraphNode) => {
      setSavedNodes(prev => {
          // Robust duplicate check
          const exists = prev.some(n => n.id === node.id);
          if (exists) return prev;
          return [...prev, node];
      });
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setGraphData({ nodes: [], links: [] });
    setSelectedNode(null);
    setSynthesisResult(null);
    setIsSelectionMode(false);
    setIsCreatorMode(false);
    setSelectedForSynthesis(new Set());
    setSearchTerm('');
    setSavedNodes([]); // Clear history on full restart
    setShowSummary(false);
    setUndoData(null);
  };

  const toggleCreatorMode = () => {
      const newState = !isCreatorMode;
      setIsCreatorMode(newState);
      setIsSelectionMode(newState); // Creator mode implies selection mode
      setSelectedForSynthesis(new Set());
      setSelectedNode(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505] text-white font-sans selection:bg-violet-500/30">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      {graphData.nodes.length > 0 && (
          <div className="absolute inset-0 z-0 animate-fade-in">
             <KnowledgeGraph 
                data={filteredGraphData} 
                onNodeClick={handleNodeClick}
                selectedNodeIds={selectedForSynthesis}
                width={dimensions.width}
                height={dimensions.height}
                isSelectionMode={isSelectionMode}
                // Props for drag-to-save
                onSaveNode={handleSaveNode}
                savedNodeIds={savedNodeIds}
             />
          </div>
      )}

      {/* Resource Library & Finish Button (Bottom Right) */}
      {graphData.nodes.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 w-64 animate-slide-in-right flex flex-col gap-2 pointer-events-none">
              {/* Finish Button */}
              <button 
                onClick={() => setShowSummary(true)}
                className="bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 pointer-events-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                End Learning
              </button>

              <ResourceLibrary 
                savedNodes={savedNodes} 
                onRemove={(id) => setSavedNodes(prev => prev.filter(n => n.id !== id))}
                onNodeClick={(node) => setSelectedNode(node)}
              />
          </div>
      )}

      {/* Initial Screen */}
      {appState === AppState.IDLE && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600">SYNAPSE</h1>
            <p className="text-gray-400 mb-8 max-w-md text-center leading-relaxed">A recursive learning engine. Enter a topic to map its conceptual DNA.</p>
            <TopicInput onSearch={handleInitialSearch} isLoading={false} />
            {errorMsg && <p className="mt-4 text-red-400 bg-red-900/20 px-4 py-2 rounded">{errorMsg}</p>}
        </div>
      )}

      {/* Loading Overlay */}
      {appState === AppState.LOADING_GRAPH && (
         <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-violet-300 font-mono text-sm animate-pulse">Constructing Neural Pathways...</p>
         </div>
      )}

      {/* Top Controls */}
      {graphData.nodes.length > 0 && (
          <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none flex justify-between items-start">
              <div className="pointer-events-auto flex flex-col gap-2 w-full max-w-xs">
                  <button onClick={resetApp} className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Home
                  </button>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                     <input type="text" placeholder="Filter nodes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-sm rounded-lg block pl-9 p-2.5 focus:outline-none focus:border-sky-500 transition-all shadow-lg"/>
                     {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
                  </div>
              </div>
              <div className="pointer-events-auto flex flex-col items-end gap-2">
                {/* Mode Toggles */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => { 
                            setIsSelectionMode(!isSelectionMode); 
                            setIsCreatorMode(false);
                            setSelectedNode(null); 
                            setSynthesisResult(null); 
                            setSelectedForSynthesis(new Set());
                        }} 
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border shadow-xl ${isSelectionMode && !isCreatorMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-emerald-900/20' : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/5'}`}
                    >
                        {isSelectionMode && !isCreatorMode ? <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>Synthesis</> : <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Connect</>}
                    </button>

                    <button 
                        onClick={toggleCreatorMode} 
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border shadow-xl ${isCreatorMode ? 'bg-pink-500/10 text-pink-400 border-pink-500/50 shadow-pink-900/20' : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/5'}`}
                    >
                         {isCreatorMode ? <><div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>Creator Mode</> : <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>Create</>}
                    </button>
                </div>

                {/* Synthesis Panel */}
                {isSelectionMode && !isCreatorMode && (
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl max-w-xs animate-slide-in-right">
                        <p className="text-xs text-gray-400 mb-3">Select up to 3 concepts to generate a synthesis.</p>
                        <div className="flex flex-wrap gap-2 mb-3">{Array.from(selectedForSynthesis).map(id => (<span key={id} className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/30">{graphData.nodes.find(n => n.id === id)?.label}</span>))}</div>
                        <button onClick={handleSynthesize} disabled={selectedForSynthesis.size < 2 || appState === AppState.SYNTHESIZING} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2 rounded transition-colors">{appState === AppState.SYNTHESIZING ? 'Synthesizing...' : 'Generate Insight'}</button>
                    </div>
                )}

                {/* Creator Studio Panel */}
                {isCreatorMode && (
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl w-64 animate-slide-in-right">
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                             <h3 className="text-sm font-bold text-pink-400">Creator Studio</h3>
                             <span className="text-[10px] text-gray-500 uppercase tracking-widest">Edit Mode</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button onClick={() => setShowAddNodeModal(true)} className="col-span-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                                Add Node
                            </button>
                        </div>

                        <div className="text-xs text-gray-400 mb-2">Selected: <span className="text-white">{selectedForSynthesis.size}</span></div>
                        
                        <div className="grid grid-cols-3 gap-1">
                             <button 
                                onClick={handleManualLinkSelected}
                                disabled={selectedForSynthesis.size < 2}
                                className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] py-2 rounded flex flex-col items-center justify-center gap-1"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                Link
                             </button>
                             <button 
                                onClick={handleManualUnlinkSelected}
                                disabled={selectedForSynthesis.size < 2}
                                className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] py-2 rounded flex flex-col items-center justify-center gap-1"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18.84 12.25 1.72-1.71h0a5 5 0 0 0-7.07-7.07l-1.71 1.71"/><path d="m5.17 11.75-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                Unlink
                             </button>
                             <button 
                                onClick={handleManualDeleteSelected}
                                disabled={selectedForSynthesis.size === 0}
                                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] py-2 rounded flex flex-col items-center justify-center gap-1"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Delete
                             </button>
                        </div>
                    </div>
                )}

              </div>
          </div>
      )}

      {selectedNode && !isSelectionMode && (
        <div className="absolute top-0 right-0 h-full w-full md:w-[450px] z-20 shadow-2xl shadow-black">
            <InfoSidebar 
                node={selectedNode}
                contextNodes={graphData.nodes.slice(0, 5).map(n => n.label)}
                onClose={() => setSelectedNode(null)}
                onExpand={handleExpandNode}
                isExpanding={appState === AppState.EXPANDING_NODE}
                isSaved={savedNodeIds.has(selectedNode.id)}
                onToggleSave={handleToggleSave}
                onUpdateNode={handleUpdateNodeContent}
            />
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
          <LearningSummary 
            savedNodes={savedNodes}
            onClose={() => setShowSummary(false)}
            onRestart={resetApp}
          />
      )}

      {/* Add Node Modal */}
      {showAddNodeModal && (
          <AddNodeModal 
            onClose={() => setShowAddNodeModal(false)}
            onSubmit={handleManualAddNode}
          />
      )}

      {synthesisResult && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#0f172a] border border-emerald-500/30 max-w-2xl w-full rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-white/5 flex justify-between items-start shrink-0">
                      <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-emerald-400 font-mono text-xs uppercase tracking-widest">Synthesis Complete</span></div>
                          <h2 className="text-2xl font-bold text-white leading-tight">{synthesisResult.title}</h2>
                      </div>
                      <button onClick={() => setSynthesisResult(null)} className="text-gray-500 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar"><div className="space-y-6"><div><h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">The Connection</h3><p className="text-gray-200 leading-relaxed border-l-2 border-emerald-500/30 pl-4">{synthesisResult.connection}</p></div><div className="bg-emerald-900/10 p-6 rounded-xl border border-emerald-500/20"><h3 className="text-sm text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h10"/><path d="M9 4v16"/><path d="m3 9 3 3-3 3"/><path d="M14 8V4h8v4"/><path d="M14 16v4h8v-4"/><path d="M14 12h8"/></svg>Core Insight</h3><p className="text-emerald-100 italic">{synthesisResult.insight}</p></div></div></div>
                  <div className="p-6 border-t border-white/5 shrink-0 flex justify-end bg-black/20 rounded-b-2xl"><button onClick={() => setSynthesisResult(null)} className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors">Continue Exploring</button></div>
              </div>
          </div>
      )}

      {/* Undo Toast */}
      {undoData && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-[#0f172a] border border-white/10 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium">Deleted {undoData.nodes.length} concepts</span>
                </div>
                <div className="h-4 w-px bg-white/10"></div>
                <button 
                    onClick={handleUndoDelete}
                    className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wide flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                    Undo
                </button>
                <button 
                    onClick={() => {
                        setUndoData(null);
                        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                    }}
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;