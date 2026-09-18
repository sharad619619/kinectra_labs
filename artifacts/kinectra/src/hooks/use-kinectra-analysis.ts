import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { SessionInputAnalysisType } from "@workspace/api-client-react";

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface KinectraMetrics {
  elbowAngle: number;
  kneeAngle: number;
  shoulderAlignment: number;
  spineTilt: number;
  headStability: number;
  balanceScore: number;
  techniqueScore: number;
  warnings: string[];
  bodyDetected: boolean;
}

export interface KinectraAnalysisResult {
  isModelLoading: boolean;
  modelError: string | null;
  metrics: KinectraMetrics;
  rawLandmarks: any[] | null;
  startAnalysis: (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  stopAnalysis: () => void;
}

const DEFAULT_METRICS: KinectraMetrics = {
  elbowAngle: 0,
  kneeAngle: 0,
  shoulderAlignment: 0,
  spineTilt: 0,
  headStability: 100,
  balanceScore: 100,
  techniqueScore: 100,
  warnings: [],
  bodyDetected: false,
};

function calculateAngle(a: Vector3D, b: Vector3D, c: Vector3D): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  if (mag1 === 0 || mag2 === 0) return 0;
  const clamped = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(clamped) * 180.0) / Math.PI;
}

export function useKinectraAnalysis(
  analysisType: SessionInputAnalysisType,
  dominantHand: string
): KinectraAnalysisResult {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<KinectraMetrics>(DEFAULT_METRICS);
  const [rawLandmarks, setRawLandmarks] = useState<any[] | null>(null);

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const graphDeadRef = useRef(false); // true after an unrecoverable MediaPipe graph error
  // Throttle: track when we last ran inference
  const lastInferenceTimeRef = useRef(0);
  const FPS_INTERVAL = 1000 / 15; // 15 fps

  // Load model once
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
          setIsModelLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setModelError("Failed to load vision model. Check your network connection.");
          setIsModelLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (poseLandmarkerRef.current) {
        try { poseLandmarkerRef.current.close(); } catch (_) {}
        poseLandmarkerRef.current = null;
      }
    };
  }, []); // intentionally empty — model loaded once per mount

  const analyzePose = useCallback(
    (landmarks: any[]) => {
      if (!landmarks || landmarks.length === 0) {
        setMetrics((prev) => ({
          ...prev,
          bodyDetected: false
        }));
        setRawLandmarks(null);
        return;
      }
      const pose = landmarks[0];
      setRawLandmarks(pose);
      const isRight = dominantHand === "right";

      const nose = pose[0];
      const lShoulder = pose[11], rShoulder = pose[12];
      const lElbow = pose[13], rElbow = pose[14];
      const lWrist = pose[15], rWrist = pose[16];
      const lHip = pose[23], rHip = pose[24];
      const lKnee = pose[25], rKnee = pose[26];
      const lAnkle = pose[27], rAnkle = pose[28];

      const shoulder = isRight ? rShoulder : lShoulder;
      const elbow = isRight ? rElbow : lElbow;
      const wrist = isRight ? rWrist : lWrist;
      const hip = isRight ? rHip : lHip;
      const knee = isRight ? rKnee : lKnee;
      const ankle = isRight ? rAnkle : lAnkle;

      const elbowAngle = calculateAngle(shoulder, elbow, wrist);

      const hipVisibility = hip ? (hip.visibility ?? 1.0) : 0;
      const kneeVisibility = knee ? (knee.visibility ?? 1.0) : 0;
      const ankleVisibility = ankle ? (ankle.visibility ?? 1.0) : 0;

      const kneeAngle = (hipVisibility < 0.5 || kneeVisibility < 0.5 || ankleVisibility < 0.5)
        ? -1
        : calculateAngle(hip, knee, ankle);

      const midHip = {
        x: (lHip.x + rHip.x) / 2,
        y: (lHip.y + rHip.y) / 2,
        z: (lHip.z + rHip.z) / 2,
      };
      const midShoulder = {
        x: (lShoulder.x + rShoulder.x) / 2,
        y: (lShoulder.y + rShoulder.y) / 2,
        z: (lShoulder.z + rShoulder.z) / 2,
      };
      const verticalAboveHip = { x: midHip.x, y: midHip.y - 1, z: midHip.z };
      const spineTilt = calculateAngle(verticalAboveHip, midHip, midShoulder);
      const shoulderAlignment = Math.abs(
        calculateAngle(rShoulder, lShoulder, {
          x: rShoulder.x,
          y: lShoulder.y,
          z: lShoulder.z,
        })
      );

      const hipLevel = Math.abs(lHip.y - rHip.y);
      let balanceScore = Math.max(0, Math.min(100, 100 - hipLevel * 500));
      if (analysisType === "bowling") {
        balanceScore = Math.max(0, Math.min(100, 100 - hipLevel * 120));
      }

      const warnings: string[] = [];
      let techniqueScore = 100;

      if (analysisType === "bowling") {
        const isArmOverhead = wrist && shoulder && (wrist.y < shoulder.y); // wrist must be above shoulder for a delivery release
        // Legal extension check (optimal release arm should be almost straight: 165°–180°)
        const elbowScore = isArmOverhead ? Math.max(0, 100 - Math.max(0, 155 - elbowAngle) * 2.5) : 0;
        if (elbowAngle < 140) warnings.push("Illegal elbow flexion (Chucking risk)");
        if (!isArmOverhead) warnings.push("Low arm release angle");

        // Front knee brace check (optimal landing knee should be firm: 135°–165° to allow landing impact absorption)
        const kneeScore = kneeAngle === -1 ? 100 : Math.max(0, 100 - Math.max(0, 135 - kneeAngle) * 2.0);
        if (kneeAngle !== -1 && kneeAngle < 120) warnings.push("Collapsed front landing knee");

        // Spine tilt check (optimal lateral lean for express fast-bowlers reaches up to 30°)
        let spineScore = 100;
        if (spineTilt > 30) {
          spineScore = Math.max(0, 100 - (spineTilt - 30) * 3);
          warnings.push("Excessive lateral spine tilt");
        } else if (spineTilt < 5) {
          spineScore = 90;
        }

        // Shoulder alignment check (fast bowlers require shoulder rotation through the delivery stride; rot deviation should be up to 25° during release)
        const shoulderScore = Math.max(0, 100 - Math.max(0, shoulderAlignment - 25) * 1.5);
        if (shoulderAlignment > 35) warnings.push("Poor shoulder rotation");

        // Adjust weights dynamically if knee is not visible
        if (kneeAngle === -1) {
          techniqueScore =
            balanceScore * 0.25 +
            elbowScore * 0.4 +
            spineScore * 0.25 +
            shoulderScore * 0.1;
        } else {
          techniqueScore =
            balanceScore * 0.2 +
            elbowScore * 0.3 +
            kneeScore * 0.2 +
            spineScore * 0.2 +
            shoulderScore * 0.1;
        }

        // Penalize if lower body is not visible (sitting close to camera)
        if (kneeAngle === -1) {
          techniqueScore = techniqueScore * 0.55;
        }

        // Penalize heavily if arm is not overhead (resting or sitting)
        if (!isArmOverhead) {
          techniqueScore = techniqueScore * 0.15;
        }
      } else if (analysisType === "basketball") {
        // Basketball Shooting
        const isHandActive = wrist && hip && (wrist.y < hip.y - 0.05); // wrist must be above hip waist level to indicate active shot setup/release
        const elbowScore = isHandActive ? Math.max(0, 100 - Math.abs(elbowAngle - 90) * 2.5) : 0;
        if (elbowAngle > 110) warnings.push("Low set-point elbow flexion (Pushing shot)");
        if (elbowAngle < 70) warnings.push("Excessive set-point elbow flexion");

        const kneeScore = kneeAngle === -1 ? 100 : Math.max(0, 100 - Math.max(0, 115 - kneeAngle) * 3 - Math.max(0, kneeAngle - 130) * 2.5);
        if (kneeAngle !== -1 && kneeAngle > 140) warnings.push("Shallow leg drive dip");
        if (kneeAngle !== -1 && kneeAngle < 105) warnings.push("Too deep shooting leg loading");

        const spineScore = Math.max(0, 100 - Math.max(0, spineTilt - 10) * 5);
        if (spineTilt > 12) warnings.push("Lateral spine lean on release (Balance drift)");

        if (kneeAngle === -1) {
          techniqueScore = balanceScore * 0.25 + elbowScore * 0.45 + spineScore * 0.3;
        } else {
          techniqueScore = balanceScore * 0.2 + elbowScore * 0.35 + kneeScore * 0.25 + spineScore * 0.2;
        }

        // Heavy penalty if hand is just resting at side (idle stance)
        if (!isHandActive) {
          techniqueScore = techniqueScore * 0.15;
        }
      } else if (analysisType === "badminton") {
        // Badminton Smash
        const isWristOverhead = wrist && shoulder && (wrist.y < shoulder.y); // wrist must be above shoulder level for overhead reach
        const elbowScore = isWristOverhead ? Math.max(0, 100 - Math.max(0, 155 - elbowAngle) * 3.5) : 0;
        if (!isWristOverhead || elbowAngle < 145) warnings.push("Short overhead reach (Low contact point)");

        const kneeScore = kneeAngle === -1 ? 100 : Math.max(0, 100 - Math.max(0, 120 - kneeAngle) * 3.5 - Math.max(0, kneeAngle - 145) * 2);
        if (kneeAngle !== -1 && kneeAngle < 110) warnings.push("Knee translated past toe (Patellar stress)");
        if (kneeAngle !== -1 && kneeAngle > 155) warnings.push("Stiff shock lunge landing");

        const spineScore = Math.max(0, 100 - Math.abs(spineTilt - 20) * 3.5);
        if (spineTilt < 10) warnings.push("Rigid trunk loading posture");
        if (spineTilt > 30) warnings.push("Excessive lateral lean (Recovery lag)");

        if (kneeAngle === -1) {
          techniqueScore = balanceScore * 0.25 + elbowScore * 0.45 + spineScore * 0.3;
        } else {
          techniqueScore = balanceScore * 0.2 + elbowScore * 0.35 + kneeScore * 0.25 + spineScore * 0.2;
        }

        // Heavy penalty if wrist is below shoulder level (idle stance)
        if (!isWristOverhead) {
          techniqueScore = techniqueScore * 0.15;
        }
      } else {
        // Cricket Batting
        const isHandActive = wrist && hip && (wrist.y < hip.y); // hands/wrist must be above hips to indicate bat lift stance
        const kneeScore = kneeAngle === -1 ? 100 : Math.max(0, 100 - Math.max(0, 135 - kneeAngle) * 3 - Math.max(0, kneeAngle - 155) * 2);
        if (kneeAngle !== -1 && kneeAngle < 125) warnings.push("Front foot delayed / collapsed knee");
        if (kneeAngle !== -1 && kneeAngle > 160) warnings.push("Stiff front-foot landing stride");

        const elbowScore = isHandActive ? Math.max(0, 100 - Math.max(0, 90 - elbowAngle) * 2.5) : 0;
        if (elbowAngle < 85) warnings.push("Low bat lift backswing");
        if (!isHandActive) warnings.push("Low bat position (No active swing)");

        const spineScore = Math.max(0, 100 - Math.max(0, spineTilt - 15) * 4);
        if (spineTilt > 15) warnings.push("Balance unstable (Excessive lean)");

        const shoulderScore = Math.max(0, 100 - Math.max(0, shoulderAlignment - 12) * 3);
        if (shoulderAlignment > 15) warnings.push("Open shoulder position too early");

        if (kneeAngle === -1) {
          techniqueScore = balanceScore * 0.25 + elbowScore * 0.35 + spineScore * 0.25 + shoulderScore * 0.15;
          techniqueScore = techniqueScore * 0.55; // Lower body missing penalty
        } else {
          techniqueScore = balanceScore * 0.2 + elbowScore * 0.3 + kneeScore * 0.2 + spineScore * 0.2 + shoulderScore * 0.1;
        }

        // Heavy penalty if hand is just resting at side (idle stance)
        if (!isHandActive) {
          techniqueScore = techniqueScore * 0.15;
        }
      }

      setMetrics({
        elbowAngle: Math.round(elbowAngle),
        kneeAngle: kneeAngle === -1 ? -1 : Math.round(kneeAngle),
        shoulderAlignment: Math.round(shoulderAlignment),
        spineTilt: Math.round(spineTilt),
        headStability: 95,
        balanceScore: Math.round(balanceScore),
        techniqueScore: Math.max(0, Math.min(100, Math.round(techniqueScore))),
        warnings,
        bodyDetected: true,
      });
    },
    [analysisType, dominantHand]
  );

  const startAnalysis = useCallback(
    (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
      if (!poseLandmarkerRef.current) return;
      if (isRunningRef.current) return; // already running — don't double-start

      isRunningRef.current = true;
      const ctx = canvasElement.getContext("2d");
      if (!ctx) return;
      const drawingUtils = new DrawingUtils(ctx);

      const loop = () => {
        if (!isRunningRef.current) return;

        const now = performance.now();

        // Guard: video must be playing and have real dimensions
        const ready =
          videoElement.readyState >= 2 &&
          videoElement.videoWidth > 0 &&
          videoElement.videoHeight > 0 &&
          !videoElement.paused &&
          (videoElement.srcObject !== null || videoElement.src !== "");

        if (ready) {
          // Sync canvas size to video
          if (
            canvasElement.width !== videoElement.videoWidth ||
            canvasElement.height !== videoElement.videoHeight
          ) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
          }

          // Only infer when frame changed AND throttle to 15 fps
          const frameChanged = videoElement.currentTime !== lastVideoTimeRef.current;
          const throttleOk = now - lastInferenceTimeRef.current >= FPS_INTERVAL;

          if (frameChanged && throttleOk && !graphDeadRef.current) {
            lastVideoTimeRef.current = videoElement.currentTime;
            lastInferenceTimeRef.current = now;

            try {
              const result = poseLandmarkerRef.current!.detectForVideo(
                videoElement,
                now
              );
              ctx.save();
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
              if (result.landmarks && result.landmarks.length > 0) {
                for (const landmark of result.landmarks) {
                  // Custom Volumetric Telemetry Mannequin Drawing
                  const getPt = (idx: number) => {
                    const pt = landmark[idx];
                    return pt ? { x: pt.x * canvasElement.width, y: pt.y * canvasElement.height } : null;
                  };

                  const joints = {
                    lsho: getPt(11),
                    rsho: getPt(12),
                    lelb: getPt(13),
                    relb: getPt(14),
                    lwri: getPt(15),
                    rwri: getPt(16),
                    lhip: getPt(23),
                    rhip: getPt(24),
                    lkne: getPt(25),
                    rkne: getPt(26),
                    lank: getPt(27),
                    rank: getPt(28),
                  };

                  const bones = [
                    [joints.lsho, joints.rsho],
                    [joints.lsho, joints.lelb],
                    [joints.lelb, joints.lwri],
                    [joints.rsho, joints.relb],
                    [joints.relb, joints.rwri],
                    [joints.lsho, joints.lhip],
                    [joints.rsho, joints.rhip],
                    [joints.lhip, joints.rhip],
                    [joints.lhip, joints.lkne],
                    [joints.lkne, joints.lank],
                    [joints.rhip, joints.rkne],
                    [joints.rkne, joints.rank],
                  ];



                  // 1. Torso Chest Plate
                  if (joints.lsho && joints.rsho && joints.rhip && joints.lhip) {
                    ctx.fillStyle = "rgba(34, 197, 94, 0.08)";
                    ctx.beginPath();
                    ctx.moveTo(joints.lsho.x, joints.lsho.y);
                    ctx.lineTo(joints.rsho.x, joints.rsho.y);
                    ctx.lineTo(joints.rhip.x, joints.rhip.y);
                    ctx.lineTo(joints.lhip.x, joints.lhip.y);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                  }

                  // 2. Volumetric Limb Cylinders
                  ctx.lineCap = "round";
                  ctx.strokeStyle = "rgba(34, 197, 94, 0.15)";
                  ctx.lineWidth = 14;
                  for (const [ptA, ptB] of bones) {
                    if (ptA && ptB) {
                      ctx.beginPath();
                      ctx.moveTo(ptA.x, ptA.y);
                      ctx.lineTo(ptB.x, ptB.y);
                      ctx.stroke();
                    }
                  }

                  // 3. Live English Willow Bat tracking
                  if (joints.lwri && joints.rwri && joints.relb) {
                    const midX = (joints.lwri.x + joints.rwri.x) / 2;
                    const midY = (joints.lwri.y + joints.rwri.y) / 2;
                    
                    const armDx = joints.rwri.x - joints.relb.x;
                    const armDy = joints.rwri.y - joints.relb.y;
                    const armLen = Math.hypot(armDx, armDy) || 1;
                    const dx = armDx / armLen;
                    const dy = armDy / armLen;
                    
                    const handleEndX = midX + 15 * dx;
                    const handleEndY = midY + 15 * dy;
                    const bladeEndX = handleEndX + 45 * dx;
                    const bladeEndY = handleEndY + 45 * dy;
                    
                    // Grip
                    ctx.strokeStyle = "#1e293b";
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(midX, midY);
                    ctx.lineTo(handleEndX, handleEndY);
                    ctx.stroke();
                    
                    // Blade
                    ctx.strokeStyle = "#d97706";
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(handleEndX, handleEndY);
                    ctx.lineTo(bladeEndX, bladeEndY);
                    ctx.stroke();
                  }

                  // 4. Core skeleton lines
                  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
                  ctx.lineWidth = 2.5;
                  for (const [ptA, ptB] of bones) {
                    if (ptA && ptB) {
                      ctx.beginPath();
                      ctx.moveTo(ptA.x, ptA.y);
                      ctx.lineTo(ptB.x, ptB.y);
                      ctx.stroke();
                    }
                  }

                  // 5. Joint Node circles
                  ctx.fillStyle = "#22c55e";
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = 1.2;
                  Object.values(joints).forEach((pt) => {
                    if (pt) {
                      ctx.beginPath();
                      ctx.arc(pt.x, pt.y, 4.5, 0, 2 * Math.PI);
                      ctx.fill();
                      ctx.stroke();
                    }
                  });
                }
                analyzePose(result.landmarks);
              }
              ctx.restore();
            } catch (e) {
              // MediaPipe graph entered error state — stop inference,
              // wait for the video to stabilise, then reset so we try again.
              graphDeadRef.current = true;
              lastVideoTimeRef.current = -1;
              // Allow a short recovery window before re-enabling inference
              setTimeout(() => { graphDeadRef.current = false; }, 500);
            }
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    },
    [analyzePose, FPS_INTERVAL]
  );

  const stopAnalysis = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  return { isModelLoading, modelError, metrics, rawLandmarks, startAnalysis, stopAnalysis };
}
