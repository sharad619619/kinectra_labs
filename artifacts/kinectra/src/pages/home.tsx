import { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Camera,
  Cpu,
  BarChart2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Target,
  Shield,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth_context";

// ─── Animated cricket pose landmarks ──────────────────────────────
const JOINTS = [
  { id: "head",    cx: 160, cy: 52 },
  { id: "lsho",   cx: 130, cy: 90 },
  { id: "rsho",   cx: 190, cy: 88 },
  { id: "lelb",   cx: 104, cy: 128 },
  { id: "relb",   cx: 216, cy: 120 },
  { id: "lwri",   cx: 85,  cy: 162 },
  { id: "rwri",   cx: 240, cy: 100 },
  { id: "lhip",   cx: 140, cy: 168 },
  { id: "rhip",   cx: 182, cy: 168 },
  { id: "lkne",   cx: 128, cy: 220 },
  { id: "rkne",   cx: 190, cy: 216 },
  { id: "lank",   cx: 122, cy: 270 },
  { id: "rank",   cx: 196, cy: 268 },
];
const CONNECTIONS: Array<[string, string]> = [
  ["head","lsho"],["head","rsho"],
  ["lsho","rsho"],
  ["lsho","lelb"],["lelb","lwri"],
  ["rsho","relb"],["relb","rwri"],
  ["lsho","lhip"],["rsho","rhip"],
  ["lhip","rhip"],
  ["lhip","lkne"],["lkne","lank"],
  ["rhip","rkne"],["rkne","rank"],
];

function getJoint(id: string) {
  return JOINTS.find(j => j.id === id)!;
}

function CricketVisual() {
  const duration = 2.6;

  return (
    <div className="relative w-full flex items-center justify-center select-none">
      <svg viewBox="0 0 320 320" className="w-full max-w-[320px]" fill="none">
        <defs>
          <radialGradient id="ball-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid lines */}
        {[60, 120, 180, 240].map(y => (
          <line key={y} x1="20" y1={y} x2="300" y2={y} stroke="currentColor" className="text-border/20" strokeWidth="1" />
        ))}
        {[60, 120, 180, 240].map(x => (
          <line key={x} x1={x} y1="20" x2={x} y2="300" stroke="currentColor" className="text-border/20" strokeWidth="1" />
        ))}

        {/* Trajectory dashed guide line */}
        <path
          d="M 240,100 Q 190,200 150,268 Q 115,234 80,200"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* Connections */}
        {CONNECTIONS.map(([a, b], i) => {
          const ja = getJoint(a), jb = getJoint(b);
          return (
            <motion.line
              key={`${a}-${b}`}
              x1={ja.cx} y1={ja.cy}
              x2={jb.cx} y2={jb.cy}
              stroke="currentColor"
              className="text-primary"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.02, ease: "easeOut" }}
            />
          );
        })}

        {/* Joints */}
        {JOINTS.map((j, i) => (
          <motion.g key={j.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.03, type: "spring", stiffness: 300 }}
            style={{ transformOrigin: `${j.cx}px ${j.cy}px` }}
          >
            <circle cx={j.cx} cy={j.cy} r={4} fill="#ffffff" stroke="currentColor" className="text-primary" strokeWidth="1.5" />
            <circle cx={j.cx} cy={j.cy} r={1.5} fill="currentColor" className="text-primary" />
          </motion.g>
        ))}

        {/* Crease / Ground lines */}
        <line x1="60" y1="268" x2="100" y2="268" stroke="currentColor" className="text-muted-foreground/30" strokeWidth="1.2" />
        <line x1="220" y1="268" x2="260" y2="268" stroke="currentColor" className="text-muted-foreground/30" strokeWidth="1.2" />

        {/* Wickets / Stumps */}
        <motion.g
          animate={{
            skewX: [0, 0, 0, -8, 4, -2, 0, 0],
            translateX: [0, 0, 0, -2, 1, 0, 0, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 0.58, 0.62, 0.68, 0.74, 0.8, 1],
          }}
          style={{ transformOrigin: "80px 268px" }}
        >
          {/* Stumps */}
          <line x1="75" y1="200" x2="75" y2="268" stroke="currentColor" className="text-foreground/40" strokeWidth="2" strokeLinecap="round" />
          <line x1="80" y1="200" x2="80" y2="268" stroke="currentColor" className="text-foreground/50" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="85" y1="200" x2="85" y2="268" stroke="currentColor" className="text-foreground/40" strokeWidth="2" strokeLinecap="round" />

          {/* Left Bail */}
          <motion.line
            x1="74" y1="198" x2="80" y2="198"
            stroke="currentColor" className="text-primary" strokeWidth="1.8" strokeLinecap="round"
            animate={{
              y: [0, 0, 0, -24, -12, 12, 52, 52],
              x: [0, 0, 0, -14, -22, -30, -38, -38],
              rotate: [0, 0, 0, 90, 180, 270, 360, 360],
              opacity: [0.9, 0.9, 0.9, 0.9, 0.9, 0.6, 0, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "easeOut",
              times: [0, 0.5, 0.58, 0.65, 0.72, 0.8, 0.9, 1],
            }}
            style={{ transformOrigin: "77px 198px" }}
          />

          {/* Right Bail */}
          <motion.line
            x1="80" y1="198" x2="86" y2="198"
            stroke="currentColor" className="text-primary" strokeWidth="1.8" strokeLinecap="round"
            animate={{
              y: [0, 0, 0, -20, -6, 16, 52, 52],
              x: [0, 0, 0, 8, 16, 24, 30, 30],
              rotate: [0, 0, 0, -75, -150, -220, -300, -300],
              opacity: [0.9, 0.9, 0.9, 0.9, 0.9, 0.6, 0, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "easeOut",
              times: [0, 0.5, 0.58, 0.65, 0.72, 0.8, 0.9, 1],
            }}
            style={{ transformOrigin: "83px 198px" }}
          />
        </motion.g>

        {/* Pitch Impact Ripple Effect */}
        <motion.circle
          cx="150"
          cy="268"
          r={0}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="1.5"
          animate={{
            r: [0, 0, 12, 22, 28],
            opacity: [0, 0, 0.8, 0.4, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeOut",
            times: [0, 0.42, 0.46, 0.54, 0.62],
          }}
        />

        {/* Cricket Ball */}
        <motion.g
          animate={{
            x: [240, 240, 150, 80, 80],
            y: [100, 100, 268, 200, 200],
            scale: [0, 1.2, 0.8, 0.6, 0],
            opacity: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.12, 0.46, 0.58, 0.66],
          }}
        >
          <circle cx="0" cy="0" r="4.5" fill="#dc2626" />
          <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeWidth="0.7" strokeDasharray="1.2 0.8" />
        </motion.g>

        {/* Floating metric chips */}
        {[
          { x: 240, y: 70,  label: "ELBOW", value: "94°",  color: "text-primary" },
          { x: 20,  y: 150, label: "SPINE",  value: "12°",  color: "text-primary" },
          { x: 220, y: 250, label: "KNEE",   value: "143°", color: "text-primary" },
        ].map((chip, i) => (
          <motion.g key={chip.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.1, duration: 0.5 }}
          >
            <rect x={chip.x - 2} y={chip.y - 14} width={54} height={22} rx={4} fill="var(--card)" stroke="currentColor" className="text-border/40" strokeWidth="1" />
            <text x={chip.x + 25} y={chip.y - 6} textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize="7" fontFamily="monospace">{chip.label}</text>
            <text x={chip.x + 25} y={chip.y + 4} textAnchor="middle" fill="currentColor" className={chip.color} fontSize="9" fontWeight="bold" fontFamily="monospace">{chip.value}</text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

// ─── Fade-in section wrapper ───────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Rotating Text Component for Hero Headline ──────────────────────
function RotatingHeadlineText() {
  const words = [
    "Decoded in Real Time.",
    "Analyzed Frame-by-Frame.",
    "Elevated by Biomechanical AI.",
    "Scored for Peak Performance.",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-block relative h-[1.2em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="block bg-gradient-to-r from-primary via-amber-300 to-orange-400 bg-clip-text text-transparent font-semibold"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ─── Glowing Mouse Particle Trail Component ─────────────────────────
function MouseGlowTrail() {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

  return (
    <div
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
    >
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-primary/15 blur-[90px] pointer-events-none"
        animate={{
          x: mousePos.x - 160,
          y: mousePos.y - 160,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.5 }}
      />
      <motion.div
        className="absolute w-12 h-12 rounded-full border border-primary/40 pointer-events-none"
        animate={{
          x: mousePos.x - 24,
          y: mousePos.y - 24,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
      />
    </div>
  );
}

// ─── Home page ─────────────────────────────────────────────────────
export default function Home() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, loginAsGuest } = useAuth();

  const handleStartDemo = () => {
    if (!user) {
      loginAsGuest();
    }
    setLocation("/setup");
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative">
      <MouseGlowTrail />
      <Navbar />

      <main className="flex-1">

        {/* ── Hero ── */}
        <section id="hero" className="relative min-h-screen flex items-center overflow-hidden pt-16">
          <div className="container relative z-10 mx-auto px-4 md:px-6 py-16 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left: copy */}
            <div className="space-y-8">

              <div className="space-y-5">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.08 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground leading-[1.08]"
                >
                  Sports Technique,
                  <br />
                  <span className="text-primary font-light">Decoded in Real Time.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.16 }}
                  className="text-lg text-muted-foreground max-w-xl leading-relaxed"
                >
                  KINECTRA tracks 33 body landmarks via your webcam, calculates joint angles frame-by-frame, and scores sports technique against elite biomechanical baselines — no wearables, no uploads, no latency.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link href="/setup">
                  <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-none rounded-xl gap-2">
                    Start Free Analysis <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Button onClick={handleStartDemo} variant="outline" size="lg" className="h-12 px-8 text-base font-semibold border-border/80 text-foreground hover:bg-muted/40 gap-2 rounded-xl">
                  Try Live Demo <Zap className="h-4 w-4" />
                </Button>

                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="h-12 px-8 text-base font-medium border border-border rounded-xl hover:bg-muted/50 transition-colors text-foreground/70 hover:text-foreground"
                >
                  How It Works
                </button>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex items-center gap-6 text-xs font-mono text-muted-foreground"
              >
                {[
                  { icon: <Zap className="h-3.5 w-3.5" />, text: "SUB-100MS LATENCY" },
                  { icon: <Shield className="h-3.5 w-3.5" />, text: "NO DATA LEAVES DEVICE" },
                  { icon: <Target className="h-3.5 w-3.5" />, text: "33 POSE LANDMARKS" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    {icon}
                    <span>{text}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: animated 3D perspective skeleton */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative perspective-1000"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                e.currentTarget.style.transform = `rotateY(${x / 25}deg) rotateX(${-y / 25}deg) scale(1.02)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "rotateY(0deg) rotateX(0deg) scale(1)";
              }}
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 0.15s ease-out",
              }}
            >
              <div 
                className="relative rounded-2xl bg-card/75 backdrop-blur-xl border border-primary/40 p-6 shadow-2xl overflow-hidden ring-1 ring-primary/20"
                style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
              >
                <div className="absolute top-3 right-3 text-[9px] font-mono text-primary uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  3D POSE TELEMETRY
                </div>

                <div className="mt-6" style={{ transform: "translateZ(40px)" }}>
                  <CricketVisual />
                </div>

                {/* Bottom status bar */}
                <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-muted-foreground/80 font-semibold" style={{ transform: "translateZ(20px)" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    TRACKING ACTIVE
                  </div>
                  <span>15 FPS · BROWSER GPU</span>
                </div>
              </div>

              {/* 3D Floating Score Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="absolute -right-4 top-16 bg-card/90 backdrop-blur-xl rounded-xl shadow-2xl border border-primary/50 px-4 py-3 min-w-[140px] hidden lg:block ring-1 ring-white/10"
                style={{ transform: "translateZ(60px) rotateY(-5deg)" }}
              >
                <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Technique Score</p>
                <p className="text-3xl font-bold text-foreground font-mono">87<span className="text-sm text-muted-foreground font-normal">/100</span></p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "87%" }}
                    transition={{ delay: 1.8, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.6 }}
          >
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Scroll</span>
            <motion.div
              className="w-px h-8 bg-gradient-to-b from-primary/60 to-transparent"
              animate={{ scaleY: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-24 md:py-32 bg-muted/30 border-y border-border/40">
          <div className="container mx-auto px-4 md:px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">The Process</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Four steps from camera to coaching.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything runs in your browser using WebAssembly. No server, no upload, no delay.
              </p>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HOW_IT_WORKS.map((step, i) => (
                <FadeIn key={step.title} delay={i * 0.08}>
                  <HowItWorksCard {...step} step={i + 1} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── Demo ── */}
        <section id="demo" className="py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Live Preview</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What an analysis looks like.</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                Real output from an actual analysis session. This is exactly what you'll see.
              </p>
            </FadeIn>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {/* Technique score */}
              <FadeIn delay={0.05}>
                <DemoCard title="Technique Score" icon={<Zap className="h-4 w-4 text-primary" />}>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-5xl font-bold font-mono text-primary">87</span>
                    <span className="text-muted-foreground text-lg">/100</span>
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: "87%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Above average — elite threshold is 90+</p>
                </DemoCard>
              </FadeIn>

              {/* Joint angles */}
              <FadeIn delay={0.1}>
                <DemoCard title="Biomechanics" icon={<BarChart2 className="h-4 w-4 text-primary" />}>
                  <div className="space-y-3 mt-2">
                    {DEMO_METRICS.map(m => (
                      <div key={m.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className={`font-mono font-semibold ${m.ok ? "text-emerald-600" : "text-primary"}`}>
                            {m.value}°
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${m.ok ? "bg-emerald-500" : "bg-primary"}`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${m.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 + m.pct / 200 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </DemoCard>
              </FadeIn>

              {/* Diagnostic alerts */}
              <FadeIn delay={0.15}>
                <DemoCard title="Diagnostic Alerts" icon={<AlertTriangle className="h-4 w-4 text-primary" />}>
                  <div className="space-y-2 mt-2">
                    <AlertRow ok={false} text="Elbow angle slightly low (86°)" />
                    <AlertRow ok={true} text="Balance within optimal range" />
                    <AlertRow ok={true} text="Shoulder rotation correct" />
                    <AlertRow ok={true} text="Spine tilt within tolerance" />
                  </div>
                </DemoCard>
              </FadeIn>
            </div>

            <FadeIn delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
              <Link href="/setup">
                <Button size="lg" className="h-12 px-10 text-base font-semibold shadow-lg shadow-primary/20 gap-2">
                  Run Your Analysis <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={handleStartDemo} variant="outline" size="lg" className="h-12 px-10 text-base font-semibold border-primary/30 text-primary hover:bg-primary/5 gap-2">
                Try Live Demo <Zap className="h-4 w-4" />
              </Button>
            </FadeIn>

          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-24 md:py-32 bg-muted/20 border-t border-border/40 relative">
          <div className="container mx-auto px-4 md:px-6">
            <FadeIn className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                Choose the telemetry tier designed for your training level. Start free, go pro when you are ready.
              </p>
            </FadeIn>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
              {/* Card 1: Free */}
              <FadeIn delay={0.05} className="flex">
                <div className="group flex-1 bg-card/65 backdrop-blur-md border border-border/60 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Free Plan</h3>
                    <p className="text-xs text-muted-foreground mt-1">For casual training checks</p>
                    <div className="flex items-baseline gap-1 mt-4 mb-6">
                      <span className="text-4xl font-extrabold text-foreground">₹0</span>
                      <span className="text-xs text-muted-foreground">/ forever</span>
                    </div>
                    <ul className="space-y-3 text-xs text-muted-foreground list-none pl-0">
                      <li className="flex items-center gap-2 font-medium text-foreground"><span className="text-primary font-bold">•</span> Real-time webcam tracking</li>
                      <li className="flex items-center gap-2"><span className="text-primary">•</span> Sub-100ms local analysis</li>
                      <li className="flex items-center gap-2"><span className="text-primary">•</span> Joint angle vector math</li>
                      <li className="flex items-center gap-2 text-muted-foreground/50"><span className="text-muted-foreground/30">•</span> No permanent cloud storage</li>
                      <li className="flex items-center gap-2 text-muted-foreground/50"><span className="text-muted-foreground/30">•</span> No progress tracker charts</li>
                    </ul>
                  </div>
                  <Link href="/setup" className="mt-8">
                    <Button variant="outline" className="w-full h-11 rounded-xl font-semibold shadow-none group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">Get Started</Button>
                  </Link>

                </div>
              </FadeIn>

              {/* Card 2: Pro (Featured) */}
              <FadeIn delay={0.1} className="flex">
                <div className="group flex-1 bg-card/80 backdrop-blur-md border-2 border-primary rounded-2xl p-6 flex flex-col justify-between relative shadow-lg shadow-primary/10 transition-all duration-300 hover:-translate-y-2.5 hover:shadow-2xl hover:shadow-primary/25 hover:border-primary overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-orange-400 to-primary" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-mono text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    MOST POPULAR
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Pro Athlete</h3>
                    <p className="text-xs text-muted-foreground mt-1">For dedicated players</p>
                    <div className="flex items-baseline gap-1 mt-4 mb-6">
                      <span className="text-4xl font-extrabold text-foreground">₹199</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                    <ul className="space-y-3 text-xs text-foreground/90 list-none pl-0">
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> <strong>All Free Features</strong></li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Permanent Cloud Session Storage</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Actual Stance Photo Comparisons</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> 7-Day Performance Charts</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Unlimited Gemini AI Coach Reports</li>
                    </ul>
                  </div>
                  <Link href="/auth" className="mt-8">
                    <Button className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 group-hover:scale-[1.02] transition-transform">Go Pro</Button>
                  </Link>
                </div>
              </FadeIn>

              {/* Card 3: Plus */}
              <FadeIn delay={0.15} className="flex">
                <div className="group flex-1 bg-card/65 backdrop-blur-md border border-border/60 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Plus (Coaches)</h3>
                    <p className="text-xs text-muted-foreground mt-1">For clubs & academies</p>
                    <div className="flex items-baseline gap-1 mt-4 mb-6">
                      <span className="text-4xl font-extrabold text-foreground">₹3,999</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                    <ul className="space-y-3 text-xs text-muted-foreground list-none pl-0">
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> <strong>All Pro Features</strong></li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Multi-Athlete Portals (Up to 50)</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Coach Review Commentary overlays</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> High-Def video uploads (up to 200MB)</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Telemetry vector database export</li>
                    </ul>
                  </div>
                  <Link href="/auth" className="mt-8">
                    <Button variant="outline" className="w-full h-11 rounded-xl font-semibold shadow-none group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">Get Plus</Button>
                  </Link>
                </div>
              </FadeIn>

              {/* Card 4: Enterprise */}
              <FadeIn delay={0.2} className="flex">
                <div className="group flex-1 bg-card/65 backdrop-blur-md border border-border/60 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Enterprise</h3>
                    <p className="text-xs text-muted-foreground mt-1">For professional institutions</p>
                    <div className="flex items-baseline gap-1 mt-4 mb-6">
                      <span className="text-4xl font-extrabold text-foreground">Custom</span>
                      <span className="text-xs text-muted-foreground">/ tailored contract</span>
                    </div>
                    <ul className="space-y-3 text-xs text-muted-foreground list-none pl-0">
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> <strong>All Plus Features</strong></li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Multi-Angle Video Synchronization</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Bespoke baseline threshold models</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> White-label academy dashboard hosting</li>
                      <li className="flex items-center gap-2"><span className="text-primary font-bold">•</span> Dedicated sports biomechanics consulting</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => setIsContactOpen(true)}
                    className="mt-8 w-full h-11 rounded-xl font-semibold border border-border bg-transparent text-sm text-foreground/80 hover:bg-primary/10 hover:border-primary/40 hover:text-foreground transition-all"
                  >
                    Contact Biomechanics Team
                  </button>
                </div>
              </FadeIn>

            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-16 bg-muted/20 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Logo info */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary/15 rounded-lg flex items-center justify-center">
                  <span className="text-primary font-bold font-mono text-xs">K</span>
                </div>
                <span className="font-semibold text-foreground tracking-wider">KINECTRA</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                Built for the elite. Engineered for the driven. Decoded sports telemetry in browser runtime.
              </p>
            </div>

            {/* Column 1: Product */}
            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs flex flex-col items-start">
                <li><button onClick={() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer">Features</button></li>
                <li><button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer">How It Works</button></li>
                <li><button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer">Pricing</button></li>
                <li><button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })} className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer">Demo Preview</button></li>
              </ul>
            </div>

            {/* Column 2: Company */}
            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-xs flex flex-col items-start">
                <li><button onClick={() => setIsAboutOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer">About Us</button></li>
                <li><button onClick={() => setIsContactOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none p-0 cursor-pointer">Contact Us</button></li>
                <li><Link href="/setup" className="text-muted-foreground hover:text-foreground transition-colors">Product Staging</Link></li>

              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground flex flex-col items-start">
                <li className="hover:text-foreground transition-colors cursor-default">Privacy Policy</li>
                <li className="hover:text-foreground transition-colors cursor-default">Terms of Service</li>
                <li className="hover:text-foreground transition-colors cursor-default">Security Standards</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Kinectra Biomechanical Systems. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── About Us Modal ── */}
      <AnimatePresence>
        {isAboutOpen && (
          <>
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setIsAboutOpen(false)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/80 rounded-2xl p-6 w-full max-w-[480px] shadow-2xl relative pointer-events-auto"
              >
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none"
                >
                  ✕
                </button>
                <h3 className="text-lg font-bold text-foreground mb-3">About Kinectra Sports</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Kinectra is founded by a passionate cohort of cricket biomechanics engineers and machine learning developers. 
                  Our goal is to democratize elite athletic coaching by making computer vision telemetry accessible to every bowler and batter in the world—without needing expensive laboratory cameras or wearable sensor harnesses.
                </p>
                <div className="flex justify-between items-center bg-muted/30 border p-3 rounded-xl">
                  <span className="text-xs font-semibold text-muted-foreground">FOUNDED IN</span>
                  <span className="text-primary font-bold text-xs">2026</span>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Contact Us Modal ── */}
      <AnimatePresence>
        {isContactOpen && (
          <>
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setIsContactOpen(false)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/80 rounded-2xl p-6 w-full max-w-[480px] shadow-2xl relative pointer-events-auto"
              >
                <button 
                  onClick={() => setIsContactOpen(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none"
                >
                  ✕
                </button>
                <h3 className="text-lg font-bold text-foreground mb-3">Contact Biomechanics Team</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Interested in setting up Kinectra Plus for your sports academy or custom integrations? Drop us your message.
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setIsContactOpen(false);
                  alert("Thank you! Our biomechanics consultancy team will contact you in 24 hours.");
                }} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex text-left">Email Address</label>
                    <input required type="email" placeholder="coach@academy.com" className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex text-left">Message / Academy Info</label>
                    <textarea required rows={3} placeholder="Tell us about your team size..." className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
                  </div>
                  <Button type="submit" className="w-full h-10 rounded-xl font-semibold mt-2">Submit Query</Button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    icon: <Camera className="h-6 w-6 text-primary" />,
    title: "Camera Capture",
    description: "Your webcam streams live video directly into a WebAssembly runtime — no upload, no server, no latency.",
  },
  {
    icon: <Cpu className="h-6 w-6 text-primary" />,
    title: "Pose Detection",
    description: "MediaPipe Pose detects 33 anatomical landmarks every frame, including elbows, knees, hips, and spine.",
  },
  {
    icon: <BarChart2 className="h-6 w-6 text-primary" />,
    title: "Motion Analysis",
    description: "Joint angles are calculated from 3D landmark vectors using real trigonometry. Bowling and batting modes use different thresholds.",
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-primary" />,
    title: "Technique Feedback",
    description: "A weighted score (posture 30%, alignment 25%, stability 25%, efficiency 20%) with actionable warnings and session recommendations.",
  },
];

const DEMO_METRICS = [
  { label: "Elbow Angle", value: 86, pct: 48, ok: false },
  { label: "Knee Angle",  value: 143, pct: 80, ok: true  },
  { label: "Spine Tilt",  value: 11, pct: 18, ok: true  },
  { label: "Shoulder",    value: 8,  pct: 12, ok: true  },
];

// ─── Sub-components ───────────────────────────────────────────────

function HowItWorksCard({
  icon, title, description, step,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  step: number;
}) {
  return (
    <div className="group relative bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 cursor-default overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-4 right-4 text-[10px] font-bold font-mono text-muted-foreground/30 group-hover:text-primary/70 transition-colors">
        {String(step).padStart(2, "0")}
      </div>
      <div className="w-12 h-12 rounded-xl bg-muted/80 flex items-center justify-center mb-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-base font-bold tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function DemoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <h3 className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function AlertRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs py-2 border-b border-border/30 last:border-0 ${
      ok ? "text-emerald-600" : "text-orange-500"
    }`}>
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {text}
    </div>
  );
}
