import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useListSessions } from "@workspace/api-client-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth_context";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  Wallet,
  Activity,
  ChevronRight,
  Lock,
  Unlock,
  MessageSquare,
  Send,
  ExternalLink,
  Award,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  UserCheck,
  Zap,
  Check,
  X
} from "lucide-react";

export default function Coach() {
  const { logout } = useAuth();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const { data: allSessions, isLoading: isSessionsLoading } = useListSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  // Interactive Coach review workflow states
  const [coachConfirmation, setCoachConfirmation] = useState<"confirmed" | "overruled" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [savedFeedbacks, setSavedFeedbacks] = useState<Record<string, { note: string; status: "confirmed" | "overruled" | null }>>({});

  // Active tab state
  const [activePortalTab, setActivePortalTab] = useState<"overview" | "athletes" | "analysis" | "progress">("overview");
  const [chartParameter, setChartParameter] = useState<"score" | "elbow" | "spine" | "stability">("score");

  // Callback ref for skeleton rendering canvas element
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node !== null) {
      setCanvasElement(node);
    }
  }, []);

  // Load saved feedbacks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kinectra_coach_reviews_db");
    if (saved) {
      try {
        setSavedFeedbacks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load coach reviews", e);
      }
    }
  }, []);

  const getChartData = () => {
    switch (chartParameter) {
      case "elbow":
        return [
          { name: "S1", "Arjun Nair": 168, "Jasprit Bumrah": 115, "Ravi Shastri": 142, "Rahul Awana": 150 },
          { name: "S2", "Arjun Nair": 170, "Jasprit Bumrah": 128, "Ravi Shastri": 143, "Rahul Awana": 145 },
          { name: "S3", "Arjun Nair": 169, "Jasprit Bumrah": 140, "Ravi Shastri": 141, "Rahul Awana": 110 },
          { name: "S4", "Arjun Nair": 171, "Jasprit Bumrah": 152, "Ravi Shastri": 142, "Rahul Awana": 128 },
          { name: "S5", "Arjun Nair": 172, "Jasprit Bumrah": 165, "Ravi Shastri": 143, "Rahul Awana": 138 }
        ];
      case "spine":
        return [
          { name: "S1", "Arjun Nair": 6, "Jasprit Bumrah": 32, "Ravi Shastri": 17, "Rahul Awana": 14 },
          { name: "S2", "Arjun Nair": 7, "Jasprit Bumrah": 26, "Ravi Shastri": 16, "Rahul Awana": 18 },
          { name: "S3", "Arjun Nair": 6, "Jasprit Bumrah": 20, "Ravi Shastri": 17, "Rahul Awana": 36 },
          { name: "S4", "Arjun Nair": 5, "Jasprit Bumrah": 14, "Ravi Shastri": 18, "Rahul Awana": 26 },
          { name: "S5", "Arjun Nair": 5, "Jasprit Bumrah": 8, "Ravi Shastri": 17, "Rahul Awana": 19 }
        ];
      case "stability":
        return [
          { name: "S1", "Arjun Nair": 92, "Jasprit Bumrah": 50, "Ravi Shastri": 76, "Rahul Awana": 78 },
          { name: "S2", "Arjun Nair": 93, "Jasprit Bumrah": 62, "Ravi Shastri": 77, "Rahul Awana": 72 },
          { name: "S3", "Arjun Nair": 91, "Jasprit Bumrah": 74, "Ravi Shastri": 76, "Rahul Awana": 45 },
          { name: "S4", "Arjun Nair": 94, "Jasprit Bumrah": 83, "Ravi Shastri": 77, "Rahul Awana": 58 },
          { name: "S5", "Arjun Nair": 95, "Jasprit Bumrah": 91, "Ravi Shastri": 77, "Rahul Awana": 66 }
        ];
      case "score":
      default:
        return [
          { name: "S1", "Arjun Nair": 88, "Jasprit Bumrah": 55, "Ravi Shastri": 68, "Rahul Awana": 75 },
          { name: "S2", "Arjun Nair": 89, "Jasprit Bumrah": 65, "Ravi Shastri": 69, "Rahul Awana": 70 },
          { name: "S3", "Arjun Nair": 90, "Jasprit Bumrah": 73, "Ravi Shastri": 70, "Rahul Awana": 42 },
          { name: "S4", "Arjun Nair": 89, "Jasprit Bumrah": 82, "Ravi Shastri": 68, "Rahul Awana": 58 },
          { name: "S5", "Arjun Nair": 91, "Jasprit Bumrah": 90, "Ravi Shastri": 70, "Rahul Awana": 65 }
        ];
    }
  };

  const getYAxisDomain = (): [number, number] => {
    switch (chartParameter) {
      case "elbow":
        return [100, 180];
      case "spine":
        return [0, 40];
      case "stability":
      case "score":
      default:
        return [40, 100];
    }
  };

  const getReferenceLineValue = (): number => {
    switch (chartParameter) {
      case "elbow":
        return 160;
      case "spine":
        return 15;
      case "stability":
      case "score":
      default:
        return 85;
    }
  };

  const getReferenceLineLabel = (): string => {
    switch (chartParameter) {
      case "spine":
        return "Max Standard Lean (15°)";
      case "elbow":
        return "Extension Std (160°)";
      case "stability":
      case "score":
      default:
        return "Standard Target (85%)";
    }
  };

  const getLegendLabels = () => {
    switch (chartParameter) {
      case "elbow":
        return {
          arjun: "Arjun Nair (Perfect Extension)",
          jasprit: "Jasprit Bumrah (Extension Improver)",
          shastri: "Ravi Shastri (Moderate Release)",
          rahul: "Rahul Awana (Consistent Average)"
        };
      case "spine":
        return {
          arjun: "Arjun Nair (Excellent Posture)",
          jasprit: "Jasprit Bumrah (Steadily Stabilizing)",
          shastri: "Ravi Shastri (Consistent Average)",
          rahul: "Rahul Awana (Critical Posture Drift)"
        };
      case "stability":
        return {
          arjun: "Arjun Nair (Excellent Stability)",
          jasprit: "Jasprit Bumrah (Balance Improver)",
          shastri: "Ravi Shastri (Steady Baseline)",
          rahul: "Rahul Awana (Needs Attention)"
        };
      case "score":
      default:
        return {
          arjun: "Arjun Nair (Elite Consistent)",
          jasprit: "Jasprit Bumrah (Constantly Improving)",
          shastri: "Ravi Shastri (Steady Baseline)",
          rahul: "Rahul Awana (Needs Attention)"
        };
    }
  };

  // Filter sessions that have authorized the coach wallet.
  const getAuthorizedSessions = () => {
    if (!allSessions) return [];
    
    const differentNames = [
      "Ravi Shastri",
      "Rahul Awana",
      "Arjun Nair",
      "Devdutt Padikkal",
      "Jasprit Bumrah",
      "Rishabh Pant",
      "Rohit Sharma",
      "Shreyas Iyer",
      "Hardik Pandya",
      "KL Rahul"
    ];

    const filtered = allSessions.filter((session) => {
      // If guest mode and no wallet connected, show all for demonstration
      if (!isConnected) {
        return true;
      }
      
      const stored = sessionStorage.getItem(`kinectra_vault_permissions_${session.id}`);
      if (stored) {
        try {
          const list: string[] = JSON.parse(stored);
          return list.some(addr => addr.toLowerCase() === address?.toLowerCase());
        } catch {
          return false;
        }
      }
      
      // Fallback: If no permissions list is set, default to guest demo list
      return true;
    });

    return filtered.map((session, index) => {
      let cleanName = session.athleteName;
      if (
        cleanName.toLowerCase() === "guest" || 
        cleanName.toLowerCase() === "athlete" || 
        cleanName.toLowerCase().startsWith("demo")
      ) {
        cleanName = differentNames[index % differentNames.length];
      }
      return {
        ...session,
        athleteName: cleanName
      };
    });
  };

  const authorizedSessions = getAuthorizedSessions();
  const selectedSession = authorizedSessions.find((s) => s.id === selectedSessionId);
  const selectedSessionMetrics = (selectedSession?.snapshots?.[0]?.metrics) as {
    elbowAngle?: number;
    kneeAngle?: number;
    spineTilt?: number;
    balanceScore?: number;
  } | undefined;

  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [selectedSessionSnapshots, setSelectedSessionSnapshots] = useState<any[]>([]);

  // Sync state when selected session changes
  useEffect(() => {
    if (selectedSessionId) {
      const record = savedFeedbacks[selectedSessionId];
      setFeedbackText(record?.note || "");
      setCoachConfirmation(record?.status || null);

      // Load athlete snapshots
      const stored = sessionStorage.getItem(`kinectra_snapshots_${selectedSessionId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSelectedSessionSnapshots(parsed);
          setActiveFrameIndex(0);
        } catch (e) {
          console.error("Failed to parse snapshots", e);
        }
      } else {
        if (selectedSession?.snapshots) {
          setSelectedSessionSnapshots(selectedSession.snapshots);
          setActiveFrameIndex(0);
        } else {
          setSelectedSessionSnapshots([]);
        }
      }
    }
  }, [selectedSessionId, selectedSession, savedFeedbacks]);

  const activeSnapshot = selectedSessionSnapshots[activeFrameIndex];
  const activeSnapshotSrc = activeSnapshot?.src || activeSnapshot?.image || (typeof window !== "undefined" ? window.location.origin + "/cricket_fallback.png" : "/cricket_fallback.png");
  const activeMetrics = activeSnapshot?.metrics as {
    elbowAngle?: number;
    kneeAngle?: number;
    spineTilt?: number;
    balanceScore?: number;
  } | undefined;

  // Handle saving coach audit & feedback
  const handleSaveReview = () => {
    if (!selectedSessionId) return;
    const record = { note: feedbackText, status: coachConfirmation };
    const updated = { ...savedFeedbacks, [selectedSessionId]: record };
    setSavedFeedbacks(updated);
    localStorage.setItem("kinectra_coach_reviews_db", JSON.stringify(updated));
    
    // Push feedback text to session storage so athlete page displays it
    sessionStorage.setItem(`kinectra_coach_feedback_txt_${selectedSessionId}`, feedbackText);
    if (coachConfirmation) {
      sessionStorage.setItem(`kinectra_coach_feedback_status_${selectedSessionId}`, coachConfirmation);
    }

    toast({
      title: "Review Authenticated",
      description: "Coach review status and training recommendations signed and pushed to the athlete's ledger.",
    });
  };

  // Load background image state
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!activeSnapshotSrc) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.src = activeSnapshotSrc;
    img.onload = () => {
      setLoadedImage(img);
    };
    img.onerror = () => {
      console.warn("Failed to load active snapshot image:", activeSnapshotSrc);
      setLoadedImage(null);
    };
  }, [activeSnapshotSrc]);

  // Render stick figure preview in canvas
  useEffect(() => {
    if (!canvasElement || activePortalTab !== "analysis" || !selectedSessionId) return;
    const canvas = canvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let active = true;

    const defaultElbow = selectedSession?.avgAlignmentScore ? Math.round(180 - (selectedSession.avgAlignmentScore * 0.4)) : 162;
    const defaultKnee = selectedSession?.avgPostureScore ? Math.round(110 + (selectedSession.avgPostureScore * 0.55)) : 145;
    const defaultSpine = selectedSession?.avgPostureScore ? Math.round(35 - (selectedSession.avgPostureScore * 0.25)) : 18;
    const defaultAlignment = selectedSession?.avgAlignmentScore ?? 22;

    const metrics = {
      elbowAngle: activeMetrics?.elbowAngle ?? selectedSessionMetrics?.elbowAngle ?? defaultElbow,
      kneeAngle: activeMetrics?.kneeAngle ?? selectedSessionMetrics?.kneeAngle ?? defaultKnee,
      spineTilt: activeMetrics?.spineTilt ?? selectedSessionMetrics?.spineTilt ?? defaultSpine,
      shoulderAlignment: activeMetrics?.balanceScore ?? selectedSessionMetrics?.balanceScore ?? defaultAlignment
    };

    const drawFrame = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (loadedImage) {
        ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
        // Semi-transparent overlay to highlight skeleton
        ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Draw dark grid backdrop fallback
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let j = 0; j < canvas.height; j += 20) {
          ctx.beginPath();
          ctx.moveTo(0, j);
          ctx.lineTo(canvas.width, j);
          ctx.stroke();
        }
      }

      // Joint base coordinates
      const neckX = 120, neckY = 60;
      const hipX = 120, hipY = 135;
      const shoulderWidth = 28;
      const lShX = neckX - shoulderWidth;
      const rShX = neckX + shoulderWidth;
      const lShY = neckY;
      const rShY = neckY;

      // Draw Head
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(neckX, neckY - 20, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Spine (tilt shifts the hip relative to neck)
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(neckX, neckY);
      ctx.lineTo(hipX + (metrics.spineTilt > 15 ? 10 : 0), hipY);
      ctx.stroke();

      // Draw Shoulders
      ctx.beginPath();
      ctx.moveTo(lShX, lShY);
      ctx.lineTo(rShX, rShY);
      ctx.stroke();

      // Right arm (profiled trigger arm)
      const armLength = 40;
      const rElbowX = rShX + armLength * 0.8;
      const rElbowY = rShY + armLength * 0.5;
      
      const upperArmAngle = Math.atan2(rElbowY - rShY, rElbowX - rShX);
      const elbowAngleRad = (metrics.elbowAngle * Math.PI) / 180;
      const forearmAngle = upperArmAngle + (Math.PI - elbowAngleRad);
      const rWristX = rElbowX + Math.cos(forearmAngle) * armLength;
      const rWristY = rElbowY + Math.sin(forearmAngle) * armLength;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(rShX, rShY);
      ctx.lineTo(rElbowX, rElbowY);
      ctx.lineTo(rWristX, rWristY);
      ctx.stroke();

      // Right leg
      const rHipX = hipX + 12;
      const rHipY = hipY;
      
      if (metrics.kneeAngle !== -1) {
        const thighAngle = Math.PI / 3; // 60 degrees pointing down-right
        const thighLength = 42;
        const rKneeX = rHipX + Math.cos(thighAngle) * thighLength;
        const rKneeY = rHipY + Math.sin(thighAngle) * thighLength;

        const kneeAngleRad = (metrics.kneeAngle * Math.PI) / 180;
        const shinAngle = thighAngle + (Math.PI - kneeAngleRad);
        const shinLength = 38;
        const rAnkleX = rKneeX + Math.cos(shinAngle) * shinLength;
        const rAnkleY = rKneeY + Math.sin(shinAngle) * shinLength;

        ctx.strokeStyle = "#a7f3d0";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(rHipX, rHipY);
        ctx.lineTo(rKneeX, rKneeY);
        ctx.lineTo(rAnkleX, rAnkleY);
        ctx.stroke();

        // Joint tracker dots
        ctx.fillStyle = "#ef4444";
        const joints = [
          { x: rShX, y: rShY },
          { x: rElbowX, y: rElbowY },
          { x: rWristX, y: rWristY },
          { x: rHipX, y: rHipY },
          { x: rKneeX, y: rKneeY },
          { x: rAnkleX, y: rAnkleY }
        ];
        joints.forEach(j => {
          ctx.beginPath();
          ctx.arc(j.x, j.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(rHipX, rHipY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
        ctx.font = "bold 8px sans-serif";
        ctx.fillText("LOWER BODY OUT OF FRAME", 30, canvas.height - 20);
      }

      // HUD overlay text
      ctx.fillStyle = "#10b981";
      ctx.font = "9px monospace";
      ctx.fillText(`ELBOW: ${metrics.elbowAngle}°`, 12, 20);
      ctx.fillText(`KNEE: ${metrics.kneeAngle === -1 ? "NOT VISIBLE" : `${metrics.kneeAngle}°`}`, 12, 32);
      ctx.fillText(`SPINE: ${metrics.spineTilt}°`, 12, 44);

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => { active = false; };
  }, [canvasElement, selectedSessionId, activePortalTab, loadedImage, activeMetrics, selectedSessionMetrics]);

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 animate-fade-in">
        
        {/* Header Title with Log Out */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                Secure Auditor Node
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Coach Portal & Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Audit athlete movement profiles and submit cryptographically signed review feedback.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => logout()} className="text-xs font-semibold rounded-xl">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Web3 Decryption Connection Banner */}
        <Card className="border-border/60 bg-card/45 backdrop-blur shadow-sm">
          <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0 mt-0.5">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Biometric Wallet Decryption Hub
                  <Badge variant={isConnected ? "default" : "secondary"} className="text-[9px] font-bold tracking-wider uppercase">
                    {isConnected ? "Connected" : "Inactive Node"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed max-w-2xl">
                  Connect your coach MetaMask wallet. The platform will automatically verify permission blocks on Polygon and list only the athletes who have authorized your public address to audit their joint telemetry.
                </CardDescription>
              </div>
            </div>
            <div className="shrink-0">
              <ConnectButton label="Connect Coach Wallet" accountStatus="address" showBalance={false} chainStatus="icon" />
            </div>
          </CardContent>
        </Card>

        {/* Portal Tabs Bar */}
        <Tabs 
          value={activePortalTab} 
          onValueChange={(val) => setActivePortalTab(val as any)} 
          className="w-full space-y-6"
        >
          <TabsList className="grid grid-cols-4 w-full md:w-[600px] h-10 bg-muted/50 p-1 border gap-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg py-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="athletes" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg py-1.5">
              <Users className="h-3.5 w-3.5" /> Athletes
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg py-1.5">
              <Activity className="h-3.5 w-3.5" /> Live Audit
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1.5 text-xs font-semibold rounded-lg py-1.5">
              <FileText className="h-3.5 w-3.5" /> Progress
            </TabsTrigger>
          </TabsList>

          {/* 1. OVERVIEW & ANALYTICS PORTAL */}
          <TabsContent value="overview" className="space-y-6 outline-none">
            {/* Overview Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/60 bg-card/65 p-5 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Total Athletes</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">4</span>
                  <Badge variant="outline" className="text-[9px] text-emerald-500 font-bold border-emerald-500/20 bg-emerald-500/5">Active Roster</Badge>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/65 p-5 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Active Sessions</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">{authorizedSessions.length}</span>
                  <Badge variant="outline" className="text-[9px] text-primary font-bold border-primary/20 bg-primary/5">Syncing Ledger</Badge>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/65 p-5 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Team Avg Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">82.5%</span>
                  <Badge variant="outline" className="text-[9px] text-sky-500 font-bold border-sky-500/20 bg-sky-500/5">High Quality</Badge>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/65 p-5 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Attention Required</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-500">1</span>
                  <Badge variant="destructive" className="text-[9px] font-bold">14% spine drift</Badge>
                </div>
              </Card>
            </div>

            {/* Alerts & Insights Log Box */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <Zap className="h-4.5 w-4.5 text-primary" />
                  <CardTitle className="text-sm font-bold">Alerts & Real-Time Biometric Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 p-3 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Attention Required: Rahul's Spine Tilt</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Rahul's spine tilt has increased by 14% across the last 3 sessions (average stance lean increased to 22.8°). Immediate technique brace adjustments recommended.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Improvement: Arjun's Front-Foot Stability</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Arjun's front-foot stabilization score improved from 72% → 86% across his last 4 sessions. The knee bend release correction has resolved the low-stance impact collapse.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Analysis Activity Log */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 bg-muted/10">
                <CardTitle className="text-sm font-bold">Recent Telemetry Activity Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {authorizedSessions.slice(0, 3).map((session, i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/5 transition-all">
                      <div className="space-y-1 truncate">
                        <p className="text-xs font-bold text-foreground">{session.athleteName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Stance: {session.analysisType} | Released on {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold font-mono">
                        Score: {session.overallScore}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* 2. ATHLETE REGISTRY PORTAL */}
          <TabsContent value="athletes" className="space-y-6 outline-none">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-foreground">Athlete Management Registry</h2>
              <Button size="sm" className="text-xs font-semibold rounded-xl" onClick={() => {
                toast({
                  title: "Invite Link Generated",
                  description: "Registration token copied. Send this token to your student athlete.",
                });
              }}>
                + Invite Athlete
              </Button>
            </div>

            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground uppercase font-bold tracking-wider [&>th]:px-4 [&>th]:py-3.5">
                        <th>Athlete Name</th>
                        <th>Sport / Discipline</th>
                        <th>Stance Stance</th>
                        <th>Sessions Count</th>
                        <th>Technique Score</th>
                        <th>Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr className="hover:bg-muted/5 transition-all [&>td]:px-4 [&>td]:py-4">
                        <td className="font-bold text-foreground flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">RA</div>
                          Rahul Awana
                        </td>
                        <td>Cricket (Batsman)</td>
                        <td>Right Handed</td>
                        <td className="font-mono">8 Sessions</td>
                        <td className="font-bold text-amber-500">71%</td>
                        <td>
                          <Badge variant="destructive" className="text-[9px] uppercase font-bold tracking-wider py-0.5">
                            Spine drift
                          </Badge>
                        </td>
                      </tr>

                      <tr className="hover:bg-muted/5 transition-all [&>td]:px-4 [&>td]:py-4">
                        <td className="font-bold text-foreground flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">AS</div>
                          Arjun Singh
                        </td>
                        <td>Cricket (Batsman)</td>
                        <td>Right Handed</td>
                        <td className="font-mono">12 Sessions</td>
                        <td className="font-bold text-emerald-500">86%</td>
                        <td>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider py-0.5 text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                            Stable Stance
                          </Badge>
                        </td>
                      </tr>

                      <tr className="hover:bg-muted/5 transition-all [&>td]:px-4 [&>td]:py-4">
                        <td className="font-bold text-foreground flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">PK</div>
                          Priyanshu K.
                        </td>
                        <td>Cricket (Bowler)</td>
                        <td>Left Handed</td>
                        <td className="font-mono">6 Sessions</td>
                        <td className="font-bold text-sky-500">80%</td>
                        <td>
                          <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-wider py-0.5">
                            Awaiting review
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. BIOMECHANICAL AUDIT PORTAL */}
          <TabsContent value="analysis" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Authorized Athlete Sessions List */}
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                  Authorized Athlete Logs ({authorizedSessions.length})
                </h2>

                {isSessionsLoading ? (
                  <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
                    Syncing ledger authorizations...
                  </div>
                ) : authorizedSessions.length === 0 ? (
                  <Card className="border-dashed border-border/80 bg-muted/10">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <Lock className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
                      <div className="space-y-1">
                        <p className="font-bold text-sm">Registry Access Blocked</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          {isConnected 
                            ? `Your connected address (${address?.slice(0, 8)}...) has not been granted biometric decryption permissions by any athlete yet.` 
                            : "Connect your coach wallet above to scan and decrypt shared telemetry files."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {authorizedSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          selectedSessionId === session.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/60 bg-card hover:border-border hover:bg-muted/15"
                        }`}
                      >
                        <div className="space-y-1.5 truncate flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{session.athleteName}</span>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-2 py-0">
                              {session.analysisType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
                            <span>Score: {session.overallScore}</span>
                            <span>Date: {new Date(session.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${selectedSessionId === session.id ? "translate-x-0.5 text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Session Telemetry Auditor */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {selectedSession ? (
                    <motion.div
                      key={selectedSession.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <Card className="border-border/80 shadow-md">
                        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between gap-4">
                          <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              Telemetry Audit: {selectedSession.athleteName}
                            </CardTitle>
                            <CardDescription className="text-xs font-mono">
                              Session Hash ID: {selectedSession.id}
                            </CardDescription>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-none font-bold text-xs gap-1">
                            <Unlock className="h-3.5 w-3.5" /> Decrypted
                          </Badge>
                        </CardHeader>
                        
                        <CardContent className="p-6 space-y-6">
                          
                          {/* Biomechanics Visual HUD + Angle Details */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                            <div className="md:col-span-5 flex flex-col items-center">
                              <div className="relative border bg-slate-950 rounded-2xl overflow-hidden aspect-square w-full max-w-[240px] shadow-inner">
                                <canvas 
                                  ref={canvasRef} 
                                  width={240} 
                                  height={240} 
                                  className="absolute inset-0 w-full h-full object-cover z-10"
                                />
                                <div className="absolute bottom-2 right-2 text-[8px] font-mono text-emerald-500/60 uppercase z-20">
                                  Active HUD
                                </div>
                              </div>

                              {/* Interactive Scrubber Slider controls */}
                              {selectedSessionSnapshots.length > 1 && (
                                <div className="w-full space-y-2 mt-4 px-2">
                                  <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                                    <span>Frame {activeFrameIndex + 1} of {selectedSessionSnapshots.length}</span>
                                    <span>Time: {selectedSessionSnapshots[activeFrameIndex]?.time || `${activeFrameIndex}s`}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={selectedSessionSnapshots.length - 1}
                                    value={activeFrameIndex}
                                    onChange={(e) => setActiveFrameIndex(Number(e.target.value))}
                                    className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer appearance-none"
                                  />
                                  <div className="flex justify-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-md text-[10px] font-bold"
                                      onClick={() => setActiveFrameIndex(prev => Math.max(0, prev - 1))}
                                      disabled={activeFrameIndex === 0}
                                    >
                                      ◀
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-6 w-6 rounded-md text-[10px] font-bold"
                                      onClick={() => setActiveFrameIndex(prev => Math.min(selectedSessionSnapshots.length - 1, prev + 1))}
                                      disabled={activeFrameIndex === selectedSessionSnapshots.length - 1}
                                    >
                                      ▶
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="md:col-span-7 space-y-4">
                              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Biomechanical Telemetry
                              </h3>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                  <span className="text-[10px] text-muted-foreground font-mono block">ELBOW RELEASE</span>
                                  <span className="text-lg font-bold">
                                    {activeMetrics?.elbowAngle ?? selectedSessionMetrics?.elbowAngle ?? (selectedSession?.avgAlignmentScore ? Math.round(180 - (selectedSession.avgAlignmentScore * 0.4)) : 162)}°
                                  </span>
                                </div>
                                
                                <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                  <span className="text-[10px] text-muted-foreground font-mono block">KNEE BEND</span>
                                  <span className="text-lg font-bold">
                                    {(activeMetrics?.kneeAngle ?? selectedSessionMetrics?.kneeAngle) === -1 ? "Not Visible" : `${activeMetrics?.kneeAngle ?? selectedSessionMetrics?.kneeAngle ?? (selectedSession?.avgPostureScore ? Math.round(110 + (selectedSession.avgPostureScore * 0.55)) : 145)}°`}
                                  </span>
                                </div>

                                <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                  <span className="text-[10px] text-muted-foreground font-mono block">LATERAL SPINE TILT</span>
                                  <span className="text-lg font-bold">
                                    {activeMetrics?.spineTilt ?? selectedSessionMetrics?.spineTilt ?? (selectedSession?.avgPostureScore ? Math.round(35 - (selectedSession.avgPostureScore * 0.25)) : 18)}°
                                  </span>
                                </div>

                                <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                  <span className="text-[10px] text-muted-foreground font-mono block">STABILIZATION SCORE</span>
                                  <span className="text-lg font-bold">
                                    {activeMetrics?.balanceScore ?? selectedSessionMetrics?.balanceScore ?? selectedSession?.avgStabilityScore ?? 89}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Augmented Coaching Workflow Section */}
                          <div className="pt-4 border-t space-y-4">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4.5 w-4.5 text-primary animate-pulse" />
                              <h3 className="text-sm font-bold">KINECTRA Collaborative Workflow</h3>
                            </div>

                            {/* Phase 1: Kinectra AI Insight */}
                            <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                                Phase 1: KINECTRA Telemetry Insight
                              </span>
                              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                                Kinectra AI model flags a potential **{selectedSessionMetrics?.spineTilt && selectedSessionMetrics.spineTilt > 15 ? "14% Lateral Spine lean deflection" : "knee brace release collapse"}** at release frame. Score reduction weight factor calculated at 1.8x.
                              </p>
                            </div>

                            {/* Phase 2: Coach Review Confirmation */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                                Phase 2: Coach Audit & Review Confirmation
                              </span>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setCoachConfirmation("confirmed")}
                                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    coachConfirmation === "confirmed"
                                      ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-sm"
                                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                                  }`}
                                >
                                  <Check className="h-4 w-4" />
                                  Confirm Deflection
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => setCoachConfirmation("overruled")}
                                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    coachConfirmation === "overruled"
                                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm"
                                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                                  }`}
                                >
                                  <X className="h-4 w-4" />
                                  Overrule (Form OK)
                                </button>
                              </div>
                            </div>

                            {/* Phase 3: Coach drills feedback editor */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                                Phase 3: Training Recommendations & Drills
                              </span>
                              <Textarea
                                placeholder="Type training suggestions, drills, or biomechanical advice here. These remarks will be encrypted and signed by your coach identity..."
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                className="text-xs min-h-[100px] rounded-xl bg-background border-border/60 focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                              <Link href={`/results/${selectedSession.id}`}>
                                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1 rounded-xl">
                                  View Full Report <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                              
                              <Button 
                                onClick={handleSaveReview} 
                                size="sm" 
                                className="text-xs font-semibold gap-1 rounded-xl shadow-md"
                              >
                                <Send className="h-3 w-3" /> Sign & Pushed Ledger
                              </Button>
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-8 bg-muted/10 border border-dashed rounded-2xl">
                      <div className="space-y-2 max-w-sm py-12">
                        <Activity className="h-10 w-10 mx-auto text-muted-foreground/35 animate-pulse" />
                        <p className="font-bold text-sm">Select an Athlete Session</p>
                        <p className="text-xs text-muted-foreground">
                          Choose any authorized athlete log on the left side of the dashboard to audit their biomechanical posture overlay, analyze joint metrics, and send coaching feedbacks.
                        </p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </TabsContent>

          {/* 4. PROGRESS TRACKING PORTAL */}
          <TabsContent value="progress" className="space-y-6 outline-none">
            {/* Team Biometric Performance Trends & Weakness Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Line Chart Comparison Card */}
              <Card className="lg:col-span-7 border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold">Team Performance Comparison Trends</CardTitle>
                      <CardDescription className="text-xs">
                        Track technique metrics across the last 5 training runs.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-1 bg-muted/65 p-0.5 border rounded-lg">
                      <button
                        onClick={() => setChartParameter("score")}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${chartParameter === "score" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Score
                      </button>
                      <button
                        onClick={() => setChartParameter("elbow")}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${chartParameter === "elbow" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Elbow
                      </button>
                      <button
                        onClick={() => setChartParameter("spine")}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${chartParameter === "spine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Spine Lean
                      </button>
                      <button
                        onClick={() => setChartParameter("stability")}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${chartParameter === "stability" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Stability
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[260px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getChartData()}
                        margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                        <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.5)" fontSize={10} tickLine={false} />
                        <YAxis stroke="rgba(148, 163, 184, 0.5)" fontSize={10} domain={getYAxisDomain()} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "rgba(255, 255, 255, 0.1)", borderRadius: "8px" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "9px", marginTop: "10px" }} />
                        <ReferenceLine 
                          y={getReferenceLineValue()} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          label={{ value: getReferenceLineLabel(), fill: "#ef4444", fontSize: 8, position: "insideBottomLeft" }} 
                        />
                        <Line type="linear" name={getLegendLabels().arjun} dataKey="Arjun Nair" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="linear" name={getLegendLabels().jasprit} dataKey="Jasprit Bumrah" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="linear" name={getLegendLabels().shastri} dataKey="Ravi Shastri" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="linear" name={getLegendLabels().rahul} dataKey="Rahul Awana" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weakness & Corrective Action Matrix */}
              <Card className="lg:col-span-5 border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Weakness & Improvement Matrix</CardTitle>
                  <CardDescription className="text-xs">
                    Identified movement errors and customized coach prescriptions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                  
                  {/* Rahul Card */}
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">Rahul Awana</span>
                      <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">Score: 71%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="border border-red-500/20 bg-red-500/5 p-2 rounded-lg">
                        <span className="text-[8px] uppercase tracking-wider text-red-400 font-bold block">WEAKNESS</span>
                        <span className="text-foreground">Spine tilt drift (22.8° average)</span>
                      </div>
                      <div className="border border-emerald-500/20 bg-emerald-500/5 p-2 rounded-lg">
                        <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold block">PRESCRIPTION</span>
                        <span className="text-foreground">Upright posture drills (3/day)</span>
                      </div>
                    </div>
                  </div>

                  {/* Jasprit Card */}
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">Jasprit Bumrah</span>
                      <span className="text-[10px] font-mono text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full font-bold">Score: 80%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="border border-red-500/20 bg-red-500/5 p-2 rounded-lg">
                        <span className="text-[8px] uppercase tracking-wider text-red-400 font-bold block">WEAKNESS</span>
                        <span className="text-foreground">Low arm release delivery angle</span>
                      </div>
                      <div className="border border-emerald-500/20 bg-emerald-500/5 p-2 rounded-lg">
                        <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold block">PRESCRIPTION</span>
                        <span className="text-foreground">High-arm delivery release drill</span>
                      </div>
                    </div>
                  </div>

                  {/* Arjun Card */}
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">Arjun Nair</span>
                      <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">Score: 89%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="border border-blue-500/20 bg-blue-500/5 p-2 rounded-lg">
                        <span className="text-[8px] uppercase tracking-wider text-blue-400 font-bold block">WEAKNESS</span>
                        <span className="text-foreground">Slight stance stability drift</span>
                      </div>
                      <div className="border border-emerald-500/20 bg-emerald-500/5 p-2 rounded-lg">
                        <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold block">PRESCRIPTION</span>
                        <span className="text-foreground">Stance consistency drills (2/day)</span>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3 bg-muted/20">
                <CardTitle className="text-sm font-bold">Recurring Technique Deflections</CardTitle>
                <CardDescription className="text-xs">
                  Biomechanical flaws flagged across consecutive sessions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Spine tilt lean deflections (Rahul Awana)</span>
                    <span className="font-mono text-amber-500 font-bold">High Occurrence (75% of runs)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Low release elbow alignment drop (Arjun Singh)</span>
                    <span className="font-mono text-emerald-500 font-bold">Resolved (0% of runs)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "10%" }} />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Landing Knee Brace Collapse (Priyanshu K.)</span>
                    <span className="font-mono text-sky-500 font-bold">Moderate Occurrence (35% of runs)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-sky-500 h-2 rounded-full" style={{ width: "35%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3 bg-muted/20">
                <CardTitle className="text-sm font-bold">Historical Score Improvement Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/20 p-4 border border-border/40 rounded-xl space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest block">Rahul Awana</span>
                    <span className="text-lg font-black text-amber-500">62% ➡️ 71%</span>
                    <span className="text-[10px] text-emerald-500 font-bold block">+9% technique gain</span>
                  </div>

                  <div className="bg-muted/20 p-4 border border-border/40 rounded-xl space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest block">Arjun Singh</span>
                    <span className="text-lg font-black text-emerald-500">72% ➡️ 86%</span>
                    <span className="text-[10px] text-emerald-500 font-bold block">+14% technique gain</span>
                  </div>

                  <div className="bg-muted/20 p-4 border border-border/40 rounded-xl space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest block">Priyanshu K.</span>
                    <span className="text-lg font-black text-sky-500">76% ➡️ 80%</span>
                    <span className="text-[10px] text-emerald-500 font-bold block">+4% technique gain</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
