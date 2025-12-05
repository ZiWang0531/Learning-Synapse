import React, { useState, useEffect } from 'react';
import { GraphNode, NodeExplanation, KnowledgeCard } from '../types';
import { getConceptDetails, generateKnowledgeCard } from '../services/geminiService';

interface InfoSidebarProps {
  node: GraphNode;
  contextNodes: string[]; // IDs of related nodes for context
  onExpand: (node: GraphNode) => void;
  onClose: () => void;
  isExpanding: boolean;
  // New props for saving
  isSaved: boolean;
  onToggleSave: (node: GraphNode) => void;
  // Prop for updating node content
  onUpdateNode: (nodeId: string, content: NodeExplanation) => void;
}

const InfoSidebar: React.FC<InfoSidebarProps> = ({ node, contextNodes, onExpand, onClose, isExpanding, isSaved, onToggleSave, onUpdateNode }) => {
  const [details, setDetails] = useState<NodeExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Knowledge Card State
  const [card, setCard] = useState<KnowledgeCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<NodeExplanation>({ definition: '', analogy: '', keyFacts: [] });

  useEffect(() => {
    let mounted = true;
    
    // If the node has user-defined content, use that immediately
    if (node.userContent) {
        setDetails(node.userContent);
        setLoading(false);
        setCard(null);
        setIsEditing(false);
        return;
    }

    // Otherwise fetch from Gemini
    const fetchDetails = async () => {
      setLoading(true);
      setDetails(null);
      setCard(null); 
      setIsEditing(false);
      try {
        const data = await getConceptDetails(node.label, contextNodes);
        if (mounted) setDetails(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => { mounted = false; };
  }, [node.id, node.userContent]); // Add node.userContent dependency to refresh if updated

  const handleGenerateCard = async () => {
      setLoadingCard(true);
      try {
          const newCard = await generateKnowledgeCard(node.label);
          setCard(newCard);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingCard(false);
      }
  }

  const startEditing = () => {
      if (details) {
          setEditForm({
              definition: details.definition,
              analogy: details.analogy,
              keyFacts: [...details.keyFacts]
          });
          setIsEditing(true);
      }
  };

  const handleSaveEdit = () => {
      // Filter empty facts
      const cleanFacts = editForm.keyFacts.filter(f => f.trim() !== '');
      const finalContent = { ...editForm, keyFacts: cleanFacts };
      
      onUpdateNode(node.id, finalContent);
      setIsEditing(false);
      // details will update via the useEffect when node.userContent changes
  };

  const updateFact = (index: number, value: string) => {
      const newFacts = [...editForm.keyFacts];
      newFacts[index] = value;
      setEditForm({ ...editForm, keyFacts: newFacts });
  };

  const addFact = () => {
      setEditForm({ ...editForm, keyFacts: [...editForm.keyFacts, ''] });
  };

  const removeFact = (index: number) => {
      const newFacts = editForm.keyFacts.filter((_, i) => i !== index);
      setEditForm({ ...editForm, keyFacts: newFacts });
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel border-l border-white/10 animate-slide-in-right bg-[#050505]/90">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-start">
        <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-sky-400 break-words">
            {node.label}
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">{node.type}</p>
                {node.userContent && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">Edited</span>}
            </div>
        </div>
        
        <div className="flex items-center gap-1">
            {/* EDIT BUTTON */}
            {!isEditing && details && (
                <button 
                    onClick={startEditing}
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Edit Content"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
            )}

            {/* SAVE BUTTON */}
            <button 
                onClick={() => onToggleSave(node)}
                className={`p-2 rounded-lg transition-all ${isSaved ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                title={isSaved ? "Remove from Library" : "Save to Library"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            
            {/* CLOSE BUTTON */}
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {loading ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
            </div>
        ) : isEditing ? (
            // --- EDIT MODE FORM ---
            <div className="space-y-6">
                 <div>
                    <label className="text-xs text-violet-400 uppercase font-bold tracking-widest mb-2 block">Definition</label>
                    <textarea 
                        value={editForm.definition}
                        onChange={(e) => setEditForm({...editForm, definition: e.target.value})}
                        className="w-full h-32 bg-black/40 border border-white/20 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-violet-500 resize-none"
                    />
                 </div>
                 <div>
                    <label className="text-xs text-sky-400 uppercase font-bold tracking-widest mb-2 block">Analogy</label>
                    <textarea 
                        value={editForm.analogy}
                        onChange={(e) => setEditForm({...editForm, analogy: e.target.value})}
                        className="w-full h-24 bg-black/40 border border-white/20 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-sky-500 resize-none"
                    />
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-widest">Key Facts</label>
                        <button onClick={addFact} className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20">+ Add</button>
                    </div>
                    <div className="space-y-2">
                        {editForm.keyFacts.map((fact, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input 
                                    value={fact}
                                    onChange={(e) => updateFact(idx, e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/20 rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-white/40"
                                />
                                <button onClick={() => removeFact(idx)} className="text-gray-500 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                            </div>
                        ))}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-white/10">
                     <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm">Cancel</button>
                     <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20">Save Changes</button>
                 </div>
            </div>
        ) : details ? (
            // --- VIEW MODE ---
            <>
                {/* Definition */}
                <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        Core Concept
                    </h3>
                    <p className="text-gray-300 leading-relaxed font-light text-sm">
                        {details.definition}
                    </p>
                </section>

                {/* Analogy */}
                <section className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-300 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                        Think of it like...
                    </h3>
                    <p className="text-gray-400 text-sm italic border-l-2 border-sky-500/30 pl-3">
                        "{details.analogy}"
                    </p>
                </section>

                {/* Encyclopedia / Knowledge Card Section */}
                <section>
                    <h3 className="flex items-center justify-between text-sm font-semibold text-gray-300 mb-3">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/></svg>
                            Knowledge Encyclopedia
                        </div>
                        {card && !loadingCard && (
                            <button onClick={handleGenerateCard} className="text-xs text-sky-400 hover:text-white transition-colors flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                                Change Card
                            </button>
                        )}
                    </h3>

                    {!card ? (
                        <button 
                            onClick={handleGenerateCard}
                            disabled={loadingCard}
                            className="w-full py-4 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {loadingCard ? (
                                <span className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full"></span>
                            ) : (
                                <>
                                    <span className="text-sm">Reveal a Random Fact</span>
                                    <span className="text-[10px] opacity-50">Click to generate a unique knowledge card</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="relative group">
                            {loadingCard && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                    <span className="animate-spin h-6 w-6 border-2 border-pink-500 border-t-transparent rounded-full"></span>
                                </div>
                            )}
                            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-lg p-4 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
                                <div className="text-[10px] text-pink-400 uppercase tracking-widest mb-1">{card.category}</div>
                                <h4 className="text-lg font-bold text-white mb-2 leading-tight">{card.title}</h4>
                                <p className="text-sm text-gray-300 font-serif leading-relaxed">
                                    {card.content}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Facts */}
                <section>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Key Insights</h3>
                    <ul className="space-y-2">
                        {details.keyFacts.map((fact, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-400">
                                <span className="text-violet-500 mt-1">•</span>
                                <span>{fact}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </>
        ) : (
            <div className="text-red-400 text-sm">Failed to load details.</div>
        )}

      </div>

      {/* Actions (Only show if not editing) */}
      {!isEditing && (
        <div className="p-6 border-t border-white/5 bg-black/20">
            <button 
                onClick={() => onExpand(node)}
                disabled={isExpanding || node.expanded}
                className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2
                    ${node.expanded 
                        ? 'bg-amber-900/20 text-amber-500 border border-amber-500/20 cursor-default' 
                        : 'bg-gradient-to-r from-violet-600 to-sky-600 hover:from-violet-500 hover:to-sky-500 text-white shadow-lg shadow-violet-900/20'
                    }
                    ${isExpanding ? 'opacity-75 cursor-wait' : ''}
                `}
            >
                {isExpanding ? (
                    <>
                        <span className="animate-spin h-4 w-4 border-2 border-white/50 border-t-transparent rounded-full"></span>
                        Exploring Deeper...
                    </>
                ) : node.expanded ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Already Explored
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Dive Deeper
                    </>
                )}
            </button>
        </div>
      )}
    </div>
  );
};

export default InfoSidebar;