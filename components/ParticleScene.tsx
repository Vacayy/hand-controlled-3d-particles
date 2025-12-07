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
  const hoverRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  // Buffers
  const targetPositions = useMemo(() => generateShapePositions(shapeType, PARTICLE_COUNT), [shapeType]);
  
  // Current state of particles
  const currentPositions = useMemo(() => new Float32Array(targetPositions), [targetPositions]);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [targetPositions]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const hands = handData.current;
    
    // Interaction Factors
    let expansionFactor = 1.0;
    let turbulenceFactor = 0.0;
    let attractor: THREE.Vector3 | null = null;
    let repulsor: THREE.Vector3 | null = null;

    if (hands.length > 0) {
      // Logic: 
      // Hand 1 (e.g. Left/Right based on index): Controls Expansion via Pinch
      // Hand 2: Controls Turbulence or acts as Attractor
      
      const hand1 = hands[0];
      const hand2 = hands[1];

      // Map pinch to expansion (Closed = 0.2 scale, Open = 2.5 scale)
      // pinchDistance is 0 (close) to 1 (open)
      expansionFactor = 0.5 + (hand1.pinchDistance * 2.0);

      // If hand is closed (fist), high turbulence/explosion
      if (!hand1.isOpen) {
        turbulenceFactor = 0.2;
      }

      // Hand position as attractor/repulsor
      // Map hand X/Y (-1 to 1) to World Space (approx -20 to 20)
      if (hand1.presence) {
          attractor = new THREE.Vector3(hand1.palmPosition.x * 15, hand1.palmPosition.y * 10, 0);
      }
      
      if (hand2?.presence) {
          // Second hand acts as a repulsor if present
          repulsor = new THREE.Vector3(hand2.palmPosition.x * 15, hand2.palmPosition.y * 10, 0);
      }
    } else {
        // Idle animation breathing
        expansionFactor = 1.0 + Math.sin(state.clock.elapsedTime) * 0.1;
    }

    // Update Particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      const tx = targetPositions[idx] * expansionFactor;
      const ty = targetPositions[idx + 1] * expansionFactor;
      const tz = targetPositions[idx + 2] * expansionFactor;

      const cx = currentPositions[idx];
      const cy = currentPositions[idx + 1];
      const cz = currentPositions[idx + 2];

      let vx = velocities[idx];
      let vy = velocities[idx + 1];
      let vz = velocities[idx + 2];

      // 1. Force towards target shape
      vx += (tx - cx) * RETURN_SPEED;
      vy += (ty - cy) * RETURN_SPEED;
      vz += (tz - cz) * RETURN_SPEED;

      // 2. Attractor (Hand)
      if (attractor) {
          const dx = attractor.x - cx;
          const dy = attractor.y - cy;
          const dz = attractor.z - cz;
          const distSq = dx*dx + dy*dy + dz*dz + 0.1;
          const f = 100 / distSq; // Attraction force
          vx += dx * f * 0.001;
          vy += dy * f * 0.001;
          vz += dz * f * 0.001;
      }

      // 3. Repulsor (Second Hand)
      if (repulsor) {
          const dx = repulsor.x - cx;
          const dy = repulsor.y - cy;
          const dz = repulsor.z - cz;
          const distSq = dx*dx + dy*dy + dz*dz + 0.1;
          if (distSq < 100) {
              const f = -200 / distSq;
              vx += dx * f * 0.01;
              vy += dy * f * 0.01;
              vz += dz * f * 0.01;
          }
      }

      // 4. Turbulence
      if (turbulenceFactor > 0) {
          vx += (Math.random() - 0.5) * turbulenceFactor;
          vy += (Math.random() - 0.5) * turbulenceFactor;
          vz += (Math.random() - 0.5) * turbulenceFactor;
      }

      // Damping
      vx *= (1 - DAMPING);
      vy *= (1 - DAMPING);
      vz *= (1 - DAMPING);

      // Apply
      currentPositions[idx] += vx;
      currentPositions[idx + 1] += vy;
      currentPositions[idx + 2] += vz;

      velocities[idx] = vx;
      velocities[idx + 1] = vy;
      velocities[idx + 2] = vz;

      // Update Instance
      dummy.position.set(
          currentPositions[idx],
          currentPositions[idx + 1],
          currentPositions[idx + 2]
      );
      
      // Scale particle based on distance from center for depth effect
      const scale = Math.max(0.1, 1 - (Math.abs(currentPositions[idx+2]) / 50));
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    // Update colors smoothly if prop changes
    (meshRef.current.material as THREE.MeshBasicMaterial).color.lerp(colorObj, 0.1);

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[0.15, 6, 6]} />
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
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  );
};

export default ParticleScene;