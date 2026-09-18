import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { Activity, Camera, UploadCloud, AlertTriangle, ArrowLeft, Loader2, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth_context";
import { useSessionContext } from "@/contexts/SessionContext";
import { useGetSignatureMoveDetails, useStartSignatureAnalysis } from "@workspace/api-client-react";

export default function SignatureSetup() {
  const { moveId } = useParams<{ moveId: string }>();
  const [, setLocation] = useLocation();
  const { setConfig } = useSessionContext();
  const { toast } = useToast();
  const { user } = useAuth();

  const [analysisMode, setAnalysisMode] = useState<"live" | "upload">("live");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [athleteName, setAthleteName] = useState(user?.username || "");

  const { data: moveDetails, isLoading } = useGetSignatureMoveDetails(moveId);
  const startAnalysisMutation = useStartSignatureAnalysis();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetVideo(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetVideo(e.target.files[0]);
    }
  };

  const validateAndSetVideo = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a valid mp4, mov, or avi video file.",
      });
      return;
    }

    // Client-side HTML5 duration validator
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = URL.createObjectURL(file);
    tempVideo.onloadedmetadata = () => {
      window.URL.revokeObjectURL(tempVideo.src);
      const duration = tempVideo.duration;
      if (duration > 60) {
        toast({
          variant: "destructive",
          title: "Video Too Long",
          description: `Uploaded video is ${Math.round(duration)}s. Maximum video length allowed is 60 seconds.`,
        });
        setVideoFile(null);
      } else {
        setVideoFile(file);
        toast({
          title: "Video Validated",
          description: `Loaded: ${file.name} (${Math.round(duration)}s)`,
        });
      }
    };
  };

  const onStart = async () => {
    if (!athleteName.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter the athlete's name.",
      });
      return;
    }

    if (analysisMode === "upload" && !videoFile) {
      toast({
        variant: "destructive",
        title: "Video Required",
        description: "Please upload a recorded signature move video file.",
      });
      return;
    }

    startAnalysisMutation.mutate(
      {
        data: {
          athleteName,
          referenceMoveId: moveId,
          userId: user?.id || "guest"
        }
      },
      {
        onSuccess: (session) => {
          const videoUrl = videoFile ? URL.createObjectURL(videoFile) : null;
          setConfig({
            sessionId: session.id,
            athleteName,
            analysisType: moveDetails?.category === "batting" ? "batting" : "bowling",
            skillLevel: "intermediate",
            dominantHand: "right",
            analysisMode,
            videoFileUrl: videoUrl,
            referenceMoveId: moveId,
            signatureMoveName: moveDetails?.moveName
          });

          toast({
            title: "Analysis Ready",
            description: analysisMode === "upload" ? "Processing signature video..." : "Initializing MediaPipe cameras...",
          });

          setLocation(`/signature-analysis/${moveId}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Setup Failed",
            description: "Could not create signature move analysis session.",
          });
        }
      }
    );
  };

  if (isLoading || !moveDetails) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        Loading move details...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative overflow-hidden">
      <Navbar />

      <main className="flex-grow container px-4 py-8 md:py-12 mt-16 max-w-3xl mx-auto relative z-10">
        
        {/* Back navigation */}
        <Link href="/signature-moves" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider mb-6 cursor-pointer select-none">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Library
        </Link>

        {/* Move info summary */}
        <div className="mb-8 border bg-card rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start gap-4 mb-3">
            <div>
              <span className="text-[10px] font-bold font-mono text-primary uppercase bg-primary/5 border border-primary/20 rounded px-2.5 py-0.5">
                {moveDetails.category} signature
              </span>
              <h2 className="text-2xl font-black mt-2">{moveDetails.moveName}</h2>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
              Difficulty: <strong className="text-foreground">{moveDetails.difficulty}</strong>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {moveDetails.description}
          </p>
        </div>

        {/* Setup configuration form */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold">Configure Signature Session</h3>

          <div className="space-y-2">
            <Label htmlFor="athlete-name" className="text-xs font-bold uppercase font-mono tracking-wider">
              Athlete Name
            </Label>
            <Input
              id="athlete-name"
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
              className="rounded-xl px-4 py-2.5 text-sm bg-background/50 border-border/80"
              placeholder="Enter your name"
            />
          </div>

          {/* Mode Switcher */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase font-mono tracking-wider">
              Analysis Mode
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer border-2 transition-all hover:shadow-sm ${analysisMode === 'live' ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-transparent'}`}
                onClick={() => setAnalysisMode("live")}
              >
                <CardContent className="p-5 flex flex-col items-center text-center justify-center">
                  <Camera className={`h-6 w-6 mb-2 ${analysisMode === 'live' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-bold text-sm">Live Camera</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Capture pose markers via local webcam in real time.</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer border-2 transition-all hover:shadow-sm ${analysisMode === 'upload' ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-transparent'}`}
                onClick={() => setAnalysisMode("upload")}
              >
                <CardContent className="p-5 flex flex-col items-center text-center justify-center">
                  <UploadCloud className={`h-6 w-6 mb-2 ${analysisMode === 'upload' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-bold text-sm">Upload Video</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Upload a recorded video. Max length: 60 seconds.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upload panel */}
          {analysisMode === "upload" && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50 bg-muted/10'} ${videoFile ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className={`h-10 w-10 mb-3 ${videoFile ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              
              {videoFile ? (
                <div>
                  <span className="text-sm font-bold text-foreground block truncate max-w-md">{videoFile.name}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">Click or drag another video file to replace</span>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-bold block">Drag & drop your video file here</span>
                  <span className="text-xs text-muted-foreground mt-1 block">or click to browse local files</span>
                  <span className="text-[10px] text-orange-500/90 font-mono mt-3 inline-flex items-center gap-1 bg-orange-500/5 border border-orange-500/10 px-2 py-0.5 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    Maximum video length: 60 seconds
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={onStart}
            disabled={startAnalysisMutation.isPending}
            className="w-full rounded-full py-6 font-bold text-sm shadow-md"
          >
            {startAnalysisMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-1.5" />
            )}
            Start Signature Analysis
          </Button>
        </div>
      </main>
    </div>
  );
}
