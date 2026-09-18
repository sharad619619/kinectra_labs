import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Activity, CircleUserRound, Star, ChevronRight, Award, Zap, AwardIcon } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetSignatureMoves, useGetSignatureHistory } from "@workspace/api-client-react";

export default function SignatureLibrary() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "batting" | "bowling">("all");

  const { data: moves = [], isLoading } = useGetSignatureMoves();
  const { data: history = [] } = useGetSignatureHistory();

  const filteredMoves = moves.filter((m: any) => filter === "all" || m.category === filter);

  // Stats calculation
  const bestScore = history.length > 0 ? Math.max(...history.map((h: any) => h.score || 0)) : 0;
  const streak = history.length > 0 ? Math.min(history.length, 3) : 0;

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden flex flex-col">
      {/* Ambient background glows */}
      <div className="absolute top-[10%] left-[-100px] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-glow-drift z-0" />
      <div className="absolute bottom-[15%] right-[-100px] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-glow-drift z-0" style={{ animationDelay: "-4s" }} />

      <Navbar />

      <main className="flex-grow container px-4 py-8 md:py-12 mt-16 max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <Badge variant="outline" className="mb-3 px-3 py-1 text-primary border-primary/20 bg-primary/5 font-mono tracking-wider uppercase text-[10px]">
              Signature Moves Analysis
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
              Train Like The Greats
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
              Compare your posture, mechanics, and swing path directly against time-sequenced reference datasets of iconic professional techniques.
            </p>
          </div>

          {/* Gamification Stats */}
          <div className="flex gap-4 bg-card border rounded-2xl p-4 shadow-sm font-mono shrink-0">
            <div className="flex flex-col items-center px-4 border-r">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Analyzed</span>
              <span className="text-2xl font-black text-foreground">{history.length}</span>
            </div>
            <div className="flex flex-col items-center px-4 border-r">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Best Score</span>
              <span className="text-2xl font-black text-emerald-500">{bestScore || "-"}</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Streak</span>
              <span className="text-2xl font-black text-orange-500">🔥 {streak}</span>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex justify-center md:justify-start gap-2 mb-8">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
            className="rounded-full px-5 font-bold text-xs"
          >
            All Techniques
          </Button>
          <Button
            variant={filter === "batting" ? "default" : "outline"}
            onClick={() => setFilter("batting")}
            size="sm"
            className="rounded-full px-5 font-bold text-xs gap-1.5"
          >
            <CircleUserRound className="h-3.5 w-3.5" />
            Batting
          </Button>
          <Button
            variant={filter === "bowling" ? "default" : "outline"}
            onClick={() => setFilter("bowling")}
            size="sm"
            className="rounded-full px-5 font-bold text-xs gap-1.5"
          >
            <Activity className="h-3.5 w-3.5" />
            Bowling
          </Button>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <span className="text-xs font-mono">Loading Technique Library...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMoves.map((m: any) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass border hover:border-primary/40 transition-all duration-300 overflow-hidden flex flex-col h-full hover:shadow-lg group">
                  
                  {/* Decorative Banner/Graphic based on type */}
                  <div className={`h-24 relative overflow-hidden flex items-center justify-between px-6 border-b ${m.category === 'batting' ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5' : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/5'}`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-muted-foreground">
                        {m.category === "batting" ? "BATTING DISCIPLINE" : "BOWLING DISCIPLINE"}
                      </span>
                      <h3 className="font-extrabold text-xl leading-none mt-1">{m.moveName}</h3>
                    </div>
                    <Badge variant="outline" className={`font-mono text-[9px] uppercase px-2.5 py-1 ${m.difficulty === 'Hard' ? 'border-red-500/30 text-red-500 bg-red-500/5' : 'border-amber-500/30 text-amber-500 bg-amber-500/5'}`}>
                      {m.difficulty} Level
                    </Badge>
                  </div>

                  <CardHeader className="pt-5 pb-3">
                    <CardTitle className="text-sm font-bold text-muted-foreground font-mono flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      Player Reference: <span className="text-foreground">{m.playerName}</span>
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-2 text-foreground/80">
                      {m.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow pb-4">
                    <div className="border border-border/40 rounded-xl p-3 bg-muted/20 font-mono text-[10px] space-y-2.5">
                      <div className="font-bold text-muted-foreground uppercase text-[8px] tracking-widest border-b pb-1.5">
                        Biomechanical Target Focus
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-foreground/90">
                        {m.focusAreas?.map((focus: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span>{focus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-5 px-6 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                    <span className="text-[9px] font-bold font-mono text-muted-foreground uppercase">
                      Time-aligned Pose reference
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/signature-learn/${m.id}`)}
                      className="rounded-full px-5 font-bold text-xs gap-1 group-hover:scale-102 transition-transform shadow-sm"
                    >
                      Study & Train
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Inline Loader helper if lucide spinner not present
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
