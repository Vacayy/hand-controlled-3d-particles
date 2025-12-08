import React, { useRef, useState, useCallback } from 'react';
import ParticleScene from './components/ParticleScene';
import WebcamHandler from './components/WebcamHandler';
import Controls from './components/Controls';
import { HandMetrics, ShapeType } from './types';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

const App: React.FC = () => {
  const [currentShape, setCurrentShape] = useState<ShapeType>(ShapeType.HEART);
  const [currentColor, setCurrentColor] = useState<string>('#ff0055');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [cameraError, setCameraError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0); 

  const handDataRef = useRef<HandMetrics[]>([]);

  const handleHandsUpdate = useCallback((metrics: HandMetrics[]) => {
    handDataRef.current = metrics;
    if (metrics.length > 0 && !handDetected) setHandDetected(true);
    if (metrics.length === 0 && handDetected) setHandDetected(false);
  }, [handDetected]);

  const handleCameraReady = () => {
    setIsCameraReady(true);
    setCameraError(null);
  };

  const handleCameraError = (error: Error) => {
    console.error("Camera Error in App:", error);
    setCameraError(error);
    setIsCameraReady(false);
  };

  const handleRetry = () => {
    setCameraError(null);
    setIsCameraReady(false);
    setRetryKey(prev => prev + 1);
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      
      {/* 3D Scene */}
      <ParticleScene 
        handData={handDataRef} 
        shapeType={currentShape} 
        color={currentColor} 
      />

      {/* Vision Logic */}
      {/* key changes on retry to force full remount */}
      {!cameraError && (
        <WebcamHandler 
          key={retryKey}
          onHandsUpdate={handleHandsUpdate} 
          onCameraReady={handleCameraReady}
          onCameraError={handleCameraError}
        />
      )}

      {/* UI Overlay */}
      <Controls 
        currentShape={currentShape}
        onShapeChange={setCurrentShape}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        handDetected={handDetected}
      />

      {/* Error UI */}
      {cameraError && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30 text-red-500 animate-pulse">
             <AlertTriangle size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Vision Engine Error</h2>
          <p className="text-gray-400 max-w-md mb-8 leading-relaxed text-sm">
            {cameraError.message || "Failed to initialize camera or AI model."}
          </p>
          <button 
            onClick={handleRetry}
            className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-200 hover:scale-105 transition-all shadow-lg active:scale-95"
          >
            <RefreshCcw size={20} />
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading State */}
      {!isCameraReady && !cameraError && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-t-transparent border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-spin-reverse"></div>
          </div>
          <p className="font-mono text-sm tracking-[0.2em] text-gray-400 animate-pulse">INITIALIZING VISION ENGINE...</p>
          <p className="mt-4 text-xs text-gray-600 max-w-xs text-center">
            This may take a moment to download AI models.<br/>Please allow camera access.
          </p>
        </div>
      )}
    </div>
  );
};

export default App;