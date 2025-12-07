import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export class VisionService {
  private static handLandmarker: HandLandmarker | null = null;

  static async initialize() {
    if (this.handLandmarker) return this.handLandmarker;

    try {
      // Use the specific version that matches package.json/importmap to avoid version mismatch errors
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        // Switch to IMAGE mode for more robust frame handling without timestamp sync issues
        runningMode: "IMAGE", 
        numHands: 2,
        minHandDetectionConfidence: 0.3, // Lowered for better detection
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3
      });

      return this.handLandmarker;
    } catch (error) {
      console.error("Failed to initialize Vision Service:", error);
      throw error;
    }
  }

  static getLandmarker() {
    return this.handLandmarker;
  }
}