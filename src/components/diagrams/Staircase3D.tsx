import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Staircase3DProps {
  spanLength: number;
  waistThickness: number;
  riserHeight: number;
  goingLength: number;
  numberOfSteps: number;
  cover: number;
  mainBars: string;
  distributionBars: string;
  width?: number;
}

// Parse bar string
const parseBarSpacing = (barStr: string): { diameter: number; spacing: number } => {
  const match = barStr.match(/T(\d+)\s*@?\s*(\d+)?/);
  if (match) {
    return { 
      diameter: parseInt(match[1]), 
      spacing: match[2] ? parseInt(match[2]) : 200 
    };
  }
  return { diameter: 12, spacing: 150 };
};

// Stair step shape
const StairStep: React.FC<{
  position: [number, number, number];
  riser: number;
  going: number;
  width: number;
}> = ({ position, riser, going, width }) => {
  const scale = 0.001;
  
  return (
    <group position={position}>
      {/* Tread */}
      <mesh position={[0, riser * scale / 2, going * scale / 2]}>
        <boxGeometry args={[width * scale, riser * scale, going * scale]} />
        <meshStandardMaterial color="#9E9E9E" transparent opacity={0.4} />
      </mesh>
    </group>
  );
};

// Reinforcement bar
const StairBar: React.FC<{
  points: THREE.Vector3[];
  diameter: number;
  color: string;
}> = ({ points, diameter, color }) => {
  const scale = 0.001;
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5), [points]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 64, diameter * scale / 2, 8, false]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
    </mesh>
  );
};

// Main staircase scene
const StaircaseScene: React.FC<Staircase3DProps> = ({
  spanLength,
  waistThickness,
  riserHeight,
  goingLength,
  numberOfSteps,
  cover,
  mainBars,
  distributionBars,
  width = 1200,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 0.001;

  const mainBarInfo = parseBarSpacing(mainBars);
  const distBarInfo = parseBarSpacing(distributionBars);

  const totalRise = numberOfSteps * riserHeight;
  const totalGoing = numberOfSteps * goingLength;

  // Generate main reinforcement bars (running along stairs)
  const mainBarPaths = useMemo(() => {
    const paths: THREE.Vector3[][] = [];
    const numBars = Math.floor(width / mainBarInfo.spacing);
    const bottomOffset = (waistThickness - cover - mainBarInfo.diameter / 2) * scale;
    
    for (let i = 0; i <= numBars; i++) {
      const xOffset = -width * scale / 2 + i * mainBarInfo.spacing * scale;
      const points: THREE.Vector3[] = [];
      
      // Start point
      points.push(new THREE.Vector3(xOffset, -bottomOffset, 0));
      
      // Follow stair profile
      for (let step = 0; step <= numberOfSteps; step++) {
        const y = step * riserHeight * scale - bottomOffset;
        const z = step * goingLength * scale;
        points.push(new THREE.Vector3(xOffset, y, z));
      }
      
      paths.push(points);
    }
    return paths;
  }, [width, mainBarInfo.spacing, numberOfSteps, riserHeight, goingLength, waistThickness, cover]);

  // Generate distribution bars (running across stairs)
  const distBarPaths = useMemo(() => {
    const paths: THREE.Vector3[][] = [];
    const totalLength = Math.sqrt(totalRise * totalRise + totalGoing * totalGoing);
    const numBars = Math.floor(totalLength / distBarInfo.spacing);
    const bottomOffset = (waistThickness - cover - mainBarInfo.diameter - distBarInfo.diameter / 2) * scale;
    
    for (let i = 0; i <= numBars; i++) {
      const t = i / numBars;
      const y = t * totalRise * scale - bottomOffset;
      const z = t * totalGoing * scale;
      
      paths.push([
        new THREE.Vector3(-width * scale / 2, y, z),
        new THREE.Vector3(width * scale / 2, y, z),
      ]);
    }
    return paths;
  }, [totalRise, totalGoing, distBarInfo.spacing, width, waistThickness, cover, mainBarInfo.diameter]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.3 - 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[0, -totalRise * scale / 3, -totalGoing * scale / 2]}>
      {/* Stair steps */}
      {Array.from({ length: numberOfSteps }).map((_, i) => (
        <StairStep
          key={`step-${i}`}
          position={[0, i * riserHeight * scale, i * goingLength * scale]}
          riser={riserHeight}
          going={goingLength}
          width={width}
        />
      ))}

      {/* Waist slab (inclined) */}
      <mesh 
        position={[0, totalRise * scale / 2 - waistThickness * scale / 2, totalGoing * scale / 2]}
        rotation={[Math.atan2(totalRise, totalGoing), 0, 0]}
      >
        <boxGeometry args={[
          width * scale, 
          waistThickness * scale, 
          Math.sqrt(totalRise * totalRise + totalGoing * totalGoing) * scale
        ]} />
        <meshStandardMaterial color="#757575" transparent opacity={0.2} />
      </mesh>

      {/* Main bars (red) */}
      {mainBarPaths.map((points, i) => (
        <StairBar
          key={`main-${i}`}
          points={points}
          diameter={mainBarInfo.diameter}
          color="#E53935"
        />
      ))}

      {/* Distribution bars (blue) */}
      {distBarPaths.map((points, i) => (
        <StairBar
          key={`dist-${i}`}
          points={points}
          diameter={distBarInfo.diameter}
          color="#1E88E5"
        />
      ))}
    </group>
  );
};

export const Staircase3D: React.FC<Staircase3DProps> = (props) => {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">3D Staircase Reinforcement</h4>
      <div className="h-[300px] w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas>
          <PerspectiveCamera makeDefault position={[1.5, 1, 2]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <StaircaseScene {...props} />
        </Canvas>
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Main Bars ({props.mainBars})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Dist. Bars ({props.distributionBars})</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Drag to rotate • Scroll to zoom
      </p>
    </div>
  );
};
