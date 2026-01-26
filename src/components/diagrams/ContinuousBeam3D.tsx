import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface SpanInfo {
  spanIndex: number;
  length: number;
  topSteel?: string;
  bottomSteel?: string;
  links?: string;
}

interface ContinuousBeam3DProps {
  spans: SpanInfo[];
  width: number;
  depth: number;
  cover: number;
}

// Parse bar string
const parseBarString = (barStr?: string): { count: number; diameter: number } => {
  if (!barStr) return { count: 2, diameter: 16 };
  const match = barStr.match(/(\d+)T(\d+)/);
  if (match) {
    return { count: parseInt(match[1]), diameter: parseInt(match[2]) };
  }
  return { count: 2, diameter: 16 };
};

// Parse link string
const parseLinkString = (linkStr?: string): { diameter: number; spacing: number } => {
  if (!linkStr) return { diameter: 10, spacing: 200 };
  const match = linkStr.match(/T(\d+)@(\d+)/);
  if (match) {
    return { diameter: parseInt(match[1]), spacing: parseInt(match[2]) };
  }
  return { diameter: 10, spacing: 200 };
};

// Support component
const Support: React.FC<{
  position: [number, number, number];
  height: number;
}> = ({ position, height }) => {
  const scale = 0.001;
  return (
    <group position={position}>
      {/* Triangle support */}
      <mesh rotation={[0, 0, 0]}>
        <coneGeometry args={[0.05, height * scale * 0.3, 3]} />
        <meshStandardMaterial color="#616161" />
      </mesh>
      {/* Base */}
      <mesh position={[0, -height * scale * 0.18, 0]}>
        <boxGeometry args={[0.1, 0.02, 0.1]} />
        <meshStandardMaterial color="#424242" />
      </mesh>
    </group>
  );
};

// Reinforcement bar
const ContinuousBar: React.FC<{
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

// Stirrup
const ContinuousStirrup: React.FC<{
  position: [number, number, number];
  width: number;
  height: number;
  diameter: number;
  cover: number;
}> = ({ position, width, height, diameter, cover }) => {
  const scale = 0.001;
  const w = (width - 2 * cover) * scale / 2;
  const h = (height - 2 * cover) * scale / 2;
  
  const points = useMemo(() => [
    new THREE.Vector3(0, -h, -w),
    new THREE.Vector3(0, h, -w),
    new THREE.Vector3(0, h, w),
    new THREE.Vector3(0, -h, w),
    new THREE.Vector3(0, -h, -w),
  ], [w, h]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0), [points]);

  return (
    <mesh position={position}>
      <tubeGeometry args={[curve, 32, diameter * scale / 2, 8, false]} />
      <meshStandardMaterial color="#4CAF50" metalness={0.7} roughness={0.3} />
    </mesh>
  );
};

