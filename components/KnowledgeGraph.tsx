import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  selectedNodeIds: Set<string>;
  width?: number;
  height?: number;
  isSelectionMode: boolean;
  // New Prop for Drag-to-Save
  onSaveNode: (node: GraphNode) => void;
  savedNodeIds: Set<string>;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  data, 
  onNodeClick, 
  selectedNodeIds, 
  width = 800, 
  height = 600,
  isSelectionMode,
  onSaveNode,
  savedNodeIds
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const nodeRegistry = useRef<Map<string, GraphNode>>(new Map());

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [physics, setPhysics] = useState({
    repulsion: 300, // Reduced from 400 to prevent extreme scattering
    linkDistance: 80, // Reduced from 120 for tighter clusters
    collision: 45
  });

  const isConnected = (aId: string, bId: string) => {
    return data.links.some(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return (sourceId === aId && targetId === bId) || (sourceId === bId && targetId === aId);
    });
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 
    const g = svg.append("g");
    gRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    simulationRef.current = d3.forceSimulation<GraphNode, GraphLink>()
      .force("link", d3.forceLink<GraphNode, GraphLink>().id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2))
      // Add gravity wells to center to keep unlinked nodes from floating away
      .force("x", d3.forceX(width / 2).strength(0.08)) 
      .force("y", d3.forceY(height / 2).strength(0.08))
      .force("collide", d3.forceCollide())
      // Increase friction (decay) to stop "slippery" feel
      .velocityDecay(0.6);

    return () => {
      simulationRef.current?.stop();
    };
  }, []); 

  useEffect(() => {
    if (!simulationRef.current) return;
    
    // Update forces
    simulationRef.current.force("center", d3.forceCenter(width / 2, height / 2));
    (simulationRef.current.force("x") as d3.ForceX<GraphNode>).x(width / 2);
    (simulationRef.current.force("y") as d3.ForceY<GraphNode>).y(height / 2);
    
    (simulationRef.current.force("charge") as d3.ForceManyBody<GraphNode>).strength(-physics.repulsion);
    (simulationRef.current.force("link") as d3.ForceLink<GraphNode, GraphLink>).distance(physics.linkDistance);
    (simulationRef.current.force("collide") as d3.ForceCollide<GraphNode>).radius(physics.collision);
    
    simulationRef.current.alpha(0.3).restart();
  }, [width, height, physics]);

  useEffect(() => {
    if (!simulationRef.current || !gRef.current) return;
    const simulation = simulationRef.current;
    const g = gRef.current;

    // Node Reconciliation
    const newNodes = data.nodes.map(d => {
      let existing = nodeRegistry.current.get(d.id);
      if (existing) {
        Object.assign(existing, { 
            expanded: d.expanded, 
            type: d.type, 
            group: d.group, 
            label: d.label,
            // Preserve pinned state unless explicitly updated
            pinned: d.pinned !== undefined ? d.pinned : existing.pinned
        });
        return existing;
      }
      
      // Initial Position Logic
      const parentLink = data.links.find(l => {
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return targetId === d.id;
      });
      let initialX = width / 2;
      let initialY = height / 2;
      
      if (parentLink) {
          const sourceId = typeof parentLink.source === 'object' ? parentLink.source.id : parentLink.source;
          const parentNode = nodeRegistry.current.get(sourceId as string);
          if (parentNode && parentNode.x !== undefined) {
              initialX = parentNode.x + (Math.random() - 0.5) * 10;
              initialY = parentNode.y + (Math.random() - 0.5) * 10;
          }
      }

      // Create new node, respecting provided x/y if they exist (e.g. from manual creation)
      const newNode = { 
          ...d, 
          x: d.x ?? initialX, 
          y: d.y ?? initialY, 
          pinned: d.pinned || false 
      };
      
      nodeRegistry.current.set(d.id, newNode);
      return newNode;
    });

    const activeLinks = data.links.map(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        const sourceNode = nodeRegistry.current.get(sourceId as string);
        const targetNode = nodeRegistry.current.get(targetId as string);
        if (!sourceNode || !targetNode) return null;
        return { ...l, source: sourceNode, target: targetNode };
    }).filter(Boolean) as GraphLink[];

    simulation.nodes(newNodes);
    (simulation.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(activeLinks);

    // Render
    const link = g.selectAll(".link")
      .data(activeLinks, (d: any) => d.source.id + "-" + d.target.id)
      .join(
        enter => enter.append("line").attr("class", "link").attr("stroke", "#94a3b8").attr("stroke-opacity", 0).attr("stroke-width", 1.5).call(enter => enter.transition().duration(500).attr("stroke-opacity", 0.3)),
        update => update,
        exit => exit.remove()
      );

    const node = g.selectAll(".node")
      .data(newNodes, (d: any) => d.id)
      .join(
        enter => {
            const group = enter.append("g").attr("class", "node").attr("cursor", "pointer")
                .call(d3.drag()
                    .on("start", (event, d: any) => {
                        const node = d as GraphNode;
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        node.fx = node.x;
                        node.fy = node.y;
                    })
                    .on("drag", (event, d: any) => {
                        const node = d as GraphNode;
                        node.fx = event.x;
                        node.fy = event.y;
                    })
                    .on("end", (event, d: any) => {
                        const node = d as GraphNode;
                        if (!event.active) simulation.alphaTarget(0);
                        
                        // --- DROP DETECTION LOGIC ---
                        const dropZone = document.getElementById('resource-library-zone');
                        if (dropZone) {
                            const rect = dropZone.getBoundingClientRect();
                            const { sourceEvent } = event; 
                            if (sourceEvent.clientX >= rect.left && 
                                sourceEvent.clientX <= rect.right && 
                                sourceEvent.clientY >= rect.top && 
                                sourceEvent.clientY <= rect.bottom) {
                                
                                onSaveNode(node);
                                
                                // Release after dropping
                                node.fx = null;
                                node.fy = null;
                                return;
                            }
                        }
                        
                        if (!node.pinned) {
                            node.fx = null;
                            node.fy = null;
                        }
                    })
                );
            
            group.append("circle").attr("class", "halo").attr("r", 45).attr("fill", "none").attr("stroke", "#10b981").attr("stroke-width", 2).attr("opacity", 0);
            group.append("circle").attr("class", "pin").attr("r", 4).attr("fill", "#ef4444").attr("cy", -25).attr("opacity", 0);
            group.append("circle").attr("class", "core").attr("r", 0).attr("stroke", "#fff").attr("stroke-width", 1.5);
            group.append("text").text((d: any) => d.label).attr("dy", 34).attr("text-anchor", "middle").attr("fill", "#e2e8f0").attr("font-size", "11px").style("font-weight", "500").style("pointer-events", "none").style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)").attr("opacity", 0).transition().delay(200).duration(300).attr("opacity", 1);
            return group;
        }
      );

    // Context Menu: Toggle Pin
    node.on("contextmenu", (event, d) => {
        event.preventDefault();
        
        // Toggle pin state
        d.pinned = !d.pinned;

        if (d.pinned) {
            d.fx = d.x;
            d.fy = d.y;
        } else {
            d.fx = null;
            d.fy = null;
        }
        
        const currentNodeGroup = d3.select(event.currentTarget);
        currentNodeGroup.select(".pin").transition().attr("opacity", d.pinned ? 1 : 0);
        currentNodeGroup.select(".core").attr("fill", d.pinned ? "#be185d" : (d.type === 'root' ? "#7c3aed" : "#0284c7"));
    });

    node.on("mouseenter", (event, d) => setHoveredNodeId(d.id)).on("mouseleave", () => setHoveredNodeId(null));
    node.on("click", (event, d) => { event.stopPropagation(); onNodeClick(d); });

    // Visual Updates
    node.select(".halo").transition().duration(200).attr("opacity", d => selectedNodeIds.has(d.id) ? 1 : 0);
    
    node.select(".pin").transition().duration(200).attr("opacity", d => d.pinned ? 1 : 0);

    node.select(".core")
        .transition().duration(400).ease(d3.easeBackOut)
        .attr("r", d => d.type === 'root' ? 35 : 22)
        .attr("fill", d => {
            if (isSelectionMode && !selectedNodeIds.has(d.id) && selectedNodeIds.size > 0) return "#334155";
            if (savedNodeIds.has(d.id)) return "#eab308"; // Saved Color
            if (d.pinned) return "#be185d"; // Pinned Color
            return d.type === 'root' ? "#7c3aed" : "#0284c7"; 
        })
        .attr("stroke", d => d.expanded ? "#fbbf24" : "#fff");

    g.selectAll(".node").transition().duration(200).attr("opacity", (d: any) => {
            const node = d as GraphNode;
            if (!hoveredNodeId) return 1; 
            if (node.id === hoveredNodeId) return 1; 
            if (isConnected(node.id, hoveredNodeId)) return 1; 
            return 0.1; 
        });

    g.selectAll(".link").transition().duration(200).attr("stroke-opacity", (d: any) => {
            if (!hoveredNodeId) return 0.3;
            const link = d as GraphLink;
            const sid = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source as string;
            const tid = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target as string;
            if (sid === hoveredNodeId || tid === hoveredNodeId) return 0.8;
            return 0.05;
        }).attr("stroke", (d: any) => {
             const link = d as GraphLink;
             const sid = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source as string;
             const tid = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target as string;
             if (sid === hoveredNodeId || tid === hoveredNodeId) return "#fff";
             return "#94a3b8";
        });

    node.attr("cursor", isSelectionMode ? "cell" : "pointer");
    simulation.on("tick", () => {
      link.attr("x1", d => (d.source as GraphNode).x!).attr("y1", d => (d.source as GraphNode).y!).attr("x2", d => (d.target as GraphNode).x!).attr("y2", d => (d.target as GraphNode).y!);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    simulation.alpha(0.3).restart();
  }, [data, selectedNodeIds, isSelectionMode, width, height, onNodeClick, physics, hoveredNodeId, savedNodeIds]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-[#050505] relative overflow-hidden rounded-xl shadow-2xl">
      <div className="absolute bottom-4 left-4 z-10 flex flex-col sm:flex-row gap-4 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-lg border border-white/10 shadow-lg pointer-events-auto">
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Network Topology</h4>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.5)]"></div><span className="text-xs text-gray-300">Root Node</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 rounded-full bg-sky-600 shadow-[0_0_8px_rgba(2,132,199,0.5)]"></div><span className="text-xs text-gray-300">Concept</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 rounded-full border border-amber-400"></div><span className="text-xs text-gray-300">Expanded Source</span></div>
             <div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 rounded-full border border-emerald-500"></div><span className="text-xs text-gray-300">Selected for Synthesis</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 rounded-full bg-pink-700"></div><span className="text-xs text-gray-300">Pinned (Right Click)</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-xs text-gray-300">Saved in Library</span></div>
          </div>

          <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-lg border border-white/10 shadow-lg pointer-events-auto min-w-[200px]">
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">Physics Lab</h4>
            <div className="mb-3"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Repulsion</span><span>{physics.repulsion}</span></div><input type="range" min="50" max="1000" step="10" value={physics.repulsion} onChange={(e) => setPhysics({...physics, repulsion: Number(e.target.value)})} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"/></div>
            <div><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Connection Length</span><span>{physics.linkDistance}</span></div><input type="range" min="30" max="300" step="10" value={physics.linkDistance} onChange={(e) => setPhysics({...physics, linkDistance: Number(e.target.value)})} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"/></div>
          </div>
      </div>
      <svg ref={svgRef} width={width} height={height} className="w-full h-full block touch-none" />
    </div>
  );
};

export default KnowledgeGraph;