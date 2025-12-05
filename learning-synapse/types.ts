import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: 'root' | 'concept';
  description: string;
  expanded: boolean;
  group: number;
  // Explicitly add d3 simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  // Interaction state
  pinned?: boolean; 
  // User created or edited content
  userContent?: NodeExplanation;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface NodeExplanation {
  definition: string;
  analogy: string;
  keyFacts: string[];
}

export interface SynthesisResult {
  title: string;
  connection: string;
  insight: string;
}

export interface KnowledgeCard {
  title: string; // e.g., "The Butterfly Effect" or a specific date
  category: string; // e.g., "History", "Fun Fact", "Application"
  content: string; // The interesting tidbit
}

export interface SoulMetrics {
  valence: number;
  arousal: number;
  complexity: number;
  mysticism: number;
  accentColor: string;
  dominantColor: string;
  secondaryColor: string;
  keywords: string[];
  summary: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING_GRAPH = 'LOADING_GRAPH',
  ANALYZING = 'ANALYZING',
  EXPLORING = 'EXPLORING',
  EXPANDING_NODE = 'EXPANDING_NODE',
  SYNTHESIZING = 'SYNTHESIZING',
  ERROR = 'ERROR'
}