// Main scene
const ContinuousBeamScene: React.FC<ContinuousBeam3DProps> = ({
  spans,
  width,
  depth,
  cover,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 0.001;
  
  const totalLength = spans.reduce((sum, span) => sum + span.length, 0);
  
  // Calculate support positions
  const supportPositions = useMemo(() => {
    const positions: number[] = [-totalLength / 2];
    let currentX = -totalLength / 2;
    spans.forEach(span => {
      currentX += span.length;
      positions.push(currentX);
    });
    return positions;
  }, [spans, totalLength]);

  // Generate reinforcement for each span
  const spanReinforcement = useMemo(() => {
    const bars: { start: [number, number, number]; end: [number, number, number]; color: string; diameter: number }[] = [];
    const stirrups: { position: [number, number, number]; linkInfo: { diameter: number; spacing: number } }[] = [];
    
    let currentX = -totalLength / 2;
    
    spans.forEach((span, spanIdx) => {
      const spanStart = currentX;
      const spanEnd = currentX + span.length;
      const spanMid = (spanStart + spanEnd) / 2;
      
      const topBar = parseBarString(span.topSteel);
      const bottomBar = parseBarString(span.bottomSteel);
      const linkInfo = parseLinkString(span.links);
      
      const topY = (depth / 2 - cover - linkInfo.diameter - topBar.diameter / 2) * scale;
      const bottomY = -(depth / 2 - cover - linkInfo.diameter - bottomBar.diameter / 2) * scale;
      
      // Bottom bars (full span)
      const bottomSpacing = (width - 2 * cover - 2 * linkInfo.diameter) / (bottomBar.count - 1 || 1);
      for (let i = 0; i < bottomBar.count; i++) {
        const z = (-width / 2 + cover + linkInfo.diameter + i * bottomSpacing) * scale;
        bars.push({
          start: [spanStart, bottomY, z],
          end: [spanEnd, bottomY, z],
          color: '#E53935',
          diameter: bottomBar.diameter,
        });
      }
      
      // Top bars (extend over supports)
      const topSpacing = (width - 2 * cover - 2 * linkInfo.diameter) / (topBar.count - 1 || 1);
      const curtailLength = span.length * 0.25; // 25% curtailment
      
      for (let i = 0; i < topBar.count; i++) {
        const z = (-width / 2 + cover + linkInfo.diameter + i * topSpacing) * scale;
        // Left support region
        bars.push({
          start: [spanStart - curtailLength * 0.5, topY, z],
          end: [spanStart + curtailLength, topY, z],
          color: '#FFC107',
          diameter: topBar.diameter,
        });
        // Right support region
        bars.push({
          start: [spanEnd - curtailLength, topY, z],
          end: [spanEnd + curtailLength * 0.5, topY, z],
          color: '#FFC107',
          diameter: topBar.diameter,
        });
      }
      
      // Stirrups
      const numStirups = Math.floor((span.length * 1000) / linkInfo.spacing);
      for (let i = 0; i <= numStirups; i++) {
        const x = spanStart + (i * linkInfo.spacing * scale);
        stirrups.push({
          position: [x, 0, 0],
          linkInfo,
        });
      }
      
      currentX = spanEnd;
    });
    
    return { bars, stirrups };
  }, [spans, totalLength, width, depth, cover]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Concrete beam */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[totalLength, depth * scale, width * scale]} />
        <meshStandardMaterial color="#9E9E9E" transparent opacity={0.25} />
      </mesh>

      {/* Wireframe */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[totalLength, depth * scale, width * scale]} />
        <meshBasicMaterial color="#424242" wireframe />
      </mesh>

      {/* Supports */}
      {supportPositions.map((x, i) => (
        <Support
          key={`support-${i}`}
          position={[x, -depth * scale / 2 - 0.05, 0]}
          height={depth}
        />
      ))}

      {/* Reinforcement bars */}
      {spanReinforcement.bars.map((bar, i) => (
        <ContinuousBar
          key={`bar-${i}`}
          start={bar.start}
          end={bar.end}
          diameter={bar.diameter}
          color={bar.color}
        />
      ))}

      {/* Stirrups */}
      {spanReinforcement.stirrups.map((stirrup, i) => (
        <ContinuousStirrup
          key={`stirrup-${i}`}
          position={stirrup.position}
          width={width}
          height={depth}
          diameter={stirrup.linkInfo.diameter}
          cover={cover}
        />
      ))}
    </group>
  );
};

export const ContinuousBeam3D: React.FC<ContinuousBeam3DProps> = (props) => {
  const totalLength = props.spans.reduce((sum, span) => sum + span.length, 0);
  const cameraDistance = Math.max(totalLength * 0.8, 3);
  
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">
        3D Continuous Beam ({props.spans.length}-span)
      </h4>
      <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, cameraDistance * 0.4, cameraDistance]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <ContinuousBeamScene {...props} />
        </Canvas>
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Bottom Steel (Tension)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Top Steel (Supports)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Links</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Drag to rotate • Scroll to zoom
      </p>
    </div>
  );
};
