import React from 'react';
import { SoulMetrics } from '../types';

interface MetricsDisplayProps {
  metrics: SoulMetrics;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metrics }) => {
  return (
    <div className="glass-panel p-6 rounded-xl w-full max-w-sm border-l-4 transition-all duration-500 hover:scale-105" style={{ borderLeftColor: metrics.dominantColor }}>
      <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Semantic Physics</h3>
      
      <div className="space-y-4">
        <MetricBar label="Valence (Joy)" value={(metrics.valence + 1) / 2} color={metrics.dominantColor} />
        <MetricBar label="Arousal (Energy)" value={metrics.arousal} color={metrics.accentColor} />
        <MetricBar label="Complexity" value={metrics.complexity} color={metrics.secondaryColor} />
        <MetricBar label="Mysticism" value={metrics.mysticism} color="#ffffff" />
      </div>

      <div className="mt-6 pt-6 border-t border-gray-800">
        <div className="flex flex-wrap gap-2 mb-4">
          {metrics.keywords.map((k, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300 border border-white/5">
              #{k}
            </span>
          ))}
        </div>
        <p className="text-sm italic text-gray-400 font-serif leading-relaxed">
          "{metrics.summary}"
        </p>
      </div>
    </div>
  );
};

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-gray-500 w-24">{label}</span>
    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${value * 100}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-xs text-gray-600 font-mono w-8 text-right">{(value * 100).toFixed(0)}%</span>
  </div>
);

export default MetricsDisplay;