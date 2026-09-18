import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Activity, CircleUserRound, Loader2, ArrowRight, Camera, UploadCloud, AlertTriangle } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth_context";

import { useStartSession } from "@workspace/api-client-react";
import { useSessionContext } from "@/contexts/SessionContext";

const setupSchema = z.object({
  athleteName: z.string().min(2, "Name must be at least 2 characters"),
  analysisType: z.enum(["bowling", "batting", "basketball", "badminton"]),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "professional"]),
  dominantHand: z.enum(["right", "left"]),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function Setup() {
  const [, setLocation] = useLocation();
  const { setConfig } = useSessionContext();
  const { toast } = useToast();
  const { user } = useAuth();

  const [analysisMode, setAnalysisMode] = useState<"live" | "upload">("live");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setVideoFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please upload a valid sports video file.",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };
  
  const primarySport = localStorage.getItem("kinectra_sport") || "cricket";

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      athleteName: user?.username || "",
      analysisType: primarySport === "badminton" ? "badminton" : primarySport === "basketball" ? "basketball" : "bowling",
      skillLevel: user?.skillLevel || "intermediate",
      dominantHand: user?.dominantHand || "right",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        athleteName: user.username,
        analysisType: primarySport === "badminton" ? "badminton" : primarySport === "basketball" ? "basketball" : "bowling",
        skillLevel: user.skillLevel as any,
        dominantHand: user.dominantHand,
      });
    }
  }, [user, form, primarySport]);

  const startSessionMutation = useStartSession();

  const onSubmit = async (data: SetupFormValues) => {
    if (analysisMode === "upload" && !videoFile) {
      toast({
        variant: "destructive",
        title: "Video Required",
        description: "Please upload a recorded video file before starting analysis.",
      });
      return;
    }

    startSessionMutation.mutate(
      { data },
      {
        onSuccess: (session) => {
          const videoUrl = videoFile ? URL.createObjectURL(videoFile) : null;
          setConfig({
            sessionId: session.id,
            athleteName: data.athleteName,
            analysisType: data.analysisType,
            skillLevel: data.skillLevel,
            dominantHand: data.dominantHand,
            analysisMode,
            videoFileUrl: videoUrl,
          });
          toast({
            title: "Session Created",
            description: analysisMode === "upload" ? "Processing uploaded video..." : "Initializing computer vision models...",
          });
          setLocation("/analysis");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Setup Failed",
            description: "Could not start analysis session. Please try again.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[10%] left-[-100px] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-glow-drift z-0" />
      <div className="absolute bottom-[10%] right-[-100px] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-glow-drift z-0" style={{ animationDelay: "-6s" }} />

      <Navbar />
      
      <main className="flex-1 container px-4 py-8 md:py-12 max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Configure Analysis</h1>
            <p className="text-muted-foreground">Select your discipline and parameters to initialize the computer vision engine.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Analysis Type */}
              <FormField
                control={form.control}
                name="analysisType"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-semibold">Discipline</FormLabel>
                    <FormControl>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(primarySport === "cricket" || primarySport === "all") && (
                          <>
                            <Card 
                              className={`cursor-pointer border-2 transition-all glass hover:shadow-lg ${field.value === 'bowling' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-transparent hover:border-primary/30'} `}
                              onClick={() => field.onChange("bowling")}
                            >
                              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
                                  <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Pace / Spin Bowling</h3>
                                <p className="text-sm text-muted-foreground">Analyze arm angles, spine tilt, and delivery stride biomechanics.</p>
                              </CardContent>
                            </Card>
                            
                            <Card 
                              className={`cursor-pointer border-2 transition-all glass hover:shadow-lg ${field.value === 'batting' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-transparent hover:border-primary/30'} `}
                              onClick={() => field.onChange("batting")}
                            >
                              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
                                  <CircleUserRound className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Batting Stance</h3>
                                <p className="text-sm text-muted-foreground">Track head stability, front foot planting, and bat lift angles.</p>
                              </CardContent>
                            </Card>
                          </>
                        )}

                        {(primarySport === "basketball" || primarySport === "all") && (
                          <Card 
                            className={`cursor-pointer border-2 transition-all glass hover:shadow-lg ${field.value === 'basketball' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-transparent hover:border-primary/30'} `}
                            onClick={() => field.onChange("basketball")}
                          >
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-4">
                                <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                              </div>
                              <h3 className="font-semibold text-lg mb-1">Basketball Shooting</h3>
                              <p className="text-sm text-muted-foreground">Track elbow alignment at set point, knee dip, and vertical release stabilization.</p>
                            </CardContent>
                          </Card>
                        )}

                        {(primarySport === "badminton" || primarySport === "all") && (
                          <Card 
                            className={`cursor-pointer border-2 transition-all glass hover:shadow-lg ${field.value === 'badminton' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-transparent hover:border-primary/30'} `}
                            onClick={() => field.onChange("badminton")}
                          >
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4">
                                <CircleUserRound className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                              <h3 className="font-semibold text-lg mb-1">Badminton Smash</h3>
                              <p className="text-sm text-muted-foreground">Track overhead reaching elbow extension, lunge leg stability, and recovery balance.</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Analysis Mode Options */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Analysis Mode</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Option 1: Live Camera */}
                  <Card 
                    className={`cursor-pointer border-2 transition-all glass hover:shadow-lg ${analysisMode === 'live' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-transparent hover:border-primary/30'} `}
                    onClick={() => setAnalysisMode("live")}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                      <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                        <Camera className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-base mb-1">Option 1: Live Analysis</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Start Camera for real-time browser-native pose tracking and instant technique scores.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Option 2: Upload Video */}
                  <Card 
                    className={`cursor-pointer border-2 transition-all glass hover:shadow-lg ${analysisMode === 'upload' ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-transparent hover:border-primary/30'} `}
                    onClick={() => setAnalysisMode("upload")}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                      <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4 text-primary">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-base mb-1">Option 2: Upload Video Analysis</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Select a pre-recorded sports video file to undergo high-precision biomechanics processing.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Conditional Video Upload Panel */}
              {analysisMode === "upload" && (
                <div className="space-y-4">
                  <Card className="border-border">
                    <CardContent className="p-6 space-y-4">
                      <Label className="text-base font-semibold block">Upload sports video file</Label>
                      
                      <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          For best results, upload a clear side-view or front-view video under 60 seconds. Max size: 100 MB.
                        </p>
                      </div>

                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="video/*" 
                          onChange={handleFileChange}
                          className="hidden" 
                        />
                        <UploadCloud className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                        {videoFile ? (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-primary">{videoFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Video loaded successfully
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Drag & Drop your video file here</p>
                            <p className="text-xs text-muted-foreground mb-4">Supported formats: MP4, MOV, AVI (Max 60s, 100MB)</p>
                            <Button type="button" variant="secondary" size="sm" className="rounded-xl px-5 font-semibold text-xs border border-primary/20">
                              Select Video Button
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl glass z-10 shadow-lg">
                <FormField
                  control={form.control}
                  name="athleteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Athlete Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Virat K." {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skillLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Level Benchmark</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dominantHand"
                  render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2">
                      <FormLabel>Dominant Hand / Stance</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0 border rounded-lg p-3 pr-6 bg-background">
                            <FormControl>
                              <RadioGroupItem value="right" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Right
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0 border rounded-lg p-3 pr-6 bg-background">
                            <FormControl>
                              <RadioGroupItem value="left" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Left
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={startSessionMutation.isPending}
                  className="w-full md:w-auto min-w-[200px]"
                >
                  {startSessionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      Start Engine <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

            </form>
          </Form>
        </motion.div>
      </main>
    </div>
  );
}
