import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Slab3DProps {
  thickness: number;
  shortSpan: number;
  longSpan: number;
  cover: number;
  bottomShortBars?: string;
  bottomLongBars?: string;
  topShortBars?: string;
  topLongBars?: string;
  slabType: 'One-Way Slab' | 'Two-Way Slab';
}

// Parse bar string like "T12@150"
const parseBarSpacing = (barStr?: string): { diameter: number; spacing: number } => {
  if (!barStr) return { diameter: 10, spacing: 200 };
  const match = barStr.match(/T(\d+)@(\d+)/);
  if (match) {
    return { diameter: parseInt(match[1]), spacing: parseInt(match[2]) };
  }
  // Try format like "T12 @ 200"
  const match2 = barStr.match(/T(\d+)\s*@\s*(\d+)/);
  if (match2) {
    return { diameter: parseInt(match2[1]), spacing: parseInt(match2[2]) };
  }
  return { diameter: 10, spacing: 200 };
};

// Reinforcement bar component
const SlabBar: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  diameter: number;
  color: string;
}> = ({ start, end, diameter, color }) => {
  const scale = 0.001;
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );
  
  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  // Calculate rotation
  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ).normalize();
  
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <mesh position={midPoint} quaternion={quaternion}>
      <cylinderGeometry args={[diameter * scale / 2, diameter * scale / 2, length, 8]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
    </mesh>
  );
};

// Main slab scene
const SlabScene: React.FC<Slab3DProps> = ({
  thickness,
  shortSpan,
  longSpan,
  cover,
  bottomShortBars,
  bottomLongBars,
  topShortBars,
  topLongBars,
  slabType,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 0.001;
  
  const shortM = shortSpan;
  const longM = longSpan;
  const thickM = thickness * scale;

  const bottomShort = parseBarSpacing(bottomShortBars);
  const bottomLong = parseBarSpacing(bottomLongBars);
  const topShort = parseBarSpacing(topShortBars);
  const topLong = parseBarSpacing(topLongBars);

  // Generate bar arrays
  const generateBars = (
    spanLength: number,
    barSpacing: number,
    perpSpan: number,
    y: number,
    isShortSpan: boolean
  ): { start: [number, number, number]; end: [number, number, number] }[] => {
    const bars: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const numBars = Math.floor((perpSpan * 1000) / barSpacing);
    
    for (let i = 0; i <= numBars; i++) {
      const offset = -perpSpan / 2 + (i * barSpacing * scale);
      if (isShortSpan) {
        bars.push({
          start: [-shortM / 2, y, offset],
          end: [shortM / 2, y, offset],
        });
      } else {
        bars.push({
          start: [offset, y, -longM / 2],
          end: [offset, y, longM / 2],
        });
      }
    }
    return bars;
  };

  const bottomY = -thickM / 2 + cover * scale + bottomShort.diameter * scale / 2;
  const topY = thickM / 2 - cover * scale - topShort.diameter * scale / 2;

  // Bottom short span bars (main reinforcement)
  const bottomShortBarsArr = generateBars(shortM, bottomShort.spacing, longM, bottomY, true);
  
  // Bottom long span bars (distribution or main for two-way)
  const bottomLongBarsArr = slabType === 'Two-Way Slab' 
    ? generateBars(longM, bottomLong.spacing, shortM, bottomY - bottomShort.diameter * scale, false)
    : generateBars(longM, 300, shortM, bottomY - bottomShort.diameter * scale, false);

  // Top bars if continuous
  const topShortBarsArr = topShortBars 
    ? generateBars(shortM, topShort.spacing, longM, topY, true) 
    : [];
  const topLongBarsArr = topLongBars 
    ? generateBars(longM, topLong.spacing, shortM, topY - topShort.diameter * scale, false) 
    : [];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Concrete slab (transparent) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[shortM, thickM, longM]} />
        <meshStandardMaterial 
          color="#9E9E9E" 
          transparent 
          opacity={0.25} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[shortM, thickM, longM]} />
        <meshBasicMaterial color="#424242" wireframe />
      </mesh>

      {/* Bottom short span bars (red - main) */}
      {bottomShortBarsArr.map((bar, i) => (
        <SlabBar
          key={`bottom-short-${i}`}
          start={bar.start}
          end={bar.end}
          diameter={bottomShort.diameter}
          color="#E53935"
        />
      ))}

      {/* Bottom long span bars (blue - distribution/secondary) */}
      {bottomLongBarsArr.map((bar, i) => (
        <SlabBar
          key={`bottom-long-${i}`}
          start={bar.start}
          end={bar.end}
          diameter={bottomLong.diameter}
          color="#1E88E5"
        />
      ))}

      {/* Top short span bars (orange) */}
      {topShortBarsArr.map((bar, i) => (
        <SlabBar
          key={`top-short-${i}`}
          start={bar.start}
          end={bar.end}
          diameter={topShort.diameter}
          color="#FB8C00"
        />
      ))}

      {/* Top long span bars (yellow) */}
      {topLongBarsArr.map((bar, i) => (
        <SlabBar
          key={`top-long-${i}`}
          start={bar.start}
          end={bar.end}
          diameter={topLong.diameter}
          color="#FFC107"
        />
      ))}
    </group>
  );
};

export const Slab3D: React.FC<Slab3DProps> = (props) => {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">3D Slab Reinforcement ({props.slabType})</h4>
      <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas>
          <PerspectiveCamera makeDefault position={[3, 2, 3]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <SlabScene {...props} />
        </Canvas>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Short Span (Bot)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Long Span (Bot)</span>
        </div>
        {props.topShortBars && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Short Span (Top)</span>
          </div>
        )}
        {props.topLongBars && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Long Span (Top)</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Drag to rotate • Scroll to zoom
      </p>
    </div>
  );
};
