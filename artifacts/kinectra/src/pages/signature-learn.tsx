import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  BookOpen, 
  HelpCircle, 
  Loader2, 
  Play, 
  Compass, 
  Activity, 
  Target, 
  Sparkles, 
  MessageSquare 
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGetSignatureMoveDetails } from "@workspace/api-client-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// Hardcoded step data based on signature categories
const SHOT_STEPS = {
  batting: [
    {
      title: "1. Setup & Stance",
      description: "Establish a balanced posture. Keep feet shoulder-width apart, knees slightly bent, and hands close to your ribcage with low batlift.",
      target: "Ideal Knee Flexion: 135° | Spine Tilt: 15°"
    },
    {
      title: "2. Load & Backswing",
      description: "As the ball is delivered, shift weight slightly back. Raise the bat backward along a straight alignment path, keeping elbow high.",
      target: "Ideal Elbow Angle: 90° | Shoulder Rotation: 45°"
    },
    {
      title: "3. Initiation & Step",
      description: "Stride forward or press back depending on length. Start rotating your hips to create core torque, letting your hands follow the body swing.",
      target: "Weight Distribution: 60/40 front | Spine Tilt: 18°"
    },
    {
      title: "4. Swing & Contact",
      description: "Unleash bat whip. Extend your front arm (or whip bottom hand for helicopter) to strike the ball directly beneath your head.",
      target: "Target Elbow Angle: 150° | Target Impact Reach: 80cm"
    },
    {
      title: "5. Follow-Through",
      description: "Let the bat's natural swing arc rotate over your shoulder, maintaining foot balance and body stability until the motion completes.",
      target: "Shoulder Rotation: 90° | Stability Score: >90%"
    }
  ],
  bowling: [
    {
      title: "1. Stride Gather",
      description: "Enter your delivery stride. Gather your hands close to your chest, lifting your front knee to load vertical elastic force.",
      target: "Front Knee Flexion: 110° | Spine Tilt: 8°"
    },
    {
      title: "2. Backfoot Landing",
      description: "Align your backfoot perpendicular or parallel to the crease. Brace your back leg to anchor the rotational catapult torque.",
      target: "Back Knee Angle: 140° | Shoulder Alignment: Side-on"
    },
    {
      title: "3. Frontfoot Plant",
      description: "Plant your front foot firmly. Keep a braced, straight front knee to act as a pivot brake, converting horizontal speed into release arm whip.",
      target: "Front Knee Angle: 165° (Braced) | Spine Forward Tilt: 25°"
    },
    {
      title: "4. Ball Release",
      description: "Release the ball at the highest point of arm extension. Align your release arm straight with the shoulder slot for maximum pace.",
      target: "Release Arm Extension: 175° | Release Angle: 85°"
    },
    {
      title: "5. Follow-Through",
      description: "Decelerate your body safely by taking 2-3 strides forward, folding your bowling arm down across your opposite hip.",
      target: "Torso Forward Tilt: 45° | Deceleration path: Straight line"
    }
  ]
};

