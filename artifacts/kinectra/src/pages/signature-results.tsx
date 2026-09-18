import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { 
  Award, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Zap, 
  ArrowLeft, 
  MessageSquare, 
  Loader2, 
  ShieldAlert, 
  ChevronRight, 
  AlertCircle,
  Trophy,
  Activity,
  Compass
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useGetSignatureSession, useGetSignatureMoveDetails } from "@workspace/api-client-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";

export default function SignatureResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading, error } = useGetSignatureSession(sessionId);
  const { data: moveDetails } = useGetSignatureMoveDetails(session?.referenceMoveId || "");

  // AI Chat states
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ sender: "user" | "coach"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Active frame index for pictographic skeleton viewer
  const [activeFrame, setActiveFrame] = useState(0);

  // Local cache for the athlete's peak snapshot base64 image
  const [athleteSnapshot, setAthleteSnapshot] = useState<string | null>(null);
  useEffect(() => {
    if (sessionId) {
      const cached = localStorage.getItem(`kinectra_session_frame_${sessionId}`);
      if (cached) {
        setAthleteSnapshot(cached);
      }
    }
  }, [sessionId]);

  // Initial welcome message from AI Coach
  useEffect(() => {
    if (session && moveDetails) {
      setChatLog([
        {
          sender: "coach",
          text: `Hi! I've aligned your movement with ${moveDetails.playerName}'s reference technique. Your Signature Move Score is ${session.score}/100. Feel free to ask me how to improve your mechanics!`
        }
      ]);
    }
  }, [session, moveDetails]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        Analyzing biomechanical comparison...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <ShieldAlert className="h-10 w-10 text-destructive animate-pulse" />
        <span>Failed to load signature move results.</span>
        <Link href="/signature-moves">
          <Button variant="outline" size="sm">Return to Library</Button>
        </Link>
      </div>
    );
  }

  // Parse trajectory coordinates
  const sessObj = session as any;
  const chartData = sessObj.alignedFrames ? sessObj.alignedFrames.map((f: any, idx: number) => ({
    frame: idx + 1,
    time: f.time.toFixed(2) + "s",
    phase: f.phase.toUpperCase(),
    refWristY: (1.0 - f.refWrist.y).toFixed(3), // Invert Y so higher value means higher reach
    athWristY: (1.0 - f.athWrist.y).toFixed(3),
    refAngle: f.refAngle,
    athAngle: f.athAngle,
    deviation: f.deviation
  })) : [];

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatLog((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";
      const chatRes = await fetch(`${API_BASE_URL}/api/session/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `In my Signature Move comparison against ${moveDetails?.playerName}'s ${moveDetails?.moveName}: My score was ${session.score}/100. Trajectory similarity: ${session.trajectorySimilarity}%, Accuracy: ${session.biomechanicalAccuracy}%, Stability: ${session.stabilityScore}%. ${userMsg}`,
          history: [],
          snapshots: []
        })
      });

      if (!chatRes.ok) throw new Error("Chat api failed");
      const data = await chatRes.json();
      setChatLog((prev) => [...prev, { sender: "coach", text: data.reply }]);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Assistant Offline",
        description: "Could not fetch AI coaching feedback."
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-border/80 rounded-xl p-4 font-mono text-[10px] space-y-1.5 shadow-xl text-white">
          <p className="font-extrabold text-[11px] text-primary">{data.phase}</p>
          <p className="text-muted-foreground">Alignment Frame: {data.frame} ({data.time})</p>
          <div className="border-t my-1.5 pt-1.5 space-y-1">
            <p>Reference Wrist Height: <strong className="text-blue-400">{data.refWristY}</strong></p>
            <p>Your Wrist Height: <strong className="text-orange-400">{data.athWristY}</strong></p>
            <p>Reference Elbow Angle: <strong>{data.refAngle}°</strong></p>
            <p>Your Elbow Angle: <strong>{data.athAngle}°</strong></p>
            <p className="text-rose-400 font-bold border-t mt-1.5 pt-1">Deviation: {data.deviation}°</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper coordinate mappers for SVG drawing
  const getX = (pt: any) => pt ? (pt.x * 240 + 80).toFixed(1) : "0";
  const getY = (pt: any) => pt ? (pt.y * 240 + 80).toFixed(1) : "0";

  // Build full wrist trajectory paths for the background trail
  let refWristPathStr = "";
  let athWristPathStr = "";
  if (sessObj.alignedFrames) {
    sessObj.alignedFrames.forEach((f: any, idx: number) => {
      const refW = f.refWrist;
      const athW = f.athWrist;
      if (refW) {
        refWristPathStr += `${idx === 0 ? 'M' : 'L'} ${getX(refW)} ${getY(refW)}`;
      }
      if (athW) {
        athWristPathStr += `${idx === 0 ? 'M' : 'L'} ${getX(athW)} ${getY(athW)}`;
      }
    });
  }

  const getTrajectoryAngle = (frames: any[], currentIdx: number, isRef: boolean) => {
    if (!frames || frames.length === 0 || currentIdx === 0) return 0;
    const prevF = frames[currentIdx - 1];
    const currF = frames[currentIdx];
    const prevPt = isRef ? prevF.refWrist : prevF.athWrist;
    const currPt = isRef ? currF.refWrist : currF.athWrist;
    if (!prevPt || !currPt) return 0;
    
    const dx = currPt.x - prevPt.x;
    const dy = currPt.y - prevPt.y;
    
    const angleRad = Math.atan2(-dy, dx); // Invert Y so up is positive
    return Math.round(angleRad * 180 / Math.PI);
  };

  const activeFrameData = sessObj.alignedFrames ? sessObj.alignedFrames[activeFrame] : null;

  const drawSkeleton = (pose: any, strokeColor: string, isDashed = false, elbowAngleVal?: number, kneeAngleVal?: number, trajAngle?: number, gradPrefix = "ref") => {
    if (!pose) return null;
    const joints = {
      lsho: pose.leftShoulder,
      rsho: pose.rightShoulder,
      lhip: pose.leftHip,
      rhip: pose.rightHip,
      lelb: pose.leftElbow,
      relb: pose.rightElbow,
      lwri: pose.leftWrist,
      rwri: pose.rightWrist,
      lkne: pose.leftKnee,
      rkne: pose.rightKnee,
      lank: pose.leftAnkle,
      rank: pose.rightAnkle,
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

    const activeElbow = sessObj.dominantHand === "left" ? joints.lelb : joints.relb;
    const activeKnee = joints.rkne;
    const activeWrist = sessObj.dominantHand === "left" ? joints.lwri : joints.rwri;

    // Center of Hips
    const hL = joints.lhip || { x: 0.5, y: 0.65 };
    const hR = joints.rhip || { x: 0.5, y: 0.65 };
    const midHX = (parseFloat(getX(hL)) + parseFloat(getX(hR))) / 2;
    const midHY = (parseFloat(getY(hL)) + parseFloat(getY(hR))) / 2;

    // Center of Shoulders
    const sL = joints.lsho || { x: 0.5, y: 0.35 };
    const sR = joints.rsho || { x: 0.5, y: 0.35 };
    const midSX = (parseFloat(getX(sL)) + parseFloat(getX(sR))) / 2;
    const midSY = (parseFloat(getY(sL)) + parseFloat(getY(sR))) / 2;

    // Torso midpoint
    const torsoX = (midHX + midSX) / 2;
    const torsoY = (midHY + midSY) / 2;

    // Torso lean rotation angle
    const dxSho = parseFloat(getX(sR)) - parseFloat(getX(sL));
    const dySho = parseFloat(getY(sR)) - parseFloat(getY(sL));
    const rawAngle = Math.atan2(dySho, dxSho) * (180 / Math.PI);
    const tiltAngle = Number.isNaN(rawAngle) ? 0 : rawAngle * 0.45;

    // Size of the backdrop photo: make both reference and athlete photo larger (340px) to fill the SVG canvas
    const imgSize = 340;
    let xOffset = torsoX - imgSize / 2;
    let yOffset = torsoY - imgSize / 2;
    
    if (gradPrefix === "ref") {
      xOffset -= 35; // Shift reference left to align Dhoni with center skeleton
    } else {
      yOffset -= 60; // Shift athlete photo up to pull their body to the center skeleton
    }
    const imgTransform = `translate(${xOffset.toFixed(1)}, ${yOffset.toFixed(1)})`;

    // Draw trajectory direction vector arrow
    let arrowEl = null;
    if (activeWrist && trajAngle !== undefined) {
      const rad = (Number(trajAngle) * Math.PI) / 180;
      const wX = parseFloat(getX(activeWrist));
      const wY = parseFloat(getY(activeWrist));
      
      const arrowX = (wX + 25 * Math.cos(rad)).toFixed(1);
      const arrowY = (wY - 25 * Math.sin(rad)).toFixed(1); // subtract since SVG Y goes down
          arrowEl = (
        <>
          <line
            x1={wX}
            y1={wY}
            x2={arrowX}
            y2={arrowY}
            stroke={strokeColor === "#0ea5e9" ? "#06b6d4" : "#f97316"}
            strokeWidth="2.5"
            markerEnd={strokeColor === "#0ea5e9" ? "url(#arrow-cyan)" : "url(#arrow-orange)"}
          />
          <g transform={`translate(${arrowX}, ${arrowY})`}>
            <rect x="-26" y="-14" width="52" height="11" rx="3.5" fill="#020617" stroke={strokeColor} strokeWidth="1.2" opacity="1.0" />
            <text x="0" y="-6" fill="#ffffff" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {trajAngle}° Path
            </text>
          </g>
        </>
      );
    }

    // Render cricket bat if both wrists are available
    let batEl = null;
    if (joints.lwri && joints.rwri) {
      const wL_X = parseFloat(getX(joints.lwri));
      const wL_Y = parseFloat(getY(joints.lwri));
      const wR_X = parseFloat(getX(joints.rwri));
      const wR_Y = parseFloat(getY(joints.rwri));
      
      const midX = (wL_X + wR_X) / 2;
      const midY = (wL_Y + wR_Y) / 2;
      
      const rad = trajAngle !== undefined ? (Number(trajAngle) * Math.PI) / 180 : Math.PI / 4;
      
      // Handle lines
      const handleEndX = midX + 12 * Math.cos(rad);
      const handleEndY = midY - 12 * Math.sin(rad);
      
      // Blade lines
      const bladeEndX = handleEndX + 35 * Math.cos(rad);
      const bladeEndY = handleEndY - 35 * Math.sin(rad);
      
      batEl = (
        <g>
          {/* Bat Handle grip */}
          <line
            x1={midX.toFixed(1)}
            y1={midY.toFixed(1)}
            x2={handleEndX.toFixed(1)}
            y2={handleEndY.toFixed(1)}
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Willow wood bat blade */}
          <line
            x1={handleEndX.toFixed(1)}
            y1={handleEndY.toFixed(1)}
            x2={bladeEndX.toFixed(1)}
            y2={bladeEndY.toFixed(1)}
            stroke="url(#bat-blade-grad)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Shading edge highlight */}
          <line
            x1={handleEndX.toFixed(1)}
            y1={handleEndY.toFixed(1)}
            x2={bladeEndX.toFixed(1)}
            y2={bladeEndY.toFixed(1)}
            stroke="#b45309"
            strokeWidth="2"
            strokeLinecap="round"
            transform="translate(1, -1)"
          />
        </g>
      );
    }

    // Estimate Neck and Head positions proportional to shoulder width
    let headEl = null;
    if (joints.lsho && joints.rsho) {
      const sL_X = parseFloat(getX(joints.lsho));
      const sL_Y = parseFloat(getY(joints.lsho));
      const sR_X = parseFloat(getX(joints.rsho));
      const sR_Y = parseFloat(getY(joints.rsho));
      
      const midSX = (sL_X + sR_X) / 2;
      const midSY = (sL_Y + sR_Y) / 2;
      const shoWidth = Math.hypot(sR_X - sL_X, sR_Y - sL_Y) || 50;
      
      const radTilt = (tiltAngle * Math.PI) / 180;
      const neckLen = shoWidth * 0.4;
      const headX = midSX - neckLen * Math.sin(radTilt);
      const headY = midSY - neckLen * Math.cos(radTilt);
      const headRadius = shoWidth * 0.28;

      headEl = (
        <g key="mannequin-head">
          {/* Volumetric neck cylinder */}
          <line
            x1={midSX.toFixed(1)}
            y1={midSY.toFixed(1)}
            x2={headX.toFixed(1)}
            y2={headY.toFixed(1)}
            stroke={`url(#${gradPrefix}-limb-grad)`}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Volumetric 3D glossy head sphere */}
          <circle
            cx={headX.toFixed(1)}
            cy={headY.toFixed(1)}
            r={headRadius.toFixed(1)}
            fill={`url(#${gradPrefix}-joint-grad)`}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </g>
      );
    }

    const isHelicopter = moveDetails?.moveName?.toLowerCase().includes("helicopter") || false;
    const refImage = isHelicopter ? "/dhoni_helicopter_real.jpg" : "/ref_batsman_illust.png";
    
    // Choose appropriate backdrop image & opacity for reference (MS Dhoni photo) and athlete (Webcam capture photo)
    const backdropUrl = gradPrefix === "ref" ? refImage : (athleteSnapshot || "/ath_batsman_illust.png");
    const imgOpacity = gradPrefix === "ref"
      ? (isHelicopter ? "0.9" : "0.35")
      : (athleteSnapshot ? "0.9" : "0.35");

    return (
      <>
        {/* Clean player outline illustration backdrop */}
        <image
          href={backdropUrl}
          width={imgSize}
          height={imgSize}
          opacity={imgOpacity}
          transform={imgTransform}
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none"
        />

        {/* Skeleton bone lines */}
        {bones.map(([ptA, ptB], idx) => {
          if (!ptA || !ptB) return null;
          return (
            <line
              key={`bone-${idx}`}
              x1={getX(ptA)}
              y1={getY(ptA)}
              x2={getX(ptB)}
              y2={getY(ptB)}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeDasharray={isDashed ? "4 4" : undefined}
              strokeLinecap="round"
            />
          );
        })}

        {/* Head and Neck */}
        {headEl}

        {/* Cricket bat */}
        {batEl}

        {/* Joint dots */}
        {Object.entries(joints).map(([name, pt]: any) => {
          if (!pt) return null;
          return (
            <circle
              key={name}
              cx={getX(pt)}
              cy={getY(pt)}
              r="4"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1"
            />
          );
        })}

        {/* Trajectory angle arrow — the ONE key metric */}
        {arrowEl}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute top-[5%] left-[-120px] w-[320px] h-[320px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-120px] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="flex-grow container px-4 py-8 md:py-12 mt-16 max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Link href="/signature-moves" className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider cursor-pointer">
              <ArrowLeft className="h-3 w-3" />
              Signature Library
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Signature Move Analysis
            </h1>
            <p className="text-sm text-muted-foreground font-mono uppercase">
              Move: <strong className="text-foreground">{moveDetails?.playerName} - {moveDetails?.moveName}</strong>
            </p>
          </div>

          {/* Gamification badge */}
          {session.score >= 80 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 rounded-2xl shrink-0"
            >
              <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500 animate-pulse" />
              <div className="flex flex-col text-left font-mono">
                <span className="text-[9px] text-muted-foreground uppercase font-black">Unlocked Award</span>
                <span className="text-xs font-bold text-foreground">Technique Mastered!</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="glass border text-center flex flex-col justify-center items-center py-6 col-span-1 md:col-span-1 border-primary/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1.5">
              <Zap className="h-3.5 w-3.5 text-primary fill-primary animate-pulse" />
            </div>
            <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase">Signature Score</span>
            <span className="text-5xl font-black mt-3 text-primary font-mono">{session.score}</span>
            <span className="text-[9px] font-mono text-muted-foreground uppercase mt-2">/100 Total</span>
          </Card>

          <Card className="glass border p-5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase block">Move Similarity</span>
              <span className="text-2xl font-black font-mono">{session.trajectorySimilarity}%</span>
            </div>
            <Progress value={session.trajectorySimilarity} className="h-1.5 mt-4" />
          </Card>

          <Card className="glass border p-5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase block">Biomechanical Accuracy</span>
              <span className="text-2xl font-black font-mono">{session.biomechanicalAccuracy}%</span>
            </div>
            <Progress value={session.biomechanicalAccuracy} className="h-1.5 mt-4" />
          </Card>

          <Card className="glass border p-5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase block">Stability & Balance</span>
              <span className="text-2xl font-black font-mono">{session.stabilityScore}%</span>
            </div>
            <Progress value={session.stabilityScore} className="h-1.5 mt-4" />
          </Card>

          <Card className="glass border p-5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase block">Timing Alignment</span>
              <span className="text-2xl font-black font-mono">{session.timingScore}%</span>
            </div>
            <Progress value={session.timingScore} className="h-1.5 mt-4" />
          </Card>
        </div>

        {/* Pictographic Skeleton Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Split Screen Visualizer Card */}
          <Card className="glass border lg:col-span-2 overflow-hidden shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Compass className="h-4.5 w-4.5 text-primary" />
                Synchronized Split-Screen Trajectory Visualizer
              </CardTitle>
              <CardDescription className="text-xs">
                Compare reference technique (left) and your attempt (right) synchronized along the timeline with trajectory trails.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-6">
              
              {/* Skeletons side-by-side split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                
                {/* Left Panel: Reference */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-wider">
                    Reference: {moveDetails?.playerName} ({moveDetails?.moveName})
                  </span>
                  <div className="relative w-full max-w-[340px] aspect-square bg-card border rounded-2xl p-4 flex items-center justify-center border-border/50">
                    <svg viewBox="0 0 400 400" className="w-full h-full select-none" fill="none">
                      <defs>
                        <marker id="arrow-cyan" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                        </marker>
                        <linearGradient id="ref-limb-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
                        </linearGradient>
                        <radialGradient id="ref-joint-grad" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="30%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0369a1" />
                        </radialGradient>
                        <linearGradient id="ref-chest-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="bat-blade-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                      </defs>

                      {/* Reference Trajectory trail */}
                      {refWristPathStr && (
                        <path
                          d={refWristPathStr}
                          stroke="#0ea5e9"
                          strokeWidth="3"
                          strokeDasharray="4 4"
                          opacity="0.6"
                          fill="none"
                        />
                      )}
                      {activeFrameData && drawSkeleton(
                        activeFrameData.refPose || activeFrameData, 
                        "#0ea5e9", 
                        false,
                        chartData[activeFrame]?.refAngle,
                        activeFrameData.refKneeAngle || 142,
                        getTrajectoryAngle(sessObj.alignedFrames, activeFrame, true),
                        "ref"
                      )}
                    </svg>
                  </div>
                </div>

                {/* Right Panel: Athlete */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold font-mono text-primary uppercase tracking-wider">
                    Your Attempt: {session.athleteName}
                  </span>
                  <div className="relative w-full max-w-[340px] aspect-square bg-card border rounded-2xl p-4 flex items-center justify-center border-border/50">
                    <svg viewBox="0 0 400 400" className="w-full h-full select-none" fill="none">
                      <defs>
                        <marker id="arrow-orange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
                        </marker>
                        <linearGradient id="ath-limb-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#fdba74" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0.9" />
                        </linearGradient>
                        <radialGradient id="ath-joint-grad" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="30%" stopColor="#fdba74" />
                          <stop offset="100%" stopColor="#c2410c" />
                        </radialGradient>
                        <linearGradient id="ath-chest-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="bat-blade-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                      </defs>

                      {/* Athlete Trajectory trail */}
                      {athWristPathStr && (
                        <path
                          d={athWristPathStr}
                          stroke="#f97316"
                          strokeWidth="3"
                          strokeDasharray="4 4"
                          opacity="0.6"
                          fill="none"
                        />
                      )}
                      {activeFrameData && drawSkeleton(
                        activeFrameData.athPose || activeFrameData, 
                        "#f97316", 
                        false,
                        chartData[activeFrame]?.athAngle,
                        activeFrameData.athKneeAngle || 135,
                        getTrajectoryAngle(sessObj.alignedFrames, activeFrame, false),
                        "ath"
                      )}
                    </svg>
                  </div>
                </div>

              </div>

              {/* Controls & Slider */}
              <div className="w-full space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px] bg-muted/20 border p-3 rounded-xl">
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block font-bold">Timeline Frame</span>
                    <strong className="text-foreground text-xs">{activeFrame + 1} / {chartData.length}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block font-bold">Swing Phase</span>
                    <strong className="text-primary text-xs">{chartData[activeFrame]?.phase}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase text-[8px] block font-bold">Elapsed Time</span>
                    <strong className="text-foreground text-xs">{chartData[activeFrame]?.time}</strong>
                  </div>
                  <div>
                    <span className="text-rose-400 uppercase text-[8px] block font-bold">Joint Deviation</span>
                    <strong className="text-rose-400 text-xs">{chartData[activeFrame]?.deviation}°</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase block">
                    Drag Slider to Play/Pause Swing Sequence
                  </span>
                  <Slider
                    value={[activeFrame]}
                    onValueChange={(val) => setActiveFrame(val[0])}
                    min={0}
                    max={chartData.length > 0 ? chartData.length - 1 : 0}
                    step={1}
                    className="py-1.5"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Biomechanical Target focus & detail metrics card */}
          <Card className="glass border shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-primary" />
                Posture Offset Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Key angle targets at the aligned impact frames.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 font-mono text-xs flex-grow">
              <div className="border border-border/40 p-3.5 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Ideal Elbow reach</span>
                <div className="flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Reference: {chartData[activeFrame]?.refAngle}°</span>
                  <span className="text-orange-500">You: {chartData[activeFrame]?.athAngle}°</span>
                </div>
              </div>

              <div className="border border-border/40 p-3.5 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Spine Tilt Align</span>
                <div className="flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Reference: {activeFrameData?.refSpine || "22"}°</span>
                  <span className="text-orange-500">You: {activeFrameData?.athSpine || "18"}°</span>
                </div>
              </div>

              <div className="border border-border/40 p-3.5 rounded-xl space-y-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Knee Flexion absorption</span>
                <div className="flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Reference: {activeFrameData?.refKneeAngle || "142"}°</span>
                  <span className="text-orange-500">You: {activeFrameData?.athKneeAngle || "135"}°</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Comparison Trajectory Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Card */}
          <Card className="glass border lg:col-span-2 overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                Movement Trajectory Comparison
              </CardTitle>
              <CardDescription className="text-xs">
                Plotting normalized vertical wrist trajectory height across aligned reference movement frames.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="frame" stroke="#888888" fontSize={9} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} domain={[0, 1.2]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Line 
                      name="Reference Trajectory" 
                      type="monotone" 
                      dataKey="refWristY" 
                      stroke="#0ea5e9" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      name="Your Trajectory" 
                      type="monotone" 
                      dataKey="athWristY" 
                      stroke="#f97316" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Coach आर्यन Box */}
          <Card className="glass border flex flex-col h-[460px] shadow-sm">
            <CardHeader className="border-b bg-muted/10 pb-4 shrink-0">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-primary" />
                AI Biomechanical Coach
              </CardTitle>
              <CardDescription className="text-xs">Coach Aryan's signature move corrective training feedback.</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 p-4">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-4">
                  {chatLog.map((turn, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        turn.sender === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted border text-foreground'
                      }`}
                    >
                      <span className="font-bold font-mono text-[9px] uppercase mb-1 opacity-70">
                        {turn.sender === 'user' ? 'You' : 'Coach Aryan'}
                      </span>
                      <span>{turn.text}</span>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono p-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Aryan is analyzing metrics...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            <div className="p-3 border-t bg-muted/5 shrink-0 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Ask about your trajectory deviation..."
                className="text-xs rounded-xl"
              />
              <Button onClick={handleSendMessage} disabled={chatLoading} className="rounded-xl px-4 font-bold text-xs">
                Send
              </Button>
            </div>
          </Card>

        </div>

        {/* Existing Kinectra Results Redirect */}
        <div className="border border-border/40 bg-muted/15 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Review full breakdown details?</h4>
              <p className="text-xs text-muted-foreground max-w-xl">
                To check detailed training planner schedules, injury strain risk warnings, or local media frame logs, visit the standard results report.
              </p>
            </div>
          </div>
          <Link href={`/results/${sessionId}`}>
            <Button size="sm" variant="outline" className="rounded-full px-5 font-bold text-xs shrink-0 gap-1 font-mono uppercase tracking-wider">
              Standard Dashboard
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
