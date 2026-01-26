import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Beam3DProps {
  width: number;
  depth: number;
  length: number;
  cover: number;
  topBars?: string;
  bottomBars?: string;
  links?: string;
  isDoublyReinforced?: boolean;
}

// Parse bar string like "3T16" to get count and diameter
const parseBarString = (barStr: string): { count: number; diameter: number } => {
  const match = barStr.match(/(\d+)T(\d+)/);
  if (match) {
    return { count: parseInt(match[1]), diameter: parseInt(match[2]) };
  }
  return { count: 2, diameter: 16 };
};

// Parse link string like "T10@200"
const parseLinkString = (linkStr: string): { diameter: number; spacing: number } => {
  const match = linkStr.match(/T(\d+)@(\d+)/);
  if (match) {
    return { diameter: parseInt(match[1]), spacing: parseInt(match[2]) };
  }
  return { diameter: 10, spacing: 200 };
};

// Reinforcement bar component
const ReinforcementBar: React.FC<{
  position: [number, number, number];
  length: number;
  diameter: number;
  color: string;
}> = ({ position, length, diameter, color }) => {
  const scale = 0.001; // mm to meters
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[diameter * scale / 2, diameter * scale / 2, length * scale, 16]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

// Link/Stirrup component
const Stirrup: React.FC<{
  position: [number, number, number];
  width: number;
  height: number;
  diameter: number;
}> = ({ position, width, height, diameter }) => {
  const scale = 0.001;
  const points = useMemo(() => {
    const w = (width - 2 * 40) * scale / 2; // Adjust for cover
    const h = (height - 2 * 40) * scale / 2;
    return [
      new THREE.Vector3(-w, -h, 0),
      new THREE.Vector3(-w, h, 0),
      new THREE.Vector3(w, h, 0),
      new THREE.Vector3(w, -h, 0),
      new THREE.Vector3(-w, -h, 0),
    ];
  }, [width, height]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0), [points]);

  return (
    <mesh position={position}>
      <tubeGeometry args={[curve, 32, diameter * scale / 2, 8, false]} />
      <meshStandardMaterial color="#4CAF50" metalness={0.7} roughness={0.3} />
    </mesh>
  );
};

// Main beam scene
const BeamScene: React.FC<Beam3DProps> = ({
  width,
  depth,
  length,
  cover,
  topBars = "2T12",
  bottomBars = "3T16",
  links = "T10@200",
  isDoublyReinforced = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 0.001; // mm to meters
  const lengthM = length; // Already in meters

  // Parse reinforcement
  const topBarInfo = parseBarString(topBars);
  const bottomBarInfo = parseBarString(bottomBars);
  const linkInfo = parseLinkString(links);

  // Calculate bar positions
  const topBarY = (depth / 2 - cover - linkInfo.diameter - topBarInfo.diameter / 2) * scale;
  const bottomBarY = -(depth / 2 - cover - linkInfo.diameter - bottomBarInfo.diameter / 2) * scale;
  
  // Generate bar X positions
  const getBarPositions = (count: number, width: number, cover: number, linkDia: number) => {
    const usableWidth = width - 2 * (cover + linkDia);
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = -usableWidth / 2 + (usableWidth / (count - 1 || 1)) * i;
      positions.push(x * scale);
    }
    return positions;
  };

  const topBarXPositions = getBarPositions(topBarInfo.count, width, cover, linkInfo.diameter);
  const bottomBarXPositions = getBarPositions(bottomBarInfo.count, width, cover, linkInfo.diameter);

  // Generate link positions along length
  const linkPositions = useMemo(() => {
    const positions: number[] = [];
    const numLinks = Math.floor((length * 1000) / linkInfo.spacing);
    for (let i = 0; i <= numLinks; i++) {
      positions.push(-lengthM / 2 + (i * linkInfo.spacing * scale));
    }
    return positions;
  }, [length, linkInfo.spacing, lengthM]);

  // Slow rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Concrete beam (transparent) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width * scale, depth * scale, lengthM]} />
        <meshStandardMaterial 
          color="#9E9E9E" 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width * scale, depth * scale, lengthM]} />
        <meshBasicMaterial color="#424242" wireframe />
      </mesh>

      {/* Bottom reinforcement bars */}
      {bottomBarXPositions.map((x, i) => (
        <ReinforcementBar
          key={`bottom-${i}`}
          position={[x, bottomBarY, 0]}
          length={length * 1000}
          diameter={bottomBarInfo.diameter}
          color="#E53935"
        />
      ))}

      {/* Top reinforcement bars */}
      {topBarXPositions.map((x, i) => (
        <ReinforcementBar
          key={`top-${i}`}
          position={[x, topBarY, 0]}
          length={length * 1000}
          diameter={topBarInfo.diameter}
          color={isDoublyReinforced ? "#FFC107" : "#9E9E9E"}
        />
      ))}

      {/* Stirrups/Links */}
      {linkPositions.map((z, i) => (
        <Stirrup
          key={`link-${i}`}
          position={[0, 0, z]}
          width={width}
          height={depth}
          diameter={linkInfo.diameter}
        />
      ))}
    </group>
  );
};

export const Beam3D: React.FC<Beam3DProps> = (props) => {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">3D Beam Visualization</h4>
      <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0.8, 0.5, 1.5]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            autoRotate={false}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <BeamScene {...props} />
        </Canvas>
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Tension Steel</span>
        </div>
        {props.isDoublyReinforced && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Compression Steel</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Links</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Drag to rotate • Scroll to zoom • Shift+drag to pan
      </p>
    </div>
  );
};
