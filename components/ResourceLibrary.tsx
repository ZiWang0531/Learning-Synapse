import React from 'react';
import { GraphNode } from '../types';

interface ResourceLibraryProps {
  savedNodes: GraphNode[];
  onRemove: (nodeId: string) => void;
  onNodeClick: (node: GraphNode) => void;
}

const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ savedNodes, onRemove, onNodeClick }) => {
  return (
    <div 
      id="resource-library-zone" // Critical for Drag & Drop detection
      className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 w-full h-full flex flex-col transition-all duration-300 hover:bg-black/60 hover:border-violet-500/30 group"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2 group-hover:text-violet-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          Resource Library
        </h3>
        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">{savedNodes.length}</span>
      </div>

      {savedNodes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/5 rounded-lg p-4 transition-colors group-hover:border-violet-500/20">
          <p className="text-gray-600 text-xs mb-2">Drag concepts here to collect them</p>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {savedNodes.map(node => (
            <div 
              key={node.id} 
              className="group/item flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg p-2 border border-transparent hover:border-violet-500/30 transition-all cursor-pointer"
              onClick={() => onNodeClick(node)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-2 h-2 rounded-full shrink-0 ${node.type === 'root' ? 'bg-violet-500' : 'bg-sky-500'}`}></div>
                <span className="text-sm text-gray-300 truncate group-hover/item:text-white">{node.label}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceLibrary;