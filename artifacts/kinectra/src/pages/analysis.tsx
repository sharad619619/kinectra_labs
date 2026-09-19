import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  StopCircle,
  Zap,
  BarChart2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Radio,
  Download,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSessionContext } from "@/contexts/SessionContext";
import { useEndSession } from "@workspace/api-client-react";
import { useKinectraAnalysis } from "@/hooks/use-kinectra-analysis";
import { useAuth } from "@/context/auth_context";
import { AgoraService } from "../lib/agora-service";

export default function Analysis() {
  const [, setLocation] = useLocation();
  const { config } = useSessionContext();
  const { toast } = useToast();
  const { user } = useAuth();
  const isGuest = user?.id === "guest";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const cameraInitialisedRef = useRef(false);

  const { isModelLoading, modelError, metrics, rawLandmarks, startAnalysis, stopAnalysis } =
    useKinectraAnalysis(config.analysisType, config.dominantHand);

  // ── Temporal Low-Pass Filtering (EMA) ──
  const [smoothedMetrics, setSmoothedMetrics] = useState({
    elbowAngle: 0,
    kneeAngle: 0,
    spineTilt: 0,
    shoulderAlignment: 0,
    balanceScore: 100,
    techniqueScore: 100,
    warnings: [] as string[],
    bodyDetected: false,
    handSpeed: 0,
    isActionActive: false,
  });

  const [actionStatus, setActionStatus] = useState<"idle" | "moving" | "captured">("idle");

  useEffect(() => {
    if (!isModelLoading) {
      const alpha = 0.35; // smoothing coefficient
      setSmoothedMetrics((prev) => {
        const smoothedElbow = prev.elbowAngle === 0 ? metrics.elbowAngle : Math.round(alpha * metrics.elbowAngle + (1 - alpha) * prev.elbowAngle);
        const smoothedKnee = metrics.kneeAngle === -1
          ? -1
          : prev.kneeAngle <= 0
            ? metrics.kneeAngle
            : Math.round(alpha * metrics.kneeAngle + (1 - alpha) * prev.kneeAngle);
        const smoothedSpine = prev.spineTilt === 0 ? metrics.spineTilt : Math.round(alpha * metrics.spineTilt + (1 - alpha) * prev.spineTilt);
        const smoothedShoulder = prev.shoulderAlignment === 0 ? metrics.shoulderAlignment : Math.round(alpha * metrics.shoulderAlignment + (1 - alpha) * prev.shoulderAlignment);
        const smoothedBalance = Math.round(alpha * metrics.balanceScore + (1 - alpha) * prev.balanceScore);
        const smoothedTechnique = Math.round(alpha * metrics.techniqueScore + (1 - alpha) * prev.techniqueScore);

        return {
          elbowAngle: smoothedElbow,
          kneeAngle: smoothedKnee,
          spineTilt: smoothedSpine,
          shoulderAlignment: smoothedShoulder,
          balanceScore: smoothedBalance,
          techniqueScore: smoothedTechnique,
          warnings: metrics.warnings,
          bodyDetected: metrics.bodyDetected,
          handSpeed: metrics.handSpeed ?? 0,
          isActionActive: metrics.isActionActive ?? false,
        };
      });
    }
  }, [metrics, isModelLoading]);

  const [snapshots, setSnapshots] = useState<{ src: string; label: string; time: string; category: "deviation" | "optimal"; metrics?: any }[]>([]);
  const [previewSnapshot, setPreviewSnapshot] = useState<{ src: string; label: string; time: string; metrics?: any } | null>(null);
  const [showGlowPulse, setShowGlowPulse] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState("Optimal mechanics detected. Stance is stable.");
  const [activeSuggestion, setActiveSuggestion] = useState(() => {
    if (config.analysisType === "bowling") return "Start Bowling Stance";
    if (config.analysisType === "batting") return "Start Batting Stance";
    if (config.analysisType === "basketball") return "Start Shooting Form";
    if (config.analysisType === "badminton") return "Start Overhead Smash";
    return "Start Analysis";
  });
  const [isMuted, setIsMuted] = useState(() => {
    return sessionStorage.getItem("kinectra_coach_muted") === "true";
  });


  useEffect(() => {
    sessionStorage.setItem("kinectra_coach_muted", String(isMuted));
    if (isMuted && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isMuted]);

  const endSessionMutation = useEndSession();
  const [frameCount, setFrameCount] = useState(0);

  // ── Agora Conversational AI Session States ──
  const [agoraConnected, setAgoraConnected] = useState(false);
  const [agoraStatus, setAgoraStatus] = useState("Disconnected");
  const [agoraMuted, setAgoraMuted] = useState(false);
  const [agoraAgentId, setAgoraAgentId] = useState<string | null>(null);
  const [agoraTranscripts, setAgoraTranscripts] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: "System", text: "Coach Aryan live audio feedback is offline. Click Connect below to join voice channel.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const agoraServiceRef = useRef<AgoraService | null>(null);

  const statsRef = useRef({
    frames: 0,
    postureSum: 0,
    alignmentSum: 0,
    stabilitySum: 0,
    efficiencySum: 0,
  });

  const lastCapturedTimeRef = useRef<number>(0);
  const isActionExecutingRef = useRef<boolean>(false);
  const actionMotionHistoryRef = useRef<{
    time: number;
    handSpeed: number;
    domWrist: { x: number; y: number };
    offWrist: { x: number; y: number };
    domShoulder: { x: number; y: number };
    domElbow: { x: number; y: number };
    elbowAngle: number;
    kneeAngle: number;
    spineTilt: number;
  }[]>([]);

  // Blends webcam video feed and pose skeleton canvas onto an offline context
  const captureSnapshot = useCallback((eventLabel: string) => {
    if (canvasRef.current && videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const rawW = video.videoWidth || 640;
        const rawH = video.videoHeight || 480;
        const isMock = !video.videoWidth || video.readyState < 2;
        
        // Normalize resolution to 640px max dimension (ultra-fast, sharp, avoids sessionStorage quota crashes)
        const targetW = 640;
        const targetH = Math.round(640 * (rawH / rawW)) || 360;
        
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        
        const tCtx = tempCanvas.getContext("2d");
        if (tCtx) {
          tCtx.filter = "contrast(1.06) brightness(1.02) saturate(1.04)";
          
          if (isMock) {
            // Draw dark telemetry background for mock/simulated testing
            tCtx.fillStyle = "#090d16";
            tCtx.fillRect(0, 0, targetW, targetH);
            
            tCtx.strokeStyle = "rgba(14, 165, 233, 0.15)";
            tCtx.lineWidth = 1;
            for (let x = 40; x < targetW; x += 40) {
              tCtx.beginPath(); tCtx.moveTo(x, 0); tCtx.lineTo(x, targetH); tCtx.stroke();
            }
            for (let y = 40; y < targetH; y += 40) {
              tCtx.beginPath(); tCtx.moveTo(0, y); tCtx.lineTo(targetW, y); tCtx.stroke();
            }
            
            tCtx.strokeStyle = "#0ea5e9";
            tCtx.lineWidth = 4;
            tCtx.lineCap = "round";
            tCtx.beginPath(); tCtx.arc(targetW / 2, 110, 20, 0, Math.PI * 2); tCtx.stroke();
            tCtx.beginPath(); tCtx.moveTo(targetW / 2, 130); tCtx.lineTo(targetW / 2, 220); tCtx.stroke();
            tCtx.beginPath(); tCtx.moveTo(targetW / 2 - 40, 150); tCtx.lineTo(targetW / 2 + 40, 150); tCtx.stroke();
            tCtx.beginPath(); tCtx.moveTo(targetW / 2 - 25, 220); tCtx.lineTo(targetW / 2 + 25, 220); tCtx.stroke();
          } else {
            const isMirrored = config.analysisMode !== "upload";
            tCtx.save();
            if (isMirrored) {
              tCtx.translate(targetW, 0);
              tCtx.scale(-1, 1);
            }
            tCtx.drawImage(video, 0, 0, targetW, targetH);
            
            if (canvas && canvas.width > 0 && canvas.height > 0) {
              tCtx.drawImage(canvas, 0, 0, targetW, targetH);
            }
            tCtx.restore();
          }
          
          // Draw high-visibility telemetry HUD stamp at the bottom
          tCtx.filter = "none";
          tCtx.fillStyle = "rgba(15, 23, 42, 0.85)";
          tCtx.fillRect(0, targetH - 30, targetW, 30);
          
          tCtx.fillStyle = "#f97316";
          tCtx.font = "bold 11px Inter, sans-serif";
          tCtx.fillText("KINECTRA LABS", 12, targetH - 10);
          
          const displayLabel = eventLabel === "Stance Balance" ? "Stance Check" : eventLabel;
          const kneeStr = smoothedMetrics.kneeAngle > 0 ? `${Math.round(smoothedMetrics.kneeAngle)}°` : "N/A";
          tCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
          tCtx.font = "10px monospace";
          tCtx.fillText(
            `• ${displayLabel} | Elbow: ${Math.round(smoothedMetrics.elbowAngle)}° | Knee: ${kneeStr} | Spine: ${Math.round(smoothedMetrics.spineTilt)}°`,
            115,
            targetH - 10
          );
          
          const dataUrl = tempCanvas.toDataURL("image/webp", 0.8);
          const elapsed = `${Math.floor(frameCount)}s`;
          
          setSnapshots((prev) => {
            const updated = [...prev, { 
              src: dataUrl, 
              label: displayLabel, 
              time: elapsed, 
              category: "optimal" as const,
              metrics: {
                elbowAngle: Math.round(smoothedMetrics.elbowAngle),
                spineTilt: Math.round(smoothedMetrics.spineTilt),
                kneeAngle: Math.round(smoothedMetrics.kneeAngle),
                shoulderAlignment: Math.round(smoothedMetrics.shoulderAlignment)
              }
            }];
            if (config.sessionId) {
              try {
                sessionStorage.setItem(`kinectra_snapshots_${config.sessionId}`, JSON.stringify(updated));
              } catch (quotaError) {
                console.warn("sessionStorage quota exceeded, keeping snapshots in memory:", quotaError);
              }
            }
            return updated;
          });

          // Update Next Suggestion based on current movement phase
          if (config.analysisType === "bowling") {
            if (eventLabel === "Bowling Stance") setActiveSuggestion("Proceed to Setup Load");
            else if (eventLabel === "Setup Load") setActiveSuggestion("Execute Landing Plant");
            else if (eventLabel === "Landing Plant") setActiveSuggestion("Reach Bowling Release");
            else if (eventLabel === "Bowling Release") setActiveSuggestion("Complete Delivery Drive");
            else if (eventLabel === "Delivery Drive") setActiveSuggestion("Start Bowling Stance");
          } else if (config.analysisType === "basketball") {
            if (eventLabel === "Prep Dip") setActiveSuggestion("Proceed to Release Extension");
            else if (eventLabel === "Release Extension") setActiveSuggestion("Hold Follow-Through");
            else if (eventLabel === "Follow-Through") setActiveSuggestion("Start Prep Dip");
          } else if (config.analysisType === "badminton") {
            if (eventLabel === "Preparation Loading") setActiveSuggestion("Execute Impact Contact");
            else if (eventLabel === "Impact Contact") setActiveSuggestion("Recover into Lunge");
            else if (eventLabel === "Recovery Lunge") setActiveSuggestion("Prepare next loading arch");
          } else {
            if (eventLabel === "Stance Setup") setActiveSuggestion("Begin High Backlift");
            else if (eventLabel === "High Backlift") setActiveSuggestion("Execute Front-foot Drive");
            else if (eventLabel === "Front-foot Drive") setActiveSuggestion("Complete Follow-through");
            else if (eventLabel === "Follow-through") setActiveSuggestion("Start Batting Stance");
          }
          
          setShowGlowPulse(true);
          setTimeout(() => setShowGlowPulse(false), 350);

          toast({
            title: `📸 ${displayLabel} Captured`,
            description: `Telemetry snapshot logged at ${elapsed}.`,
          });
        }
      } catch (e) {
        console.error("Failed to capture snapshot frame", e);
      }
    }
  }, [config.sessionId, config.dominantHand, config.analysisMode, frameCount, toast, smoothedMetrics]);

  // Hook to monitor real-time hand movements and trigger snapshot capture ONLY when the user actively performs the athletic action
  useEffect(() => {
    const now = Date.now();
    const isRight = config.dominantHand === "right";

    // Only proceed if athlete body is detected or in demo mode
    if (!metrics.bodyDetected && !isDemoMode) {
      if (actionStatus !== "idle") setActionStatus("idle");
      return;
    }

    // Extract landmarks if available
    let domWrist = { x: 0.5, y: 0.5 };
    let offWrist = { x: 0.5, y: 0.5 };
    let domShoulder = { x: 0.5, y: 0.35 };
    let domElbow = { x: 0.5, y: 0.45 };

    if (rawLandmarks && rawLandmarks.length >= 17) {
      const rw = rawLandmarks[16], lw = rawLandmarks[15];
      const rs = rawLandmarks[12], ls = rawLandmarks[11];
      const re = rawLandmarks[14], le = rawLandmarks[13];
      if (rw && lw) {
        domWrist = isRight ? { x: rw.x, y: rw.y } : { x: lw.x, y: lw.y };
        offWrist = isRight ? { x: lw.x, y: lw.y } : { x: rw.x, y: rw.y };
        domShoulder = (isRight ? rs : ls) || domShoulder;
        domElbow = (isRight ? re : le) || domElbow;
      }
    }

    const currentHandSpeed = metrics.handSpeed ?? (isDemoMode ? (smoothedMetrics.isActionActive ? 0.72 : 0.06) : 0);

    // Record sample in actionMotionHistoryRef
    actionMotionHistoryRef.current.push({
      time: now,
      handSpeed: currentHandSpeed,
      domWrist,
      offWrist,
      domShoulder,
      domElbow,
      elbowAngle: smoothedMetrics.elbowAngle,
      kneeAngle: smoothedMetrics.kneeAngle,
      spineTilt: smoothedMetrics.spineTilt,
    });
    // Keep ~1.0s of motion history
    if (actionMotionHistoryRef.current.length > 15) actionMotionHistoryRef.current.shift();

    const history = actionMotionHistoryRef.current;
    if (history.length < 3) return;

    // Windowed analysis over the recent 250ms - 400ms
    const windowStartIdx = Math.max(0, history.length - 5);
    const pastSample = history[windowStartIdx];
    const currentSample = history[history.length - 1];
    const windowDt = (currentSample.time - pastSample.time) / 1000;

    const domDisplacement = Math.hypot(
      currentSample.domWrist.x - pastSample.domWrist.x,
      currentSample.domWrist.y - pastSample.domWrist.y
    );
    const offDisplacement = Math.hypot(
      currentSample.offWrist.x - pastSample.offWrist.x,
      currentSample.offWrist.y - pastSample.offWrist.y
    );
    const maxDisplacement = Math.max(domDisplacement, offDisplacement);
    const windowVelocity = windowDt > 0.04 ? maxDisplacement / windowDt : 0;

    // ── ACTION GATE: ONLY trigger when user starts performing the action with active hand movement! ──
    // When stationary, resting, or moving slowly, handSpeed < 0.38 and maxDisplacement < 0.035
    const isHandsMovingInAction =
      (currentHandSpeed >= 0.38 && maxDisplacement >= 0.035) ||
      currentHandSpeed >= 0.55 ||
      windowVelocity >= 0.45 ||
      (isDemoMode && currentHandSpeed >= 0.4);

    if (!isHandsMovingInAction) {
      // User is idle / stationary / resting: STRICTLY NO SNAPSHOTS
      if (now - lastCapturedTimeRef.current > 700 && actionStatus !== "idle") {
        setActionStatus("idle");
      }
      isActionExecutingRef.current = false;
      return;
    }

    // Hands are moving in action!
    if (actionStatus !== "moving") {
      setActionStatus("moving");
    }

    // Minimum cooldown between action captures (1.1s)
    if (now - lastCapturedTimeRef.current < 1100) return;

    // Avoid double firing in the same single stroke
    if (isActionExecutingRef.current) return;

    let triggerAction = false;
    let eventLabel = "";

    const type = config.analysisType;

    if (type === "bowling") {
      // 1. Delivery Release Apex: Bowling hand reaches overhead/shoulder level with fast movement
      const isHandHigh = currentSample.domWrist.y < currentSample.domShoulder.y + 0.06;
      if (isHandHigh && (currentHandSpeed >= 0.40 || windowVelocity >= 0.40)) {
        triggerAction = true;
        eventLabel = "Bowling Release";
      }
      // 2. Delivery Drive / Follow-Through: Arm powers down across torso with high velocity
      else if (
        currentSample.domWrist.y > currentSample.domShoulder.y &&
        pastSample.domWrist.y < pastSample.domShoulder.y + 0.10 &&
        (currentHandSpeed >= 0.50 || windowVelocity >= 0.45)
      ) {
        triggerAction = true;
        eventLabel = "Delivery Drive";
      }
      // 3. Dynamic Delivery Swing: Any strong bowling arm rotation/throw
      else if (currentHandSpeed >= 0.65 || windowVelocity >= 0.60) {
        triggerAction = true;
        eventLabel = "Bowling Delivery";
      }
    } else if (type === "basketball") {
      // 1. Release Extension: Shooting hand reaches overhead with speed
      const isHandHigh = currentSample.domWrist.y < currentSample.domShoulder.y;
      if (isHandHigh && (currentHandSpeed >= 0.40 || windowVelocity >= 0.40)) {
        triggerAction = true;
        eventLabel = "Release Extension";
      }
      // 2. High Follow-Through
      else if (isHandHigh && currentSample.elbowAngle >= 140) {
        triggerAction = true;
        eventLabel = "Follow-Through";
      }
      else if (currentHandSpeed >= 0.60) {
        triggerAction = true;
        eventLabel = "Shooting Stroke";
      }
    } else if (type === "badminton") {
      // 1. Smash Impact: Overhead snap
      const isHandHigh = currentSample.domWrist.y < currentSample.domShoulder.y;
      if (isHandHigh && (currentHandSpeed >= 0.42 || windowVelocity >= 0.42)) {
        triggerAction = true;
        eventLabel = "Impact Contact";
      }
      // 2. Follow-through smash stroke
      else if (currentHandSpeed >= 0.55) {
        triggerAction = true;
        eventLabel = "Smash Stroke";
      }
    } else {
      // Cricket Batting:
      // 1. Front-Foot Drive: Hands swing forward/downward through the hitting zone with speed
      const isHandSwinging = currentHandSpeed >= 0.40 || windowVelocity >= 0.38;
      if (isHandSwinging) {
        if (currentSample.domWrist.y > pastSample.domWrist.y || maxDisplacement >= 0.06) {
          triggerAction = true;
          eventLabel = "Front-foot Drive";
        } else {
          triggerAction = true;
          eventLabel = "Batting Stroke";
        }
      }
      // 2. Follow-Through: Finish of the swing
      else if (currentSample.elbowAngle >= 120 && (currentHandSpeed >= 0.38 || windowVelocity >= 0.38)) {
        triggerAction = true;
        eventLabel = "Follow-through";
      }
    }

    if (triggerAction) {
      lastCapturedTimeRef.current = now;
      isActionExecutingRef.current = true;
      setActionStatus("captured");

      captureSnapshot(eventLabel);

      setTimeout(() => {
        setActionStatus("idle");
        isActionExecutingRef.current = false;
      }, 750);
    }
  }, [rawLandmarks, metrics, config.analysisType, config.dominantHand, captureSnapshot, isDemoMode, smoothedMetrics.elbowAngle, smoothedMetrics.kneeAngle, smoothedMetrics.spineTilt, smoothedMetrics.isActionActive, actionStatus]);

  // ── Camera: initialise ONCE ───────────────────────────────────────
  useEffect(() => {
    if (!config.sessionId) {
      setLocation("/setup");
      return;
    }
    
    // Clear old session snapshots from sessionStorage to free up browser quota space
    try {
      const currentKey = `kinectra_snapshots_${config.sessionId}`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("kinectra_snapshots_") && key !== currentKey) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) {
      console.warn("Failed to clean up sessionStorage keys:", e);
    }

    if (cameraInitialisedRef.current) return;
    cameraInitialisedRef.current = true;

    let active = true;
    let stream: MediaStream | null = null;

    if (config.analysisMode === "upload" && config.videoFileUrl) {
      if (videoRef.current) {
        videoRef.current.src = config.videoFileUrl;
        videoRef.current.loop = true;
        videoRef.current.play().catch(() => {});
        setHasCameraPermission(true);
        setCameraError(null);
      }
      return () => {
        active = false;
        stopAnalysis();
        if (videoRef.current) {
          videoRef.current.src = "";
        }
        cameraInitialisedRef.current = false;
      };
    }

    async function setupCamera() {
      try {
        // 1. Attempt ideal high-definition sports analysis feed
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          });
        } catch (hdErr) {
          console.warn("HD video constraints failed, retrying with fallback...", hdErr);
          // 2. Fallback to general video stream if constraints fail
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setHasCameraPermission(true);
          setCameraError(null);
        }
      } catch (err: any) {
        if (active) {
          console.error("Webcam getUserMedia call failed:", err);
          setCameraError(err?.name || "Error");
          setHasCameraPermission(false);
        }
      }
    }

    setupCamera();

    return () => {
      active = false;
      stopAnalysis();
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      cameraInitialisedRef.current = false;
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.analysisMode, config.videoFileUrl]); // intentionally empty — run once on mount

  // ── Start pose detection once camera + model ready ─────────────────
  useEffect(() => {
    if (hasCameraPermission && !isModelLoading && videoRef.current && canvasRef.current) {
      startAnalysis(videoRef.current, canvasRef.current);
    }
  }, [hasCameraPermission, isModelLoading, startAnalysis]);

  // ── Cleanup Agora Voice Session on Unmount ───────────────────────
  useEffect(() => {
    return () => {
      if (agoraServiceRef.current) {
        agoraServiceRef.current.leaveChannel().catch(err => console.warn(err));
      }
    };
  }, []);

  // ── Agora Live Coaching Room Management ──────────────────────────
  const connectAgora = async () => {
    if (!config.sessionId) return;
    try {
      setAgoraStatus("Requesting token...");
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";
      const channelName = `session-${config.sessionId}`;
      
      // 1. Fetch token and App ID from backend
      const tokenRes = await fetch(`${API_BASE_URL}/api/agora/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, uid: 0 })
      });
      if (!tokenRes.ok) throw new Error("Failed to retrieve Agora token");
      const { token, appId } = await tokenRes.json();

      // 2. Initialize client-side Agora service
      const service = new AgoraService(appId, channelName, token, 0);
      agoraServiceRef.current = service;

      service.registerStatusCallback((status) => {
        setAgoraStatus(status);
        if (status.includes("Connected")) {
          setAgoraConnected(true);
        } else if (status === "Disconnected") {
          setAgoraConnected(false);
        }
      });

      // 3. Join the voice channel
      await service.joinChannel();

      // 4. Start backend Agent
      setAgoraStatus("Summoning Coach Aryan...");
      const agentRes = await fetch(`${API_BASE_URL}/api/agora/start-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, sessionId: config.sessionId })
      });
      if (!agentRes.ok) {
        const errorText = await agentRes.text().catch(() => "");
        let errorMsg = "Failed to start conversational coaching agent";
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch {
          if (errorText) {
            errorMsg = `Server Error (${agentRes.status}): ${errorText.substring(0, 80)}`;
          } else {
            errorMsg = `Server returned status code ${agentRes.status}`;
          }
        }
        throw new Error(errorMsg);
      }
      const agentData = await agentRes.json();

      setAgoraAgentId(agentData.agentId);
      
      setAgoraTranscripts((prev) => [
        ...prev,
        {
          sender: "Coach Aryan",
          text: agentData.isFallback 
            ? "Live audio link established (Local Fallback active)." 
            : "Joined voice room! I'm monitoring your action in real-time. Ask me anything!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      
      setAgoraStatus(agentData.isFallback ? "Connected (Local Fallback)" : "Connected (Listening)");
      setAgoraConnected(true);
      
      toast({
        title: "Connected to Coach Aryan",
        description: "Voice-guided biomechanical coaching session is now active."
      });
    } catch (err: any) {
      console.error("Agora connection failed:", err);
      toast({
        variant: "destructive",
        title: "Agora connection failed",
        description: err.message || "Failed to establish voice room connection."
      });
      setAgoraStatus("Disconnected");
      setAgoraConnected(false);
      if (agoraServiceRef.current) {
        await agoraServiceRef.current.leaveChannel();
        agoraServiceRef.current = null;
      }
    }
  };

  const disconnectAgora = async () => {
    if (agoraServiceRef.current) {
      setAgoraStatus("Disconnecting...");
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";
      if (agoraAgentId) {
        fetch(`${API_BASE_URL}/api/agora/stop-agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agoraAgentId })
        }).catch((err) => console.warn("Failed to stop backend agent:", err));
      }
      await agoraServiceRef.current.leaveChannel();
      agoraServiceRef.current = null;
    }
    setAgoraAgentId(null);
    setAgoraConnected(false);
    setAgoraStatus("Disconnected");
    setAgoraTranscripts((prev) => [
      ...prev,
      {
        sender: "System",
        text: "Voice coaching session ended.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const toggleMuteAgora = async () => {
    if (agoraServiceRef.current) {
      const nextMute = !agoraMuted;
      await agoraServiceRef.current.setMute(nextMute);
      setAgoraMuted(nextMute);
    }
  };

  // ── Speech Alerts Engine (Uses Smoothed Telemetry) ────────────────
  const lastSpokenRef = useRef<Record<string, number>>({});
  const audioCacheRef = useRef<Record<string, HTMLAudioElement>>({});
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSpeechText = (text: string) => {
    if (isMuted) return;

    // ── Agora Live Interruption Alert Route ──
    if (agoraConnected && agoraAgentId && !agoraAgentId.startsWith("mock_")) {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";

      // Optimistically push the warning to the UI transcript list
      setAgoraTranscripts((prev) => [
        ...prev,
        {
          sender: "Coach Aryan (Alert)",
          text: text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Call alert injection endpoint to trigger immediate voice interruption
      fetch(`${API_BASE_URL}/api/session/speech/inject-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, agentId: agoraAgentId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === "fallback") {
          console.info("Agora Agent is fallback. Executing local TTS warning.");
          playSpeechTextLocal(text);
        }
      })
      .catch(err => {
        console.warn("Failed to inject Agora alert, falling back to local TTS:", err);
        playSpeechTextLocal(text);
      });
      return;
    }

    // Standard local fallback (also handles offline/mock mode)
    playSpeechTextLocal(text);
  };

  const playSpeechTextLocal = (text: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    setIsSpeaking(true);

    if (audioCacheRef.current[text]) {
      const audio = audioCacheRef.current[text];
      currentAudioRef.current = audio;
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn("Failed to play cached audio:", err);
        setIsSpeaking(false);
      });
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || "";
    const audioUrl = `${API_BASE_URL}/api/session/speech/synthesize?text=${encodeURIComponent(text)}`;
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    audioCacheRef.current[text] = audio;

    audio.play().then(() => {
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
    }).catch((err) => {
      console.warn("Rime speech playing failed, falling back to window.speechSynthesis:", err);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    });
  };

  useEffect(() => {
    if (smoothedMetrics.warnings && smoothedMetrics.warnings.length > 0) {
      const activeWarning = smoothedMetrics.warnings[0];
      const now = Date.now();
      const lastSpokenTime = lastSpokenRef.current[activeWarning] || 0;
      
      if (now - lastSpokenTime >= 6000) {
        let alertText = activeWarning;
        if (activeWarning === "Excessive lateral spine tilt" || activeWarning === "Excessive spine tilt") {
          alertText = "Keep your spine tall and straight. Avoid tilting sideways.";
        } else if (activeWarning === "Illegal elbow flexion (Chucking risk)" || activeWarning === "Elbow angle too low") {
          alertText = "Keep your delivery arm straight. Do not flex your elbow.";
        } else if (activeWarning === "Collapsed front landing knee" || activeWarning === "Front knee bent too much") {
          alertText = "Brace your front leg. Do not collapse your landing knee.";
        } else if (activeWarning === "Poor shoulder rotation") {
          alertText = "Focus on full shoulder rotation through the crease.";
        } else if (activeWarning === "Head moving excessively") {
          alertText = "Keep your head still, watch the ball.";
        } else if (activeWarning === "Balance unstable") {
          alertText = "Focus on balance and plant your landing stride.";
        } else if (activeWarning.includes("Low set-point elbow")) {
          alertText = "Keep your shooting elbow tucked in at a right angle.";
        } else if (activeWarning.includes("Shallow leg drive")) {
          alertText = "Dip your knees deeper to generate vertical propulsion.";
        } else if (activeWarning.includes("Lateral spine lean")) {
          alertText = "Keep your torso vertical on release to avoid balance drift.";
        } else if (activeWarning.includes("Short overhead reach")) {
          alertText = "Extend your hitting arm fully at the highest contact point.";
        } else if (activeWarning.includes("Knee translated past toe")) {
          alertText = "Avoid pushing your knee too far forward. Sit back on the lunge.";
        } else if (activeWarning.includes("Rigid trunk loading")) {
          alertText = "Arch your chest back to load rotational core torque.";
        } else if (activeWarning.includes("Excessive lateral lean")) {
          alertText = "Maintain control to recover defensively after the smash.";
        }
        
        setSpokenText(alertText);
        playSpeechText(alertText);
        lastSpokenRef.current[activeWarning] = now;
      }
    } else {
      // Optimal posture periodic verification comment
      const now = Date.now();
      const lastSpokenTime = lastSpokenRef.current["optimal"] || 0;
      if (now - lastSpokenTime >= 12000 && !isModelLoading && hasCameraPermission) {
        const text = "Optimal mechanics detected. Keep maintaining this posture.";
        setSpokenText(text);
        playSpeechText(text);
        lastSpokenRef.current["optimal"] = now;
      }
    }
  }, [smoothedMetrics.warnings, isModelLoading, hasCameraPermission, isMuted]);

  // Keep a ref of the latest metrics to avoid resetting the interval
  const metricsRef = useRef(smoothedMetrics);
  useEffect(() => {
    metricsRef.current = smoothedMetrics;
  }, [smoothedMetrics]);

  // ── Simulated Telemetry Feed for Mock Mode / Desktop Demos ──
  useEffect(() => {
    if (hasCameraPermission !== false && !isDemoMode) return;

    let step = 0;
    const interval = setInterval(() => {
      setSmoothedMetrics((prev) => {
        step = (step + 1) % 60;
        
        let elbow = 70;
        let knee = 160;
        let spine = 5;
        let shoulder = 5;
        let warnings: string[] = [];

        // Simulate a bowling action cycle over 18 seconds (6 phases of 10 steps * 300ms = 18s)
        if (config.analysisType === "bowling") {
          const phase = Math.floor(step / 10);
          if (phase === 0) { // Stance
            elbow = 60 + Math.sin(step) * 5;
          } else if (phase === 1) { // Load
            elbow = 50 + (step % 10) * 3;
          } else if (phase === 2) { // Plant
            knee = 140 - (step % 10) * 3;
            elbow = 80 + (step % 10) * 5;
          } else if (phase === 3) { // Release
            elbow = 130 + (step % 10) * 4; // reaches > 148 peak
          } else if (phase === 4) { // Drive
            spine = 5 + (step % 10) * 2.5; // reaches > 18 peak
          } else { // Follow through
            elbow = 100 - (step % 10) * 3;
          }
        } else if (config.analysisType === "basketball") {
          const phase = Math.floor(step / 15);
          if (phase === 0) { // Dip Stance
            knee = 150 - (step % 15) * 2.5; // dip knee to ~115
            elbow = 80 + Math.sin(step) * 2;
          } else if (phase === 1) { // Jump/Release
            knee = 115 + (step % 15) * 4; // extend legs
            elbow = 80 + (step % 15) * 6.5; // extend elbow to 177
          } else if (phase === 2) { // Follow-through
            elbow = 175 - (step % 15) * 2;
            spine = 2;
          } else { // Reset
            knee = 160;
            elbow = 80;
          }
        } else if (config.analysisType === "badminton") {
          const phase = Math.floor(step / 15);
          if (phase === 0) { // Preparation Load
            spine = 5 + (step % 15) * 1.2; // arch spine to ~23
            elbow = 80;
          } else if (phase === 1) { // Strike / Impact
            elbow = 80 + (step % 15) * 6; // extend hitting arm to ~170
            spine = 23 - (step % 15) * 1.5;
          } else if (phase === 2) { // Recovery Lunge
            knee = 155 - (step % 15) * 2.5; // deep lunge knee to ~117
          } else { // Reset
            knee = 160;
            elbow = 80;
            spine = 5;
          }
        } else {
          // Simulate a batting stroke cycle
          const phase = Math.floor(step / 10);
          if (phase === 0) { // Setup
            knee = 140 + Math.sin(step) * 2;
            spine = 15;
          } else if (phase === 1) { // Backlift
            elbow = 55 + (step % 10) * 2;
            shoulder = 18;
          } else if (phase === 2) { // Drive
            knee = 140 - (step % 10) * 2.5; // reaches lunge
          } else { // Follow through
            spine = 18 - (step % 10) * 1.5;
          }
        }

        let isDemoAction = false;
        if (config.analysisType === "bowling") {
          const phase = Math.floor(step / 10);
          isDemoAction = phase === 3 || phase === 4;
        } else if (config.analysisType === "basketball" || config.analysisType === "badminton") {
          const phase = Math.floor(step / 15);
          isDemoAction = phase === 1;
        } else {
          const phase = Math.floor(step / 10);
          isDemoAction = phase === 2;
        }

        return {
          elbowAngle: Math.round(elbow),
          kneeAngle: Math.round(knee),
          spineTilt: Math.round(spine),
          shoulderAlignment: Math.round(shoulder),
          balanceScore: 92 + Math.round(Math.random() * 5),
          techniqueScore: 88 + Math.round(Math.random() * 8),
          warnings,
          bodyDetected: true,
          handSpeed: isDemoAction ? 0.72 : 0.06,
          isActionActive: isDemoAction,
        };
      });
    }, 300);

    return () => clearInterval(interval);
  }, [hasCameraPermission, isDemoMode, config.analysisType]);

  // ── Real-time Telemetry Drawing Loop for Demo/Mock Mode ──
  useEffect(() => {
    if (!isDemoMode || !canvasRef.current) return;
    
    let active = true;
    const canvas = canvasRef.current;
    
    function drawFrame() {
      if (!active || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const w = 640;
      const h = 480;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      // 1. Draw backdrop grid
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(249, 115, 22, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 40; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw horizontal target lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.beginPath(); ctx.moveTo(0, h * 0.4); ctx.lineTo(w, h * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * 0.7); ctx.lineTo(w, h * 0.7); ctx.stroke();

      // Get current metrics
      const m = metricsRef.current;

      // 2. Draw stick figure joints based on angles
      const neckX = w / 2;
      const neckY = 160;

      // Shoulder to hip is spine
      const spineLength = 110;
      const spineAngleRad = (m.spineTilt * Math.PI) / 180;
      const hipX = neckX - Math.sin(spineAngleRad) * spineLength;
      const hipY = neckY + Math.cos(spineAngleRad) * spineLength;

      // Shoulder alignment angle
      const shoulderWidth = 45;
      const shAlignRad = (m.shoulderAlignment * Math.PI) / 180;
      const lShX = neckX - Math.cos(shAlignRad) * shoulderWidth;
      const lShY = neckY - Math.sin(shAlignRad) * shoulderWidth;
      const rShX = neckX + Math.cos(shAlignRad) * shoulderWidth;
      const rShY = neckY + Math.sin(shAlignRad) * shoulderWidth;

      // Elbow arm
      const upperArmLength = 55;
      const foreArmLength = 50;
      const elbowAngleRad = (m.elbowAngle * Math.PI) / 180;
      
      const rElbowX = rShX + upperArmLength * 0.8;
      const rElbowY = rShY + upperArmLength * 0.6;
      const rWristX = rElbowX + Math.sin(elbowAngleRad) * foreArmLength;
      const rWristY = rElbowY + Math.cos(elbowAngleRad) * foreArmLength;

      // Hips and knees
      const hipWidth = 28;
      const lHipX = hipX - hipWidth;
      const rHipX = hipX + hipWidth;
      const lHipY = hipY;
      const rHipY = hipY;

      const thighLength = 65;
      const shinLength = 60;
      const kneeAngleRad = m.kneeAngle === -1 ? 0 : (m.kneeAngle * Math.PI) / 180;
      
      const rKneeX = rHipX + Math.sin(kneeAngleRad) * thighLength * 0.3;
      const rKneeY = rHipY + Math.cos(kneeAngleRad) * thighLength * 0.9;
      const rAnkleX = rKneeX + Math.sin(kneeAngleRad) * shinLength * 0.5;
      const rAnkleY = rKneeY + Math.cos(kneeAngleRad) * shinLength * 0.8;

      // Draw head
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(neckX, neckY - 26, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Draw trunk lines
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw spine
      ctx.beginPath();
      ctx.moveTo(neckX, neckY);
      ctx.lineTo(hipX, hipY);
      ctx.stroke();

      // Draw shoulders
      ctx.beginPath();
      ctx.moveTo(lShX, lShY);
      ctx.lineTo(rShX, rShY);
      ctx.stroke();

      // Draw hips
      ctx.beginPath();
      ctx.moveTo(lHipX, lHipY);
      ctx.lineTo(rHipX, rHipY);
      ctx.stroke();

      // Draw arms
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(rShX, rShY);
      ctx.lineTo(rElbowX, rElbowY);
      ctx.lineTo(rWristX, rWristY);
      ctx.stroke();

      // Draw legs
      if (m.kneeAngle !== -1) {
        ctx.strokeStyle = "#a7f3d0";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rHipX, rHipY);
        ctx.lineTo(rKneeX, rKneeY);
        ctx.lineTo(rAnkleX, rAnkleY);
        ctx.stroke();
      }

      // Draw joints (flashing tracker dots)
      ctx.fillStyle = "#ef4444";
      const joints = [
        { x: rShX, y: rShY },
        { x: rElbowX, y: rElbowY },
        { x: rWristX, y: rWristY },
        { x: rHipX, y: rHipY },
        ...(m.kneeAngle !== -1 ? [{ x: rKneeX, y: rKneeY }, { x: rAnkleX, y: rAnkleY }] : [])
      ];
      joints.forEach((j) => {
        ctx.beginPath();
        ctx.arc(j.x, j.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Floating HUD Metric Labels
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`ELBOW: ${m.elbowAngle}°`, rElbowX + 12, rElbowY + 2);
      ctx.fillText(`KNEE: ${m.kneeAngle === -1 ? "NOT VISIBLE" : `${m.kneeAngle}°`}`, rKneeX + 12, rKneeY + 2);
      ctx.fillText(`SPINE: ${m.spineTilt}°`, hipX + 12, hipY - 6);

      // HUD title
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("KINECTRA SPORTS AUTONOMOUS HUD [MOCK_CAM]", 20, 30);

      requestAnimationFrame(drawFrame);
    }

    requestAnimationFrame(drawFrame);
    return () => { active = false; };
  }, [isDemoMode]);

  // ── Accumulate stats (once per second rather than every metric change) ──
  const accumulateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isModelLoading && (hasCameraPermission || isDemoMode)) {
      accumulateRef.current = setInterval(() => {
        if (metricsRef.current.bodyDetected) {
          // Sports-Science Phase Gate: Filter out idle/run-up/setup frames to analyze only the execution phase
          let isActivePhase = true;
          if (config.analysisType === "bowling") {
            // Bowling execution: release arm raised high or torso tilted
            isActivePhase = metricsRef.current.elbowAngle > 130 || metricsRef.current.spineTilt > 18;
          } else if (config.analysisType === "basketball") {
            // Shooting execution: active arm flex setpoint (75°-130°) and loaded knee (under 150°)
            isActivePhase = metricsRef.current.elbowAngle > 75 && metricsRef.current.elbowAngle < 130 && metricsRef.current.kneeAngle < 150;
          } else if (config.analysisType === "badminton") {
            // Smash execution: overhead reach (no short-reach warnings) or deep recovery lunge
            const hasShortReach = metricsRef.current.warnings.includes("Short overhead reach (Low contact point)");
            isActivePhase = (metricsRef.current.elbowAngle > 120 && !hasShortReach) || metricsRef.current.kneeAngle < 145;
          }

          if (!isActivePhase && !isDemoMode) {
            return; // ignore non-action run-up or idle frames
          }

          setFrameCount(f => f + 1);
          statsRef.current.frames += 1;
          
          let postureScore = 90;
          let alignmentScore = 90;

          if (config.analysisType === "bowling") {
            postureScore = metricsRef.current.spineTilt > 30 
              ? Math.max(50, Math.round(100 - (metricsRef.current.spineTilt - 30) * 3)) 
              : 95;
            alignmentScore = metricsRef.current.elbowAngle < 140 
              ? 50 
              : metricsRef.current.shoulderAlignment > 35 
              ? 65 
              : 95;
          } else if (config.analysisType === "basketball") {
            const isResting = metricsRef.current.elbowAngle > 125;
            postureScore = metricsRef.current.spineTilt > 12 
              ? Math.max(50, Math.round(100 - (metricsRef.current.spineTilt - 12) * 5)) 
              : 95;
            alignmentScore = isResting
              ? 15
              : (metricsRef.current.elbowAngle > 110 || metricsRef.current.elbowAngle < 70) 
              ? 60 
              : 95;
          } else if (config.analysisType === "badminton") {
            const isLowReach = metricsRef.current.warnings.includes("Short overhead reach (Low contact point)");
            postureScore = (metricsRef.current.spineTilt < 10 || metricsRef.current.spineTilt > 30) 
              ? 65 
              : 95;
            alignmentScore = isLowReach
              ? 30
              : metricsRef.current.elbowAngle < 145 
              ? 60 
              : 95;
          } else { // batting
            postureScore = metricsRef.current.spineTilt > 15 
              ? 70 
              : 95;
            alignmentScore = metricsRef.current.elbowAngle < 85 
              ? 65 
              : 95;
          }

          statsRef.current.postureSum += postureScore;
          statsRef.current.alignmentSum += alignmentScore;
          statsRef.current.stabilitySum += metricsRef.current.balanceScore;
          statsRef.current.efficiencySum += metricsRef.current.techniqueScore;

          // Dispatch telemetry frame to backend to empower Agora agent's tool calls
          if (config.sessionId) {
            const API_BASE_URL = import.meta.env.VITE_API_URL || "";
            fetch(`${API_BASE_URL}/api/session/${config.sessionId}/frame`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                elbowAngle: metricsRef.current.elbowAngle,
                spineTilt: metricsRef.current.spineTilt,
                kneeAngle: metricsRef.current.kneeAngle,
                shoulderAlignment: metricsRef.current.shoulderAlignment
              })
            }).catch((err) => console.warn("Failed to dispatch telemetry frame:", err));
          }
        }
      }, 1000);
    }
    return () => { if (accumulateRef.current) clearInterval(accumulateRef.current); };
  }, [isModelLoading, hasCameraPermission]);

  const handleEndSession = useCallback(() => {
    if (!config.sessionId) return;
    stopAnalysis();
    const n = Math.max(1, statsRef.current.frames);
    const avgPosture = Math.round(statsRef.current.postureSum / n);
    const avgAlignment = Math.round(statsRef.current.alignmentSum / n);
    const avgStability = Math.round(statsRef.current.stabilitySum / n);
    const avgEfficiency = Math.round(statsRef.current.efficiencySum / n);
    const overallScore = Math.round(
      avgPosture * 0.3 + avgAlignment * 0.25 + avgStability * 0.25 + avgEfficiency * 0.2
    );
    endSessionMutation.mutate(
      {
        sessionId: config.sessionId,
        data: {
          frameCount: statsRef.current.frames,
          avgPostureScore: avgPosture,
          avgAlignmentScore: avgAlignment,
          avgStabilityScore: avgStability,
          avgEfficiencyScore: avgEfficiency,
          overallScore,
          warnings: smoothedMetrics.warnings,
          snapshots: snapshots as any,
        },
      },
      {
        onSuccess: () => setLocation(`/results/${config.sessionId}`),
        onError: () => toast({ variant: "destructive", title: "Error ending session", description: "Failed to save session data." }),
      }
    );
  }, [config.sessionId, stopAnalysis, endSessionMutation, smoothedMetrics.warnings, setLocation, toast, isGuest]);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Dynamic Metric labels based on selected sport
  const getMetricLabels = () => {
    switch (config.analysisType) {
      case "bowling":
        return {
          elbow: "Release Elbow",
          knee: "Landing Knee",
          spine: "Delivery Tilt",
          balance: "Stride Balance",
          form: "Bowling Score",
          risk: "Lumbar Risk"
        };
      case "batting":
        return {
          elbow: "Backlift Elbow",
          knee: "Lunge Knee",
          spine: "Head Stability",
          balance: "Stance Balance",
          form: "Stance Score",
          risk: "Knee Strain"
        };
      case "basketball":
        return {
          elbow: "Set-Point Elbow",
          knee: "Propulsion Knee",
          spine: "Spine Alignment",
          balance: "Launch Balance",
          form: "Release Score",
          risk: "Load Strain"
        };
      case "badminton":
        return {
          elbow: "Smash Reach",
          knee: "Lunge Knee",
          spine: "Arch Rotation",
          balance: "Lunge Stability",
          form: "Smash Score",
          risk: "Joint Strain"
        };
      default:
        return {
          elbow: "Elbow Angle",
          knee: "Knee Angle",
          spine: "Spine Tilt",
          balance: "Balance Score",
          form: "Form Score",
          risk: "Injury Risk"
        };
    }
  };
  const metricLabels = getMetricLabels();

  const disciplineName = 
    config.analysisType === "bowling" ? "Bowling" : 
    config.analysisType === "batting" ? "Batting" : 
    config.analysisType === "basketball" ? "Basketball" : 
    config.analysisType === "badminton" ? "Badminton" : "Unknown";

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">

      {/* ── Header ── */}
      <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border/60 z-10 shrink-0">
        <div className="flex flex-col">
          <span className="font-extrabold tracking-wider text-sm text-foreground">KINECTRA LABS</span>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
            Autonomous Coaching Hub
          </span>
        </div>

        {/* Center Stats Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ATHLETE: <strong className="text-foreground">{config.athleteName || "ug"}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground">
            <span>DISCIPLINE: <strong className="text-primary">{disciplineName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground">
            <span>TIME: <strong className="text-foreground">{formatTime(frameCount)}</strong></span>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleEndSession}
          disabled={endSessionMutation.isPending}
          className="gap-1.5 font-bold text-xs rounded-full px-4 shrink-0 bg-red-600 hover:bg-red-700"
        >
          {endSessionMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <StopCircle className="h-3.5 w-3.5" />
          )}
          End Session
        </Button>
      </header>

      {/* ── Main Layout: Split Screen ── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0 bg-background overflow-y-auto">
        
        {/* Left Side: Live Player Feed */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider">
            <div className="flex items-center gap-2 flex-wrap">
              <Camera className="h-4 w-4 text-orange-500" />
              <span>Live Player Feed</span>
              {actionStatus === "moving" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse lowercase tracking-normal font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Hands Moving • Capturing
                </span>
              ) : actionStatus === "captured" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40 lowercase tracking-normal font-sans">
                  <Camera className="w-3 h-3 text-orange-400" />
                  Snapshot Captured!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-muted-foreground bg-muted/50 border border-border/50 lowercase tracking-normal font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Ready • Move hands to capture
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => captureSnapshot("Manual Capture")}
              className="h-7 text-[11px] gap-1.5 font-semibold bg-background/80 hover:bg-primary hover:text-white border-primary/40 rounded-lg shadow-xs transition-all shrink-0"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              Capture Snapshot
            </Button>
          </div>
          
          <div className={`relative w-full aspect-video bg-card border rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-center ${showGlowPulse ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-[1.002]' : 'border-border/60 shadow-sm'}`}>

            {/* Overlays for loading / error states */}
            {hasCameraPermission === false && !isDemoMode && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-gray-400 p-8 text-center z-20">
                <Camera className="h-12 w-12 mb-4 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Camera Access Required</h3>
                <p className="max-w-sm text-sm mb-4">
                  KINECTRA runs pose analysis entirely in your browser — your video never leaves your device.
                </p>
                <Button
                  onClick={() => setIsDemoMode(true)}
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2 px-5 rounded-full mt-2 gap-1.5 shadow"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Run Simulated Demo Session
                </Button>
                <div className="h-4" />
                {cameraError === "NotReadableError" ? (
                  <p className="max-w-xs text-xs text-orange-400 bg-orange-400/10 border border-orange-500/20 px-3 py-2 rounded-lg font-mono">
                    ⚠️ Webcam is blocked or in use by another tab or app (e.g. Zoom, Teams, or browser developer tools). Please close other tabs/apps and refresh.
                  </p>
                ) : cameraError === "NotAllowedError" || cameraError === "PermissionDeniedError" ? (
                  <p className="max-w-xs text-xs text-red-400 bg-red-400/10 border border-red-500/20 px-3 py-2 rounded-lg font-mono">
                    ❌ Permission Denied. Please click the camera icon in your browser address bar to allow camera access, then reload.
                  </p>
                ) : cameraError === "NotFoundError" || cameraError === "DevicesNotFoundError" ? (
                  <p className="max-w-xs text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-lg font-mono">
                    🔌 No camera device detected on this system.
                  </p>
                ) : (
                  <p className="max-w-xs text-xs text-slate-500 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg font-mono">
                    Error code: {cameraError || "Unknown Access Error"}
                  </p>
                )}
              </div>
            )}
            {isModelLoading && hasCameraPermission !== false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm text-gray-200 z-20 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <h3 className="text-base font-medium tracking-tight">Initialising Vision Engine</h3>
                <p className="text-sm text-gray-500">Loading WASM modules & weights…</p>
              </div>
            )}
            {modelError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 text-red-400 z-20 gap-3">
                <AlertCircle className="h-10 w-10" />
                <p className="text-sm text-center max-w-xs">{modelError}</p>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-contain ${config.analysisMode === "upload" ? "" : "scale-x-[-1]"}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-contain z-10 pointer-events-none ${config.analysisMode === "upload" ? "" : "scale-x-[-1]"}`}
            />

            {/* Corner reticle */}
            <div className="absolute inset-0 pointer-events-none m-4 z-20 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-l-2 border-t-2 border-primary/60 rounded-tl" />
                <div className="w-6 h-6 border-r-2 border-t-2 border-primary/60 rounded-tr" />
              </div>
              <div className="flex justify-between">
                <div className="w-6 h-6 border-l-2 border-b-2 border-primary/60 rounded-bl" />
                <div className="w-6 h-6 border-r-2 border-b-2 border-primary/60 rounded-br" />
              </div>
            </div>

            {/* Scan line effect */}
            {!isModelLoading && hasCameraPermission && (
              <motion.div
                className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent z-20 pointer-events-none"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          
          <p className="text-[9px] font-mono text-center text-slate-500 uppercase tracking-widest mt-1">
            Real-time client-side coordinate mapping overlaid.
          </p>
        </div>

        {/* Right Side: AI Coach Avatar */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <span>AI Coach Avatar</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(prev => !prev)}
                className={`h-7 w-7 rounded-full transition-all duration-300 ${isMuted ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                title={isMuted ? "Unmute Coach Voice" : "Mute Coach Voice"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <span className="text-[9px] font-mono text-slate-500 tracking-normal font-medium">COACH ARYAN (ACTIVE)</span>
            </div>
          </div>

          <div className="flex-1 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center gap-4 relative min-h-[280px]">
            {/* Upper Left Suggestion Overlay */}
            <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-mono uppercase tracking-wider font-semibold z-10 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 relative flex">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
              </span>
              <span>Next: {activeSuggestion}</span>
            </div>

            {/* Animated Coach SVG */}
            <CoachAvatarSVG isSpeaking={isSpeaking} />

            {/* Translucent voice message bubble */}
            <div className="w-full bg-muted/40 border border-border/60 rounded-xl p-4 flex items-start gap-3 mt-2 shadow-sm">
              <Volume2 className={`h-5 w-5 text-red-500 mt-0.5 shrink-0 ${isSpeaking ? 'animate-pulse scale-110' : ''}`} />
              <p className="text-xs text-muted-foreground font-medium italic leading-relaxed">
                "{spokenText}"
              </p>
            </div>
          </div>

          <p className="text-[9px] font-mono text-center text-slate-500 uppercase tracking-widest mt-1">
            Avatar animated dynamically in sync with text-to-speech instructions.
          </p>
        </div>
      </div>

      {/* ── Mid Section: Metrics Grid & Action Buttons ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-6 py-4 border-t border-border/60 bg-card shrink-0">
        
        {/* Metrics Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricBlock label={metricLabels.elbow} value={`${smoothedMetrics.elbowAngle}°`} isOrange />
          <MetricBlock label={metricLabels.knee} value={smoothedMetrics.kneeAngle === -1 ? "Not Visible" : `${smoothedMetrics.kneeAngle}°`} isOrange />
          <MetricBlock label={metricLabels.spine} value={`${smoothedMetrics.spineTilt}°`} isOrange />
          <MetricBlock label={metricLabels.balance} value={`${smoothedMetrics.balanceScore}%`} />
          <MetricBlock label={metricLabels.form} value={`${smoothedMetrics.techniqueScore}/100`} isGreen />
          <MetricBlock label={metricLabels.risk} isBadge badgeValue={smoothedMetrics.warnings.length >= 2 ? "HIGH" : smoothedMetrics.warnings.length === 1 ? "MEDIUM" : "LOW"} />
        </div>

        {/* Action button stack */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center items-center">
          <Button
            variant="destructive"
            className="w-full gap-2 font-semibold shadow-md bg-red-600 hover:bg-red-700 relative text-xs py-1"
            onClick={() => {
              toast({
                title: "Active Session Recording",
                description: "Telemetry pose data is being auto-captured automatically.",
              });
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <span>Record Session</span>
          </Button>
          
          <Button
            variant="outline"
            className="w-full gap-2 font-semibold bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white text-xs py-1"
            onClick={handleEndSession}
          >
            <BarChart2 className="h-3.5 w-3.5 shrink-0" />
            <span>View Analysis Report</span>
          </Button>
        </div>
      </div>

      {/* ── Bottom Section: Auto Snapshot Gallery ── */}
      <div className="px-6 py-3 bg-muted/40 border-t border-border/60 shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 min-h-[105px]">
        <div className="shrink-0 flex flex-col justify-center leading-none text-muted-foreground font-mono font-bold tracking-widest text-[9px] uppercase">
          <span>SNAPSHOT</span>
          <span className="mt-1 text-primary">GALLERY ({snapshots.length})</span>
        </div>

        <div className="flex-1 flex gap-3 overflow-x-auto pb-1 scrollbar-none items-center">
          {snapshots.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/70 italic">
              <span>No snapshots captured yet.</span>
              <button
                type="button"
                onClick={() => captureSnapshot("Manual Capture")}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Click here to capture now
              </button>
            </div>
          ) : (
            snapshots.map((snap, i) => {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-32 rounded-lg overflow-hidden border border-border/60 bg-background shrink-0 shadow-sm hover:shadow-md hover:border-primary/60 transition-all duration-200 group cursor-pointer"
                  onClick={() => setPreviewSnapshot(snap)}
                >
                  <img src={snap.src} className="w-full aspect-video object-cover" alt={snap.label} />
                  <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1.5 py-0.5 flex items-center justify-between text-[9px] font-mono text-white">
                    <span className="truncate max-w-[75px] font-medium">{snap.label}</span>
                    <span className="text-orange-400 font-bold">{snap.time}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Snapshot Modal Preview ── */}
      <AnimatePresence>
        {previewSnapshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
            onClick={() => setPreviewSnapshot(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-2xl w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">{previewSnapshot.label}</span>
                  <span className="text-xs font-mono text-muted-foreground">({previewSnapshot.time})</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewSnapshot.src}
                    download={`kinectra-snapshot-${previewSnapshot.label.toLowerCase().replace(/\s+/g, "-")}.webp`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md"
                    onClick={() => setPreviewSnapshot(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-black flex justify-center items-center">
                <img
                  src={previewSnapshot.src}
                  alt={previewSnapshot.label}
                  className="max-h-[60vh] w-auto rounded-lg object-contain shadow-md"
                />
              </div>

              {previewSnapshot.metrics && (
                <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground">Metrics:</span>
                  <span className="px-2 py-0.5 rounded bg-muted border border-border/60">
                    Elbow: <strong className="text-foreground">{previewSnapshot.metrics.elbowAngle}°</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted border border-border/60">
                    Knee: <strong className="text-foreground">{previewSnapshot.metrics.kneeAngle}°</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted border border-border/60">
                    Spine: <strong className="text-foreground">{previewSnapshot.metrics.spineTilt}°</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted border border-border/60">
                    Shoulder: <strong className="text-foreground">{previewSnapshot.metrics.shoulderAlignment}°</strong>
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function CoachAvatarSVG({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <svg width="130" height="130" viewBox="0 0 140 140" className="mx-auto select-none">
      {/* Cap crown */}
      <path d="M40 50 C40 30, 100 30, 100 50 Z" fill="#1e293b" />
      
      {/* Visor */}
      <path d="M30 50 C30 46, 110 46, 110 50 C110 54, 30 54, 30 50 Z" fill="#f97316" />
      <path d="M35 50 Q70 60 105 50" stroke="#f97316" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* Ears */}
      <circle cx="34" cy="75" r="8" fill="#fde047" />
      <circle cx="106" cy="75" r="8" fill="#fde047" />

      {/* Face */}
      <circle cx="70" cy="78" r="30" fill="#fef08a" />

      {/* Sunglasses */}
      {/* Left lens */}
      <path d="M44 68 C44 60, 68 60, 68 68 C68 74, 44 74, 44 68 Z" fill="#0f172a" />
      {/* Right lens */}
      <path d="M72 68 C72 60, 96 60, 96 68 C96 74, 72 74, 72 68 Z" fill="#0f172a" />
      {/* Bridge */}
      <rect x="66" y="65" width="8" height="4" fill="#0f172a" />

      {/* Mouth */}
      <motion.ellipse
        cx="70"
        cy="92"
        rx="8"
        animate={{ ry: isSpeaking ? [2, 9, 2] : 2.5 }}
        transition={{ repeat: Infinity, duration: 0.35, ease: "easeInOut" }}
        fill="#0f172a"
      />

      {/* Collar neck line */}
      <path d="M50 112 Q70 122 90 112" stroke="#f97316" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function MetricBlock({
  label,
  value,
  isOrange,
  isGreen,
  isBadge,
  badgeValue,
}: {
  label: string;
  value?: string;
  isOrange?: boolean;
  isGreen?: boolean;
  isBadge?: boolean;
  badgeValue?: "LOW" | "MEDIUM" | "HIGH";
}) {
  const valueColor = isOrange 
    ? "text-orange-500" 
    : isGreen 
      ? "text-emerald-500" 
      : "text-foreground";

  const badgeColor = badgeValue === "HIGH" 
    ? "bg-red-500/10 border-red-500/30 text-red-500" 
    : badgeValue === "MEDIUM" 
      ? "bg-orange-500/10 border-orange-500/30 text-orange-500" 
      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";

  return (
    <div className="bg-background border border-border/60 rounded-xl p-3 flex flex-col justify-between min-h-[75px] shadow-sm">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
      {isBadge ? (
        <span className={`inline-block w-fit px-2.5 py-0.5 rounded-full border text-[10px] font-bold mt-1 ${badgeColor}`}>
          {badgeValue}
        </span>
      ) : (
        <span className={`text-xl font-bold tracking-tight font-mono mt-1 ${valueColor}`}>
          {value}
        </span>
      )}
    </div>
  );
}
