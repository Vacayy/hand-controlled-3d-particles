import React, { useRef, useState, useCallback } from 'react';
import ParticleScene from './components/ParticleScene';
import WebcamHandler from './components/WebcamHandler';
import Controls from './components/Controls';
import { HandMetrics, ShapeType } from './types';

const App: React.FC = () => {
  const [currentShape, setCurrentShape] = useState<ShapeType>(ShapeType.HEART);
  const [currentColor, setCurrentColor] = useState<string>('#ff0055');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  
  // We use a ref for high-frequency hand updates to avoid React render loop overhead
  // This ref is read directly inside the Three.js useFrame loop
  const handDataRef = useRef<HandMetrics[]>([]);

  const handleHandsUpdate = useCallback((metrics: HandMetrics[]) => {
    handDataRef.current = metrics;
    // Debounced state update for UI only
    if (metrics.length > 0 && !handDetected) setHandDetected(true);
    if (metrics.length === 0 && handDetected) setHandDetected(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handDetected]); // Minimal dependencies

  const handleCameraReady = () => setIsCameraReady(true);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      
      {/* 3D Scene */}
      <ParticleScene 
        handData={handDataRef} 
        shapeType={currentShape} 
        color={currentColor} 
      />

      {/* Vision Logic (Invisible mostly) */}
      <WebcamHandler 
        onHandsUpdate={handleHandsUpdate} 
        onCameraReady={handleCameraReady}
      />

      {/* UI Overlay */}
      <Controls 
        currentShape={currentShape}
        onShapeChange={setCurrentShape}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        handDetected={handDetected}
      />

      {/* Loading State */}
      {!isCameraReady && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-sm tracking-widest text-gray-400">INITIALIZING VISION ENGINE...</p>
        </div>
      )}
    </div>
  );
};

export default App;
