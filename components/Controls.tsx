import React from 'react';
import { ShapeType } from '../types';
import { Palette, Heart, Flower, Globe, Zap, Hand } from 'lucide-react';

interface ControlsProps {
  currentShape: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  handDetected: boolean;
}

const COLORS = [
  { hex: '#ff0055', name: 'Neon Pink' },
  { hex: '#00ccff', name: 'Cyan' },
  { hex: '#ffcc00', name: 'Gold' },
  { hex: '#cc00ff', name: 'Purple' },
  { hex: '#00ff66', name: 'Lime' },
  { hex: '#ffffff', name: 'White' },
];

const TEMPLATES = [
  { type: ShapeType.HEART, icon: Heart, label: 'Heart' },
  { type: ShapeType.FLOWER, icon: Flower, label: 'Flower' },
  { type: ShapeType.SATURN, icon: Globe, label: 'Saturn' },
  { type: ShapeType.FIREWORKS, icon: Zap, label: 'Burst' },
];

const Controls: React.FC<ControlsProps> = ({
  currentShape,
  onShapeChange,
  currentColor,
  onColorChange,
  handDetected
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6">
      
      {/* Header / Status */}
      <div className="flex justify-between items-start w-full">
        <div>
           <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Flux Particles
          </h1>
          <p className="text-xs text-gray-400 mt-1">Interactive 3D System</p>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border ${handDetected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            <Hand size={16} className={handDetected ? "animate-pulse" : ""} />
            <span className="text-xs font-medium uppercase tracking-wider">
                {handDetected ? 'Hands Detected' : 'No Hands'}
            </span>
        </div>
      </div>

      {/* Main Controls Bottom */}
      <div className="pointer-events-auto flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
        
        {/* Template Switcher */}
        <div className="flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 gap-2 shadow-2xl">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isActive = currentShape === t.type;
            return (
              <button
                key={t.type}
                onClick={() => onShapeChange(t.type)}
                className={`
                  relative flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
              >
                <Icon size={18} />
                <span className="text-sm font-medium hidden sm:block">{t.label}</span>
                {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full mb-1"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Color Picker */}
        <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 gap-3 shadow-2xl">
          <Palette size={18} className="text-gray-400 ml-1" />
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => onColorChange(c.hex)}
                className={`w-6 h-6 rounded-full transition-transform duration-200 border border-white/10 hover:scale-110 focus:outline-none ${currentColor === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''}`}
                style={{ backgroundColor: c.hex, boxShadow: `0 0 10px ${c.hex}40` }}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 right-6 text-right hidden lg:block opacity-60">
        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Gestures</div>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>✋ Open Hand: Expand / Relax</li>
          <li>✊ Closed Fist: Condense / Turbulent</li>
          <li>🤏 Pinch: Precision Scale</li>
          <li>👋 Move: Attract / Repel</li>
        </ul>
      </div>

    </div>
  );
};

export default Controls;
