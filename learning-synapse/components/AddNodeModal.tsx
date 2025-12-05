import React, { useState } from 'react';
import { NodeExplanation } from '../types';
import { generateConceptExplanation, polishConceptExplanation } from '../services/geminiService';

interface AddNodeModalProps {
  onClose: () => void;
  onSubmit: (label: string, content: NodeExplanation) => void;
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({ onClose, onSubmit }) => {
  const [label, setLabel] = useState('');
  const [definition, setDefinition] = useState('');
  const [analogy, setAnalogy] = useState('');
  const [fact1, setFact1] = useState('');
  const [fact2, setFact2] = useState('');
  const [fact3, setFact3] = useState('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const content: NodeExplanation = {
      definition: definition.trim() || "User created concept.",
      analogy: analogy.trim() || "No analogy provided.",
      keyFacts: [fact1, fact2, fact3].filter(f => f.trim() !== '')
    };

    if (content.keyFacts.length === 0) {
      content.keyFacts.push("No specific facts recorded yet.");
    }

    onSubmit(label, content);
  };

  const handleAutoGenerate = async () => {
    if (!label.trim()) return;
    setIsAiLoading(true);
    try {
        const result = await generateConceptExplanation(label);
        setDefinition(result.definition);
        setAnalogy(result.analogy);
        setFact1(result.keyFacts[0] || '');
        setFact2(result.keyFacts[1] || '');
        setFact3(result.keyFacts[2] || '');
    } catch (e) {
        console.error(e);
    } finally {
        setIsAiLoading(false);
    }
  };

  const handlePolish = async () => {
    if (!label.trim()) return;
    setIsAiLoading(true);
    try {
        const draft = {
            definition,
            analogy,
            keyFacts: [fact1, fact2, fact3].filter(f => f.trim())
        };
        const result = await polishConceptExplanation(label, draft);
        setDefinition(result.definition);
        setAnalogy(result.analogy);
        setFact1(result.keyFacts[0] || '');
        setFact2(result.keyFacts[1] || '');
        setFact3(result.keyFacts[2] || '');
    } catch (e) {
        console.error(e);
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-pink-900/20 to-purple-900/20">
          <h2 className="text-xl font-bold text-white">Create New Concept</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Concept Name *</label>
            <div className="flex gap-2">
                <input 
                type="text" 
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Quantum Entanglement"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
                />
                <button 
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={!label.trim() || isAiLoading}
                    className="shrink-0 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAiLoading ? (
                        <span className="w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <>✨ Auto-Fill</>
                    )}
                </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Definition</label>
            <textarea 
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="What is this concept?"
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Analogy</label>
            <textarea 
              value={analogy}
              onChange={(e) => setAnalogy(e.target.value)}
              placeholder="It's like..."
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition-colors resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Key Facts</label>
            <input type="text" value={fact1} onChange={(e) => setFact1(e.target.value)} placeholder="Fact 1" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"/>
            <input type="text" value={fact2} onChange={(e) => setFact2(e.target.value)} placeholder="Fact 2" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"/>
            <input type="text" value={fact3} onChange={(e) => setFact3(e.target.value)} placeholder="Fact 3" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"/>
          </div>
          
          <button
            type="button"
            onClick={handlePolish}
            disabled={!label.trim() || isAiLoading}
            className="w-full py-2 bg-gradient-to-r from-violet-600/20 to-pink-600/20 hover:from-violet-600/30 hover:to-pink-600/30 border border-pink-500/30 rounded-lg text-pink-200 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
             {isAiLoading ? (
                 <span className="w-4 h-4 border-2 border-pink-300 border-t-transparent rounded-full animate-spin"></span>
             ) : (
                 <>🪄 Polish & Expand with AI</>
             )}
          </button>

        </div>

        <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit} type="button" className="px-6 py-2 rounded-lg text-sm font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/20 transition-all">Create Node</button>
        </div>

      </div>
    </div>
  );
};

export default AddNodeModal;