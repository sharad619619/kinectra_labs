import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth_context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, User, Mail, Shield, UserCheck, School, Lock } from "lucide-react";
import { KinectraLogoSVG } from "@/components/layout/kinectra_logo";

export default function Auth() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"athlete" | "coach">("athlete");
  const [, setLocation] = useLocation();
  const { login, signup, loginWithGoogle, loginAsGuest } = useAuth();
  const { toast } = useToast();

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [sportsAcademy, setSportsAcademy] = useState("");
  const [sport, setSport] = useState<"cricket" | "badminton" | "basketball">("cricket");
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [dominantHand, setDominantHand] = useState<"right" | "left">("right");
  const [isLoading, setIsLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  useEffect(() => {
    const scriptId = "google-gsi-client";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initGoogleBtn = () => {
      setGsiLoaded(true);
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onload = initGoogleBtn;
      document.body.appendChild(script);
    } else {
      initGoogleBtn();
    }
  }, []);

  useEffect(() => {
    if (!gsiLoaded) return;

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn("VITE_GOOGLE_CLIENT_ID is not configured.");
        return;
      }

      // @ts-ignore
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          setIsLoading(true);
          try {
            const success = await loginWithGoogle(response.credential, role);
            if (success) {
              toast({
                title: "Welcome Back!",
                description: `Signed in successfully with Google as ${role === "coach" ? "Coach" : "Athlete"}.`,
              });
              setLocation(role === "coach" ? "/coach" : "/setup");
            } else {
              toast({
                title: "Authentication Failed",
                description: "Failed to authenticate with Google. Please try again.",
                variant: "destructive",
              });
            }
          } catch (e) {
            toast({
              title: "Authentication Error",
              description: "An unexpected error occurred during Google sign in.",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        },
      });

      // @ts-ignore
      window.google?.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { 
          theme: "filled_black", 
          size: "large", 
          width: "100%", 
          text: activeTab === "login" ? "signin_with" : "signup_with",
          shape: "rectangular" 
        }
      );
    } catch (err) {
      console.error("Error rendering Google Sign-In button:", err);
    }
  }, [gsiLoaded, activeTab, loginWithGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a username.",
        variant: "destructive",
      });
      return;
    }
    if (!password.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === "login") {
        const success = await login(username.trim(), password.trim(), role);
        if (success) {
          toast({
            title: "Welcome Back!",
            description: `Successfully signed in as ${username} (${role === "coach" ? "Coach" : "Athlete"}).`,
          });
          setLocation(role === "coach" ? "/coach" : "/setup");
        } else {
          toast({
            title: "Access Denied",
            description: "Invalid username or password. Please verify credentials.",
            variant: "destructive",
          });
        }
      } else {
        if (!email.trim() || !email.includes("@")) {
          toast({
            title: "Validation Error",
            description: "Please enter a valid email address.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const success = await signup(username.trim(), email.trim(), skillLevel, dominantHand, sportsAcademy.trim(), password.trim(), role);
        if (success) {
          localStorage.setItem("kinectra_sport", sport);
          toast({
            title: "Profile Created",
            description: `Your ${role === "coach" ? "Coach" : "Athlete"} account has been registered.`,
          });
          setLocation(role === "coach" ? "/coach" : "/setup");
        } else {
          toast({
            title: "Registration Failed",
            description: "This username or email is already taken.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Authentication Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = () => {
    loginAsGuest(role);
    toast({
      title: "Guest Session Started",
      description: `Entering dashboard as Guest ${role === "coach" ? "Coach" : "Athlete"}.`,
    });
    setLocation(role === "coach" ? "/coach" : "/setup");
  };


  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[110px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px] z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="flex flex-col items-center gap-2 group select-none">
            <KinectraLogoSVG className="w-12 h-12 transition-transform group-hover:scale-105" />
            <span className="font-extrabold tracking-tight text-foreground text-2xl">KINECTRA</span>
          </Link>
          <p className="text-muted-foreground text-sm mt-3">Biomechanical AI Pose Tracking & Performance Engine</p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/80 bg-card/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          <CardHeader className="pb-4">
            <div className="grid grid-cols-2 bg-background/80 p-1 rounded-xl border border-border mb-4">
              <button
                type="button"
                onClick={() => { setActiveTab("login"); }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "login"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("signup"); }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "signup"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Profile
              </button>
            </div>
            {/* Role Switch Select Dropdown */}
            <div className="relative mb-4 select-none">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Portal Target Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all [&>option]:bg-card"
              >
                <option value="athlete">Athlete Portal</option>
                <option value="coach">Coach Portal</option>
              </select>
            </div>
            
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {activeTab === "login" 
                ? (role === "coach" ? "Coach Portal Login" : "Welcome Athlete") 
                : (role === "coach" ? "Register Coach Profile" : "Register Profile")}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              {activeTab === "login" 
                ? (role === "coach" 
                    ? "Access your dashboard to review shared biometric sessions." 
                    : "Enter your athlete username to load your stats and calibration details.") 
                : (role === "coach"
                    ? "Register your credentials to audit and coach assigned athletes."
                    : "Configure your profile metadata to receive tailored joint stress metrics.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. virat_kohli"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/45 transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/45 transition-all"
                  required
                />
              </div>

              {/* Toggleable Sign Up fields */}
              <AnimatePresence initial={false} mode="wait">
                {activeTab === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="athlete@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/45 transition-all"
                        required={activeTab === "signup"}
                      />
                    </div>

                    {/* Sports Academy */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <School className="h-3.5 w-3.5" /> Sports Academy / Club
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. National Cricket Academy"
                        value={sportsAcademy}
                        onChange={(e) => setSportsAcademy(e.target.value)}
                        className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/45 transition-all"
                      />
                    </div>
                    
                    {/* Primary Sport Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" /> Primary Sport
                      </label>
                      <select
                        value={sport}
                        onChange={(e) => setSport(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all [&>option]:bg-card"
                      >
                        <option value="cricket">Cricket</option>
                        <option value="badminton">Badminton</option>
                        <option value="basketball">Basketball</option>
                      </select>
                    </div>

                    {/* Cricket Metadata Row */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Skill level */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" /> Skill Level
                        </label>
                        <select
                          value={skillLevel}
                          onChange={(e) => setSkillLevel(e.target.value as any)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all [&>option]:bg-card"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Elite / Pro</option>
                        </select>
                      </div>

                      {/* Dominant Hand */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5" /> Stance Hand
                        </label>
                        <select
                          value={dominantHand}
                          onChange={(e) => setDominantHand(e.target.value as any)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all [&>option]:bg-card"
                        >
                          <option value="right">Right Handed</option>
                          <option value="left">Left Handed</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl mt-6 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <Activity className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading 
                  ? "Authenticating..." 
                  : activeTab === "login" 
                    ? `Access ${role === "coach" ? "Coach" : "Athlete"} Dashboard` 
                    : `Create ${role === "coach" ? "Coach" : "Athlete"} Profile`}
              </Button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <span className="relative px-3 text-xs uppercase tracking-wider text-muted-foreground bg-card rounded-md">
                Or
              </span>
            </div>

            <div className="w-full flex flex-col gap-3 relative z-20">
              <div 
                id="google-signin-button" 
                className="w-full transition-transform hover:scale-[1.01] active:scale-[0.99]"
              />

              <Button
                type="button"
                onClick={handleGuestContinue}
                className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
              >
                <User className="h-4 w-4" />
                {role === "coach" ? "Continue as Guest Coach" : "Continue as Guest Athlete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
