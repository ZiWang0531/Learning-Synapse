import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SoulMetrics } from '../types';

interface OrganismProps {
  metrics: SoulMetrics;
  width?: number;
  height?: number;
}

const Organism: React.FC<OrganismProps> = ({ metrics, width = 600, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const centerX = width / 2;
    const centerY = height / 2;
    
    // Map metrics to visual physics
    // Arousal determines speed of noise
    const speed = 0.005 + (metrics.arousal * 0.02); 
    // Complexity determines number of points/vertices
    const numPoints = Math.floor(10 + (metrics.complexity * 50));
    // Valence determines "spikiness" (Negative = sharp, Positive = round)
    // We handle this via curve tension, but simpler to do via noise amplitude variance
    const baseRadius = 150 + (metrics.mysticism * 50);
    const noiseAmplitude = 20 + (metrics.arousal * 80);
    
    // Create gradients
    const defs = svg.append("defs");
    
    const radialGradient = defs.append("radialGradient")
      .attr("id", "soul-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%")
      .attr("fx", "50%")
      .attr("fy", "50%");

    radialGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", metrics.accentColor)
      .attr("stop-opacity", 0.8);
      
    radialGradient.append("stop")
      .attr("offset", "60%")
      .attr("stop-color", metrics.dominantColor)
      .attr("stop-opacity", 0.4);

    radialGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", metrics.secondaryColor)
      .attr("stop-opacity", 0);

    // Filter for "Glow"
    const filter = defs.append("filter")
      .attr("id", "glow");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "8") // Blur amount
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // The Blob Path
    const path = svg.append("path")
      .attr("fill", "url(#soul-gradient)")
      .attr("stroke", metrics.secondaryColor)
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)")
      .style("mix-blend-mode", "screen");

    // Inner Core for high valence/positivity
    const core = svg.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", baseRadius * 0.3)
        .attr("fill", metrics.dominantColor)
        .attr("opacity", 0.6)
        .attr("filter", "url(#glow)");

    // Animation Loop
    let time = 0;
    
    const animate = () => {
      time += speed;
      
      const points: [number, number][] = [];
      const angleStep = (Math.PI * 2) / numPoints;

      for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep;
        
        // Simplex-like noise simulation using simple sine waves
        // We layer multiple sine waves to create "organic" irregularity
        const noiseX = Math.cos(angle * 3 + time) * Math.sin(time * 0.5);
        const noiseY = Math.sin(angle * 4 - time) * Math.cos(time * 0.3);
        
        // Spikiness factor based on Valence
        // If valence is negative, we add high frequency noise
        let spikeMod = 0;
        if (metrics.valence < 0) {
            spikeMod = Math.sin(angle * 20) * (Math.abs(metrics.valence) * 20);
        }

        const r = baseRadius + (noiseX + noiseY) * noiseAmplitude + spikeMod;
        
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        points.push([x, y]);
      }
      
      // Close the loop
      points.push(points[0]);

      // Generate curve
      // CurveBasisClosed creates smooth organic shapes. 
      // CurveLinearClosed creates jagged crystal shapes (for negative valence).
      const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1]);

      if (metrics.valence < -0.3) {
          lineGenerator.curve(d3.curveLinearClosed);
      } else {
          lineGenerator.curve(d3.curveBasisClosed);
      }

      path.attr("d", lineGenerator(points) || "");
      
      // Pulsating core based on mysticism
      const pulse = Math.sin(time * 2) * (10 * metrics.mysticism);
      core.attr("r", (baseRadius * 0.2) + pulse);

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [metrics, width, height]);

  return (
    <div className="relative flex justify-center items-center">
       <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default Organism;