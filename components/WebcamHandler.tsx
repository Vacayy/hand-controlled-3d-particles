import React, { useEffect, useRef, useState } from 'react';
import { VisionService } from '../services/visionService';
import { HandMetrics } from '../types';

interface WebcamHandlerProps {
  onHandsUpdate: (metrics: HandMetrics[]) => void;
  onCameraReady: () => void;
  onCameraError?: (error: Error) => void;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 17], [5, 9], [9, 13], [13, 17], // Palm
  [9, 10], [10, 11], [11, 12], // Middle
  [13, 14], [14, 15], [15, 16], // Ring
  [17, 18], [18, 19], [19, 20], // Pinky
];

const WebcamHandler: React.FC<WebcamHandlerProps> = ({ onHandsUpdate, onCameraReady, onCameraError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;

    // Handle Resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const handleError = (error: unknown) => {
      if (!active) return;
      console.error("WebcamHandler Error:", error);
      if (onCameraError) {
        onCameraError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const initializeVision = async (video: HTMLVideoElement) => {
      try {
        await video.play();
        await VisionService.initialize();
        
        if (active) {
          clearTimeout(timeoutId);
          setIsReady(true);
          onCameraReady();
          requestRef.current = requestAnimationFrame(predict);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        handleError(e);
      }
    };

    const startCamera = async () => {
      // Safety timeout: if initialization takes longer than 15s, fail.
      timeoutId = setTimeout(() => {
        handleError(new Error("Initialization timed out. Network might be slow or camera blocked."));
      }, 15000);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Robust start logic: Check readyState OR wait for event
          if (videoRef.current.readyState >= 2) {
             initializeVision(videoRef.current);
          } else {
            videoRef.current.onloadedmetadata = () => {
              if (active && videoRef.current) initializeVision(videoRef.current);
            };
            // Fallback: sometimes onloadedmetadata doesn't fire but oncanplay does
            videoRef.current.oncanplay = () => {
               if (active && videoRef.current && !isReady) initializeVision(videoRef.current);
            }
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        handleError(err);
      }
    };

    startCamera();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
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

  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Connections
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'; 
    ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    
    for (const [start, end] of HAND_CONNECTIONS) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Draw Joints
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (const landmark of landmarks) {
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const predict = () => {
    const landmarker = VisionService.getLandmarker();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && landmarker && video.readyState >= 2 && canvas) {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          const results = landmarker.detect(video);
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          if (results.landmarks && results.landmarks.length > 0) {
            
            // Draw Hands
            if (ctx) {
              results.landmarks.forEach(landmarks => {
                drawHandSkeleton(ctx, landmarks);
              });
            }

            const metrics: HandMetrics[] = results.landmarks.map((landmarks) => {
              const wrist = landmarks[0];
              const middleMCP = landmarks[9];
              const handScale = Math.hypot(
                wrist.x - middleMCP.x,
                wrist.y - middleMCP.y
              );
              
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              const rawPinchDist = Math.hypot(
                thumbTip.x - indexTip.x,
                thumbTip.y - indexTip.y,
                thumbTip.z - indexTip.z 
              );
              
              const relativePinch = rawPinchDist / handScale;
              const normalizedPinch = Math.min(Math.max((relativePinch - 0.2) / 0.8, 0), 1);

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

              const x = (wrist.x - 0.5) * -2; 
              const y = -(wrist.y - 0.5) * 2; 
              
              const estimatedZ = (handScale - 0.15) * 20;

              return {
                isOpen,
                pinchDistance: normalizedPinch,
                palmPosition: { x, y, z: estimatedZ },
                presence: true
              };
            });
            
            onHandsUpdate(metrics);
          } else {
             onHandsUpdate([]);
          }
        } catch (e) {
          console.warn("Prediction error:", e);
        }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <>
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-10 scale-x-[-1]"
      />
      <div className="absolute top-4 left-4 z-50 pointer-events-none opacity-0">
          <video
              ref={videoRef}
              playsInline
              muted
              className="w-32 h-24 rounded-lg object-cover scale-x-[-1]"
          />
      </div>
    </>
  );
};

export default WebcamHandler;