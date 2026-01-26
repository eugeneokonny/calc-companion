import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Column3DProps {
  width: number;
  depth: number;
  height?: number;
  cover: number;
  mainBars: string;
  links: string;
}

// Parse bar string like "4T20" to get count and diameter
const parseBarString = (barStr: string): { count: number; diameter: number } => {
  const match = barStr.match(/(\d+)T(\d+)/);
  if (match) {
    return { count: parseInt(match[1]), diameter: parseInt(match[2]) };
  }
  return { count: 4, diameter: 20 };
};

// Parse link string like "T8@200"
const parseLinkString = (linkStr: string): { diameter: number; spacing: number } => {
  const match = linkStr.match(/T(\d+)@(\d+)/);
  if (match) {
    return { diameter: parseInt(match[1]), spacing: parseInt(match[2]) };
  }
  return { diameter: 8, spacing: 200 };
};

// Reinforcement bar component (vertical)
const VerticalBar: React.FC<{
  position: [number, number, number];
  height: number;
  diameter: number;
  color: string;
}> = ({ position, height, diameter, color }) => {
  const scale = 0.001;
  return (
    <mesh position={position}>
      <cylinderGeometry args={[diameter * scale / 2, diameter * scale / 2, height * scale, 16]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

// Link component (horizontal rectangle)
const ColumnLink: React.FC<{
  position: [number, number, number];
  width: number;
  depth: number;
  diameter: number;
  cover: number;
}> = ({ position, width, depth, diameter, cover }) => {
  const scale = 0.001;
  const w = (width - 2 * cover) * scale / 2;
  const d = (depth - 2 * cover) * scale / 2;
  
  const points = useMemo(() => [
    new THREE.Vector3(-w, 0, -d),
    new THREE.Vector3(-w, 0, d),
    new THREE.Vector3(w, 0, d),
    new THREE.Vector3(w, 0, -d),
    new THREE.Vector3(-w, 0, -d),
  ], [w, d]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0), [points]);

  return (
    <mesh position={position}>
      <tubeGeometry args={[curve, 32, diameter * scale / 2, 8, false]} />
      <meshStandardMaterial color="#4CAF50" metalness={0.7} roughness={0.3} />
    </mesh>
  );
};

// Main column scene
const ColumnScene: React.FC<Column3DProps> = ({
  width,
  depth,
  height = 3000,
  cover,
  mainBars,
  links,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 0.001;
  const heightM = height * scale;

  const barInfo = parseBarString(mainBars);
  const linkInfo = parseLinkString(links);

  // Calculate corner bar positions for rectangular column
  const getBarPositions = (count: number, w: number, d: number, c: number) => {
    const positions: [number, number][] = [];
    const innerW = (w - 2 * c) * scale / 2;
    const innerD = (d - 2 * c) * scale / 2;
    
    if (count === 4) {
      // 4 corner bars
      positions.push([-innerW, -innerD], [-innerW, innerD], [innerW, innerD], [innerW, -innerD]);
    } else if (count === 6) {
      // 6 bars - 2 on each long side, 1 on each short
      positions.push([-innerW, -innerD], [-innerW, 0], [-innerW, innerD]);
      positions.push([innerW, -innerD], [innerW, 0], [innerW, innerD]);
    } else if (count === 8) {
      // 8 bars - 3 on each long side
      positions.push([-innerW, -innerD], [-innerW, 0], [-innerW, innerD]);
      positions.push([innerW, -innerD], [innerW, 0], [innerW, innerD]);
      positions.push([0, -innerD], [0, innerD]);
    } else {
      // Distribute evenly around perimeter
      const perimeter = 2 * (w + d);
      for (let i = 0; i < count; i++) {
        const dist = (i / count) * perimeter;
        let x, z;
        if (dist < w) {
          x = -innerW + (dist / w) * 2 * innerW;
          z = -innerD;
        } else if (dist < w + d) {
          x = innerW;
          z = -innerD + ((dist - w) / d) * 2 * innerD;
        } else if (dist < 2 * w + d) {
          x = innerW - ((dist - w - d) / w) * 2 * innerW;
          z = innerD;
        } else {
          x = -innerW;
          z = innerD - ((dist - 2 * w - d) / d) * 2 * innerD;
        }
        positions.push([x, z]);
      }
    }
    return positions;
  };

  const barPositions = getBarPositions(barInfo.count, width, depth, cover);

  // Generate link positions along height
  const linkPositions = useMemo(() => {
    const positions: number[] = [];
    const numLinks = Math.floor(height / linkInfo.spacing);
    for (let i = 0; i <= numLinks; i++) {
      positions.push(-heightM / 2 + (i * linkInfo.spacing * scale));
    }
    return positions;
  }, [height, linkInfo.spacing, heightM]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Concrete column (transparent) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width * scale, heightM, depth * scale]} />
        <meshStandardMaterial 
          color="#9E9E9E" 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width * scale, heightM, depth * scale]} />
        <meshBasicMaterial color="#424242" wireframe />
      </mesh>

      {/* Vertical reinforcement bars */}
      {barPositions.map((pos, i) => (
        <VerticalBar
          key={`bar-${i}`}
          position={[pos[0], 0, pos[1]]}
          height={height}
          diameter={barInfo.diameter}
          color="#E53935"
        />
      ))}

      {/* Horizontal links */}
      {linkPositions.map((y, i) => (
        <ColumnLink
          key={`link-${i}`}
          position={[0, y, 0]}
          width={width}
          depth={depth}
          diameter={linkInfo.diameter}
          cover={cover}
        />
      ))}
    </group>
  );
};

export const Column3D: React.FC<Column3DProps> = (props) => {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">3D Column Visualization</h4>
      <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas>
          <PerspectiveCamera makeDefault position={[1, 0.8, 1]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <ColumnScene {...props} />
        </Canvas>
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Main Bars ({props.mainBars})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Links ({props.links})</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Drag to rotate • Scroll to zoom
      </p>
    </div>
  );
};
