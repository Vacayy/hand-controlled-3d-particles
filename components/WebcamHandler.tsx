import React, { useEffect, useRef, useState } from 'react';
import { VisionService } from '../services/visionService';
import { HandMetrics } from '../types';

interface WebcamHandlerProps {
  onHandsUpdate: (metrics: HandMetrics[]) => void;
  onCameraReady: () => void;
}

const WebcamHandler: React.FC<WebcamHandlerProps> = ({ onHandsUpdate, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          }
        });

        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          
          // Wait for metadata to load to ensure dimensions are known
          videoRef.current.onloadedmetadata = async () => {
            if (!active || !videoRef.current) return;
            try {
              await videoRef.current.play();
              // Initialize vision service after video starts
              await VisionService.initialize();
              
              if (active) {
                setIsReady(true);
                onCameraReady();
                // Start loop
                requestRef.current = requestAnimationFrame(predict);
              }
            } catch (e) {
              console.error("Initialization error:", e);
            }
          };
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predict = () => {
    const landmarker = VisionService.getLandmarker();
    
    if (videoRef.current && landmarker && videoRef.current.readyState >= 2) {
      // Ensure video has dimensions
      if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        try {
          // Use detect() for IMAGE mode - simpler and more robust than detectForVideo
          const results = landmarker.detect(videoRef.current);

          if (results.landmarks) {
            const metrics: HandMetrics[] = results.landmarks.map((landmarks) => {
              // Calculate Reference Hand Scale (Wrist 0 to Middle Finger MCP 9)
              const wrist = landmarks[0];
              const middleMCP = landmarks[9];
              const handScale = Math.hypot(
                wrist.x - middleMCP.x,
                wrist.y - middleMCP.y,
                wrist.z - middleMCP.z
              );
              
              // 1. Calculate Pinch (Thumb Tip 4 to Index Tip 8)
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              const rawPinchDist = Math.hypot(
                thumbTip.x - indexTip.x,
                thumbTip.y - indexTip.y,
                thumbTip.z - indexTip.z
              );
              
              // Normalize pinch based on hand scale
              const relativePinch = rawPinchDist / handScale;
              const normalizedPinch = Math.min(Math.max((relativePinch - 0.2) / 1.0, 0), 1);

              // 2. Calculate "Openness" 
              const tips = [4, 8, 12, 16, 20];
              let totalTipDist = 0;
              tips.forEach(idx => {
                totalTipDist += Math.hypot(
                    landmarks[idx].x - wrist.x,
                    landmarks[idx].y - wrist.y
                );
              });
              const avgTipDist = totalTipDist / 5;
              const isOpen = avgTipDist > (handScale * 1.2);

              // 3. Position (normalized -1 to 1)
              const x = (wrist.x - 0.5) * -2; 
              const y = -(wrist.y - 0.5) * 2; 

              return {
                isOpen,
                pinchDistance: normalizedPinch,
                palmPosition: { x, y, z: 0 },
                presence: true
              };
            });
            
            onHandsUpdate(metrics);
          }
        } catch (e) {
          console.warn("Prediction error:", e);
        }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
        {/* Hidden processing video */}
        <video
            ref={videoRef}
            playsInline
            muted
            className="w-32 h-24 rounded-lg border-2 border-white/20 object-cover scale-x-[-1]"
        />
        <div className="text-[10px] text-white/50 mt-1 uppercase tracking-widest text-center">
             Input Feed
        </div>
    </div>
  );
};

export default WebcamHandler;