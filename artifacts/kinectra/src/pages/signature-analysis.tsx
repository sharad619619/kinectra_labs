import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Camera, Loader2, StopCircle, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSessionContext } from "@/contexts/SessionContext";
import { useKinectraAnalysis } from "@/hooks/use-kinectra-analysis";
import { useAuth } from "@/context/auth_context";
import { useProcessSignatureAnalysis } from "@workspace/api-client-react";

export default function SignatureAnalysis() {
  const { moveId } = useParams<{ moveId: string }>();
  const [, setLocation] = useLocation();
  const { config } = useSessionContext();
  const { toast } = useToast();
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const cameraInitialisedRef = useRef(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Buffer list to store athlete pose trajectory frames
  const poseSequenceRef = useRef<any[]>([]);
  const processMutation = useProcessSignatureAnalysis();

  const { isModelLoading, modelError, metrics, rawLandmarks, startAnalysis, stopAnalysis } =
    useKinectraAnalysis(config.analysisType, config.dominantHand);

  // Timer loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (hasCameraPermission && !isModelLoading) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [hasCameraPermission, isModelLoading]);

  // Frame Capture logic: logs landmarks when a new frame is processed by MediaPipe
  useEffect(() => {
    if (hasCameraPermission && !isModelLoading && metrics.bodyDetected && rawLandmarks && rawLandmarks.length > 0) {
      const timestamp = videoRef.current ? videoRef.current.currentTime : performance.now() / 1000;
      
      // Throttle logging to at most once per 60ms (approx 15 FPS) to prevent duplicate frames
      const lastFrame = poseSequenceRef.current[poseSequenceRef.current.length - 1];
      if (lastFrame && Math.abs(timestamp - lastFrame.timestamp) < 0.06) {
        return;
      }

      const frameRecord = {
        timestamp,
        phase: "execution", // DTW backend will assign phase
        angles: {
          elbowAngle: metrics.elbowAngle,
          kneeAngle: metrics.kneeAngle,
          spineTilt: metrics.spineTilt,
          shoulderAlignment: metrics.shoulderAlignment
        },
        landmarks: {
          leftShoulder: rawLandmarks[11],
          rightShoulder: rawLandmarks[12],
          leftHip: rawLandmarks[23],
          rightHip: rawLandmarks[24],
          leftWrist: rawLandmarks[15],
          rightWrist: rawLandmarks[16],
          leftElbow: rawLandmarks[13],
          rightElbow: rawLandmarks[14],
          leftKnee: rawLandmarks[25],
          rightKnee: rawLandmarks[26],
          leftAnkle: rawLandmarks[27],
          rightAnkle: rawLandmarks[28]
        }
      };
      poseSequenceRef.current.push(frameRecord);
    }
  }, [hasCameraPermission, isModelLoading, metrics, rawLandmarks]);

  // ── Camera Initialization ──────────────────────────────────────────
  useEffect(() => {
    if (!config.sessionId) {
      setLocation("/signature-moves");
      return;
    }

    if (cameraInitialisedRef.current) return;
    cameraInitialisedRef.current = true;

    let active = true;
    let stream: MediaStream | null = null;

    if (config.analysisMode === "upload" && config.videoFileUrl) {
      if (videoRef.current) {
        videoRef.current.src = config.videoFileUrl;
        videoRef.current.loop = false;
        videoRef.current.play().catch(() => {});
        setHasCameraPermission(true);
      }
      
      // Auto-trigger analysis end when video finishes
      const videoElement = videoRef.current;
      const handleEnded = () => {
        handleEndSession();
      };
      if (videoElement) videoElement.addEventListener("ended", handleEnded);

      return () => {
        active = false;
        stopAnalysis();
        if (videoElement) {
          videoElement.removeEventListener("ended", handleEnded);
          videoElement.src = "";
        }
        cameraInitialisedRef.current = false;
      };
    }

    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setHasCameraPermission(true);
        }
      } catch (err) {
        if (active) {
          setHasCameraPermission(false);
        }
      }
    }

    setupCamera();

    return () => {
      active = false;
      stopAnalysis();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      cameraInitialisedRef.current = false;
    };
  }, [config.analysisMode, config.videoFileUrl]);

  useEffect(() => {
    if (hasCameraPermission && !isModelLoading && videoRef.current && canvasRef.current) {
      startAnalysis(videoRef.current, canvasRef.current);
    }
  }, [hasCameraPermission, isModelLoading, startAnalysis]);

  const handleEndSession = useCallback(() => {
    if (!config.sessionId || !config.referenceMoveId) return;

    // Capture current peak snapshot from the athlete's video feed synchronously BEFORE stopping analysis or routing
    try {
      if (videoRef.current) {
        const capCanvas = document.createElement("canvas");
        capCanvas.width = videoRef.current.videoWidth || 640;
        capCanvas.height = videoRef.current.videoHeight || 480;
        const capCtx = capCanvas.getContext("2d");
        if (capCtx) {
          capCtx.drawImage(videoRef.current, 0, 0, capCanvas.width, capCanvas.height);
          const frameDataUrl = capCanvas.toDataURL("image/jpeg", 0.65);
          localStorage.setItem(`kinectra_session_frame_${config.sessionId}`, frameDataUrl);
        }
      }
    } catch (e) {
      console.warn("Failed to capture local athlete frame snapshot synchronously:", e);
    }
    
    stopAnalysis();

    if (poseSequenceRef.current.length < 5) {
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: "Unable to confidently detect body frames. Ensure your full body is visible.",
      });
      setLocation("/signature-moves");
      return;
    }

    processMutation.mutate(
      {
        data: {
          sessionId: config.sessionId,
          referenceMoveId: config.referenceMoveId,
          athleteName: config.athleteName,
          userId: user?.id || "guest",
          poseSequence: poseSequenceRef.current
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Analysis Complete",
            description: "Signature Move comparison calculations saved successfully.",
          });
          setLocation(`/signature-results/${config.sessionId}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Processing Failed",
            description: "Could not align movements. Please try again.",
          });
          setLocation("/signature-moves");
        }
      }
    );
  }, [config.sessionId, config.referenceMoveId, stopAnalysis, setLocation, user]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border/60 z-10 shrink-0">
        <div className="flex flex-col">
          <span className="font-extrabold tracking-wider text-sm text-foreground">KINECTRA SIGNATURE LABS</span>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
            ICONS REFERENCE COMPARISON
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground">
            <span>ATHLETE: <strong className="text-foreground">{config.athleteName || "guest"}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground">
            <span>REFERENCE: <strong className="text-primary">{config.signatureMoveName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground">
            <span>DURATION: <strong className="text-foreground">{formatTime(timeElapsed)}</strong></span>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleEndSession}
          disabled={processMutation.isPending}
          className="gap-1.5 font-bold text-xs rounded-full px-4 shrink-0 bg-red-600 hover:bg-red-700"
        >
          {processMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <StopCircle className="h-3.5 w-3.5" />
          )}
          Stop & Process Move
        </Button>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0 bg-background overflow-y-auto">
        
        {/* Feed Column */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Camera className="h-4 w-4 text-primary" />
            <span>Active Recording Camera Feed</span>
          </div>

          <div className="relative w-full aspect-video bg-card border rounded-xl overflow-hidden shadow-sm flex items-center justify-center border-border/60">
            {isModelLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 text-gray-400 p-8 text-center z-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <h3 className="text-sm font-bold text-gray-200">Loading Computer Vision Models</h3>
                <p className="text-[10px] max-w-xs text-muted-foreground mt-1">Downloading WASM landmark libraries. Keep window active...</p>
              </div>
            )}

            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
            />
          </div>
        </div>

        {/* Real-time HUD stats Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Activity className="h-4 w-4 text-orange-500" />
            <span>Live Biomechanics Data HUD</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="glass border shadow-sm">
              <div className="p-4 flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase">Elbow Angle</span>
                <span className="text-3xl font-black mt-2 font-mono">{metrics.elbowAngle}°</span>
              </div>
            </Card>

            <Card className="glass border shadow-sm">
              <div className="p-4 flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase">Knee Angle</span>
                <span className="text-3xl font-black mt-2 font-mono">
                  {metrics.kneeAngle === -1 ? "OFF-SCREEN" : `${metrics.kneeAngle}°`}
                </span>
              </div>
            </Card>

            <Card className="glass border shadow-sm">
              <div className="p-4 flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase">Spine Tilt</span>
                <span className="text-3xl font-black mt-2 font-mono">{metrics.spineTilt}°</span>
              </div>
            </Card>

            <Card className="glass border shadow-sm">
              <div className="p-4 flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase">Shoulder Rotation</span>
                <span className="text-3xl font-black mt-2 font-mono">{metrics.shoulderAlignment}°</span>
              </div>
            </Card>
          </div>

          {/* Telemetry log instructions */}
          <div className="border border-border/40 bg-muted/10 p-5 rounded-2xl flex-1 flex flex-col justify-center">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <h4 className="font-bold">Pose Trajectory Record Active</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Perform the signature move in front of the lens. The computer vision engine is extracting your joint landmarks at 15 FPS. When finished, hit **Stop & Process Move** to run Dynamic Time Warping alignment against the reference.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
