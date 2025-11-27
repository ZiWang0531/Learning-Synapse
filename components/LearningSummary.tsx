import React from 'react';
import { GraphNode } from '../types';

interface LearningSummaryProps {
  savedNodes: GraphNode[];
  onClose: () => void;
  onRestart: () => void;
}

const LearningSummary: React.FC<LearningSummaryProps> = ({ savedNodes, onClose, onRestart }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-violet-900/20 to-blue-900/20">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Session Review</h2>
            <p className="text-gray-400 text-sm">Your knowledge journey summary</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
             <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-violet-400 mb-1">{savedNodes.length}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Concepts Collected</span>
             </div>
             <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-sky-400 mb-1">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Completion Time</span>
             </div>
             <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-emerald-400 mb-1">∞</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Potential Connections</span>
             </div>
          </div>

          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            Collected Knowledge
          </h3>

          {savedNodes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
              <p className="text-gray-500 mb-2">No concepts were collected this session.</p>
              <p className="text-xs text-gray-600">Explore the graph and save nodes to review them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedNodes.map((node, index) => (
                <div key={node.id} className="bg-white/5 border border-white/5 rounded-lg p-4 flex items-start gap-4 group hover:bg-white/10 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-3 h-3 rounded-full ${node.type === 'root' ? 'bg-violet-500' : 'bg-sky-500'}`}></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-200 group-hover:text-white transition-colors">{node.label}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{node.description || "No description available."}</p>
                  </div>
                  <div className="text-xs text-gray-600 font-mono mt-1">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Keep Exploring
          </button>
          <button 
            onClick={onRestart}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-gray-200 transition-colors"
          >
            Start New Topic
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearningSummary;