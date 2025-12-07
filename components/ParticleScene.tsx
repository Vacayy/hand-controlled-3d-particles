
import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { generateShapePositions } from '../utils/shapes';
import { HandMetrics, ShapeType } from '../types';

// Register standard Three.js elements for R3F to ensure runtime availability
extend(THREE as any);

// Augment JSX namespace to satisfy TypeScript for R3F elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      meshBasicMaterial: any;
      color: any;
      ambientLight: any;
    }
  }
}

interface ParticleSceneProps {
  handData: React.MutableRefObject<HandMetrics[]>;
  shapeType: ShapeType;
  color: string;
}

const PARTICLE_COUNT = 8000;
const DAMPING = 0.1;
const RETURN_SPEED = 0.05;

const Particles: React.FC<{
  handData: React.MutableRefObject<HandMetrics[]>;
  shapeType: ShapeType;
  color: string;
}> = ({ handData, shapeType, color }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  
  // Interaction State
  const transformState = useRef({
    scale: 1.0,
    rotationY: 0,
    prevDist: 0,
    prevDepthDiff: 0,
    isInteracting: false
  });

  // Buffers
  const targetPositions = useMemo(() => generateShapePositions(shapeType, PARTICLE_COUNT), [shapeType]);
  const currentPositions = useMemo(() => new Float32Array(targetPositions), [targetPositions]);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [targetPositions]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const hands = handData.current;
    const ts = transformState.current;
    
    // --- Hand Interaction Logic ---
    // Rule: Need 2 hands, both pinching (< 0.3 means close pinch)
    // 0 is fully closed pinch, 1 is fully open
    const isDoublePinch = hands.length === 2 && 
                          hands[0].pinchDistance < 0.4 && 
                          hands[1].pinchDistance < 0.4;

    if (isDoublePinch) {
      // Sort hands by X to distinguish Left vs Right on screen
      // Screen X: -1 (Left) to 1 (Right)
      const sortedHands = [...hands].sort((a, b) => a.palmPosition.x - b.palmPosition.x);
      const leftHand = sortedHands[0];
      const rightHand = sortedHands[1];

      // 1. Scale Calculation (Distance between hands)
      // 3D Distance for robustness, but 2D X/Y is usually enough
      const dist = Math.hypot(
        leftHand.palmPosition.x - rightHand.palmPosition.x,
        leftHand.palmPosition.y - rightHand.palmPosition.y
      );

      // 2. Rotation Calculation (Steering using Z-depth)
      // Left Hand Depth vs Right Hand Depth
      // Left moves away (lower Z), Right moves close (higher Z) -> Rotate CCW
      const depthDiff = rightHand.palmPosition.z - leftHand.palmPosition.z;

      if (!ts.isInteracting) {
        // Just started interacting, reset deltas
        ts.prevDist = dist;
        ts.prevDepthDiff = depthDiff;
        ts.isInteracting = true;
      } else {
        // Apply Scaling
        const deltaDist = dist - ts.prevDist;
        ts.scale += deltaDist * 2.0; // Sensitivity
        ts.scale = Math.max(0.2, Math.min(ts.scale, 3.0)); // Clamp

        // Apply Rotation
        // If depthDiff increases (Right closer, Left farther) -> Rotate Negative Y
        // Wait, User said: Left Away, Right Close -> Counter Clockwise
        // Standard 3D Y-Axis: CCW is Positive rotation? Depends on coord system.
        // Let's assume standard right-hand rule.
        // Let's map change in depthDiff to rotation.
        const deltaDepth = depthDiff - ts.prevDepthDiff;
        ts.rotationY -= deltaDepth * 1.5; // Sensitivity
        
        // Update previous values
        ts.prevDist = dist;
        ts.prevDepthDiff = depthDiff;
      }
    } else {
      ts.isInteracting = false;
    }

    // --- Particle Physics ---
    // Base breathing animation
    const breathing = 1.0 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    
    // Apply Transform to Mesh
    // We can animate the whole mesh for performance
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, ts.rotationY, 0.1);
    
    // We combine interaction scale with breathing
    const effectiveScale = THREE.MathUtils.lerp(
        meshRef.current.scale.x, 
        ts.scale * breathing, 
        0.1
    );
    meshRef.current.scale.setScalar(effectiveScale);


    // --- Individual Particle Simulation (Keep them alive) ---
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      const tx = targetPositions[idx];
      const ty = targetPositions[idx + 1];
      const tz = targetPositions[idx + 2];

      const cx = currentPositions[idx];
      const cy = currentPositions[idx + 1];
      const cz = currentPositions[idx + 2];

      let vx = velocities[idx];
      let vy = velocities[idx + 1];
      let vz = velocities[idx + 2];

      // Simple Return to shape force
      vx += (tx - cx) * RETURN_SPEED;
      vy += (ty - cy) * RETURN_SPEED;
      vz += (tz - cz) * RETURN_SPEED;

      // Slight turbulence for life
      const noise = 0.01;
      vx += (Math.random() - 0.5) * noise;
      vy += (Math.random() - 0.5) * noise;
      vz += (Math.random() - 0.5) * noise;

      // Damping
      vx *= (1 - DAMPING);
      vy *= (1 - DAMPING);
      vz *= (1 - DAMPING);

      currentPositions[idx] += vx;
      currentPositions[idx + 1] += vy;
      currentPositions[idx + 2] += vz;

      velocities[idx] = vx;
      velocities[idx + 1] = vy;
      velocities[idx + 2] = vz;

      dummy.position.set(
          currentPositions[idx],
          currentPositions[idx + 1],
          currentPositions[idx + 2]
      );
      
      // Scale particles based on Z to fake some depth of field or shininess
      const pScale = Math.max(0.1, 1 - (Math.abs(currentPositions[idx+2]) / 30));
      dummy.scale.setScalar(pScale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    // Smooth Color Transition
    (meshRef.current.material as THREE.MeshBasicMaterial).color.lerp(colorObj, 0.1);
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[0.12, 6, 6]} />
      <meshBasicMaterial 
        toneMapped={false}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};

const ParticleScene: React.FC<ParticleSceneProps> = (props) => {
  return (
    <div className="w-full h-screen absolute top-0 left-0 bg-black">
      <Canvas camera={{ position: [0, 0, 40], fov: 60 }} gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping }}>
        <color attach="background" args={['#050505']} />
        <Particles {...props} />
        {/* We disable OrbitControls autoRotate so user can control rotation */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  );
};

export default ParticleScene;