export default function SignatureLearn() {
  const { moveId } = useParams<{ moveId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: moveDetails, isLoading } = useGetSignatureMoveDetails(moveId);
  const [activeStep, setActiveStep] = useState(0);

  // AI Chat states
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ sender: "user" | "coach"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (moveDetails) {
      setChatLog([
        {
          sender: "coach",
          text: `Welcome to the Study Lab for ${moveDetails.playerName}'s ${moveDetails.moveName}! I can explain the physics, trajectory shapes, or target angles of this shot. What would you like to know?`
        }
      ]);
    }
  }, [moveDetails]);

  if (isLoading || !moveDetails) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        Loading tutorial guidelines...
      </div>
    );
  }

  // Parse reference pose trajectory frames to preview swing curves
  const refFrames = moveDetails.referencePoseSequenceJson
    ? JSON.parse(moveDetails.referencePoseSequenceJson)
    : [];

  const trajectoryData = refFrames.map((f: any, idx: number) => ({
    frame: idx + 1,
    time: f.timestamp.toFixed(2) + "s",
    wristY: (1.0 - (f.landmarks?.leftWrist?.y || f.landmarks?.rwri?.y || 0.5)).toFixed(3),
    elbowAngle: f.angles?.elbowAngle || 90,
    kneeAngle: f.angles?.kneeAngle || 135
  }));

  const stepsList = moveDetails.category === "batting" ? SHOT_STEPS.batting : SHOT_STEPS.bowling;

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatLog((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";
      const chatRes = await fetch(`${API_BASE_URL}/api/session/new/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `I am currently in the interactive learning tab studying ${moveDetails.playerName}'s ${moveDetails.moveName}. Category: ${moveDetails.category}. Focus Areas: ${moveDetails.focusAreas.join(", ")}. Describe how to perform it properly, focusing on joint alignments. User asks: ${userMsg}`,
          history: [],
          snapshots: []
        })
      });

      if (!chatRes.ok) throw new Error("Chat error");
      const data = await chatRes.json();
      setChatLog((prev) => [...prev, { sender: "coach", text: data.reply }]);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Assistant Offline",
        description: "Could not fetch AI coaching tutorial feedback."
      });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden flex flex-col">
      {/* Ambient decorative glows */}
      <div className="absolute top-[10%] left-[-120px] w-[320px] h-[320px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-120px] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="flex-grow container px-4 py-8 md:py-12 mt-16 max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* Navigation & Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-4 border-b">
          <div className="space-y-2">
            <Link href="/signature-moves" className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider cursor-pointer">
              <ArrowLeft className="h-3 w-3" />
              Signature Library
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Interactive Study Lab
            </h1>
            <p className="text-sm text-muted-foreground">
              Master the mechanics, angles, and pathways of <strong className="text-foreground">{moveDetails.playerName}</strong>'s signature technique.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setLocation(`/signature-setup/${moveId}`)}
            className="rounded-full px-8 h-12 font-bold text-sm shadow-md gap-2 shrink-0"
          >
            <Play className="h-4 w-4 fill-current" />
            Analyze Your Attempt
          </Button>
        </div>

        {/* Phase Step Guide & Joint Angle Targets Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Phase Stepper Card */}
          <Card className="glass border lg:col-span-2 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Compass className="h-4.5 w-4.5 text-primary" />
                Step-by-Step Mechanical Guide
              </CardTitle>
              <CardDescription className="text-xs">Click each phase tab below to study detailed muscle and joint posture guides.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-grow space-y-6">
              
              {/* Stepper Tabs */}
              <div className="flex flex-wrap gap-2 border-b pb-4">
                {stepsList.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border font-mono transition-all ${
                      activeStep === idx 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-muted/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Phase {idx + 1}
                  </button>
                ))}
              </div>

              {/* Step Display Area */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold text-foreground">{stepsList[activeStep].title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stepsList[activeStep].description}
                  </p>

                  <div className="border border-primary/20 bg-primary/5 rounded-2xl p-4 flex items-center gap-2.5">
                    <Target className="h-4.5 w-4.5 text-primary shrink-0" />
                    <span className="text-xs font-mono font-bold text-primary">
                      POSTURE METRIC TARGETS: <span className="text-foreground">{stepsList[activeStep].target}</span>
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Joint targets Info Deck */}
          <Card className="glass border shadow-sm">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-orange-500" />
                Target Alignment Thresholds
              </CardTitle>
              <CardDescription className="text-xs">Maintain joints within these ranges for maximum match scores.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 font-mono text-xs">
              <div className="border rounded-xl p-3 flex justify-between items-center">
                <span className="text-muted-foreground uppercase font-bold">Ideal Elbow Extension</span>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {moveDetails.category === 'batting' ? '145° - 155°' : '170° - 180°'}
                </Badge>
              </div>

              <div className="border rounded-xl p-3 flex justify-between items-center">
                <span className="text-muted-foreground uppercase font-bold">Ideal Knee Flexion</span>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {moveDetails.category === 'batting' ? '130° - 140°' : '155° - 165°'}
                </Badge>
              </div>

              <div className="border rounded-xl p-3 flex justify-between items-center">
                <span className="text-muted-foreground uppercase font-bold">Max Shoulder rotation</span>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {moveDetails.category === 'batting' ? '85° - 95°' : '75° - 85°'}
                </Badge>
              </div>

              <div className="border rounded-xl p-3 flex justify-between items-center">
                <span className="text-muted-foreground uppercase font-bold">Max Torso Spine Tilt</span>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {moveDetails.category === 'batting' ? '15° - 25°' : '25° - 35°'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trajectory preview & AI Coach Sandbox split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recharts Trajectory Preview */}
          <Card className="glass border lg:col-span-2 shadow-sm">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-primary" />
                Ideal Reference Trajectory Path
              </CardTitle>
              <CardDescription className="text-xs">Study the vertical wrist path height sequence of the professional technique.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trajectoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="frame" stroke="#888888" fontSize={9} />
                    <YAxis stroke="#888888" fontSize={9} domain={[0, 1.2]} />
                    <Tooltip wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Line 
                      name="Reference Wrist Height" 
                      type="monotone" 
                      dataKey="wristY" 
                      stroke="#0ea5e9" 
                      strokeWidth={3} 
                      dot={true} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Coach Aryan Study Sandbox */}
          <Card className="glass border shadow-sm flex flex-col h-[380px]">
            <CardHeader className="bg-muted/10 border-b pb-4 shrink-0">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-primary" />
                Ask Coach Aryan
              </CardTitle>
              <CardDescription className="text-xs">Ask questions about how to execute or set up this specific move.</CardDescription>
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
                      Aryan is explaining biomechanics...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            <div className="p-3 border-t bg-muted/5 shrink-0 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="Ask about Dhoni's bottom hand snap..."
                className="text-xs rounded-xl"
              />
              <Button onClick={handleSendChat} disabled={chatLoading} className="rounded-xl px-4 font-bold text-xs">
                Ask
              </Button>
            </div>
          </Card>

        </div>

      </main>
    </div>
  );
}
