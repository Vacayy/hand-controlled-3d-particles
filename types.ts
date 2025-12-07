export enum ShapeType {
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  FIREWORKS = 'Fireworks',
  SPHERE = 'Sphere'
}

export interface HandMetrics {
  isOpen: boolean; // Is the hand open or closed (fist)
  pinchDistance: number; // Distance between thumb and index (0 to 1)
  palmPosition: { x: number; y: number; z: number };
  presence: boolean; // Is hand detected
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
}
