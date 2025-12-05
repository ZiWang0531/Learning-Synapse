import React, { useState } from 'react';
import { AppState } from '../types';

interface InputPanelProps {
  onAnalyze: (text: string) => void;
  appState: AppState;
}

const InputPanel: React.FC<InputPanelProps> = ({ onAnalyze, appState }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAnalyze(inputText);
  };

  const isProcessing = appState === AppState.ANALYZING;

  return (
    <div className="w-full max-w-lg mx-auto z-10 relative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
            placeholder="Describe a feeling, a dream, or a moment in time..."
            className="relative w-full h-32 bg-black/80 text-white p-4 rounded-lg border border-gray-800 focus:outline-none focus:border-purple-500 resize-none font-light text-lg placeholder-gray-600 glass-panel"
            />
        </div>

        <button
          type="submit"
          disabled={isProcessing || !inputText.trim()}
          className={`
            relative px-8 py-3 rounded-lg font-bold tracking-wider uppercase text-sm transition-all duration-300
            ${isProcessing 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]'
            }
          `}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></span>
              Synthesizing...
            </span>
          ) : (
            'Transmute to Geometry'
          )}
        </button>
      </form>
    </div>
  );
};

export default InputPanel;