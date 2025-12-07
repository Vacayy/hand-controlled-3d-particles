import * as THREE from 'three';
import { ShapeType } from '../types';

export const generateShapePositions = (type: ShapeType, count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  const temp = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;
    const idx = i * 3;

    switch (type) {
      case ShapeType.HEART: {
        // Parametric heart equation
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const t = Math.random() * Math.PI * 2;
        const r = Math.random(); // volume filler
        
        // Spread particles inside the volume
        const scale = 0.5 * Math.pow(r, 1/3); 
        
        x = scale * (16 * Math.pow(Math.sin(t), 3));
        y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        z = (Math.random() - 0.5) * 5 * scale; // Thickness
        break;
      }

      case ShapeType.FLOWER: {
        // Polar rose / flower
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        // Petals logic
        const k = 4; // 4 petals
        const r = 10 * Math.sin(k * theta) * Math.sin(phi);
        
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi) * 0.5;
        break;
      }

      case ShapeType.SATURN: {
        // Planet + Rings
        const isRing = Math.random() > 0.4;
        if (isRing) {
          // Ring
          const angle = Math.random() * Math.PI * 2;
          const dist = 12 + Math.random() * 8;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          y = (Math.random() - 0.5) * 0.5;
        } else {
          // Planet body
          const r = 8 * Math.cbrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }
        
        // Tilt Saturn
        temp.set(x, y, z).applyAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), Math.PI / 6);
        x = temp.x; y = temp.y; z = temp.z;
        break;
      }

      case ShapeType.FIREWORKS: {
        // Explosion sphere
        const r = 15 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }

      case ShapeType.SPHERE:
      default: {
        const r = 10 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }
    }

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
  }

  return positions;
};
