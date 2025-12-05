import React, { useState } from 'react';
import { GraphNode } from '../types';

interface ResourceLibraryProps {
  savedNodes: GraphNode[];
  onRemove: (nodeId: string) => void;
  onNodeClick: (node: GraphNode) => void;
}

const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ savedNodes, onRemove, onNodeClick }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div 
      id="resource-library-zone" // Critical for Drag & Drop detection
      className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 w-full flex flex-col transition-all duration-300 hover:bg-black/60 hover:border-violet-500/30 group pointer-events-auto ${isExpanded ? 'h-48 md:h-64' : 'h-auto'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 hover:text-violet-300 transition-colors w-full text-left"
            title={isExpanded ? "Collapse Library" : "Expand Library"}
        >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
             {isExpanded ? "Resource Library" : "Library"}
             
             {/* Chevron Indicator */}
             <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`opacity-50 transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`}
             >
                <polyline points="6 9 12 15 18 9"></polyline>
             </svg>

             <div className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">{savedNodes.length}</div>
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 animate-fade-in">
          {savedNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-white/5 rounded-lg p-4 h-full transition-colors group-hover:border-violet-500/20">
              <p className="text-gray-600 text-xs mb-2">Drag concepts here</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            </div>
          ) : (
            savedNodes.map(node => (
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceLibrary;