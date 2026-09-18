import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/contexts/SessionContext";
import { AuthProvider, useAuth } from "@/context/auth_context";
import { Loader2 } from "lucide-react";
// Vercel deployment routing trigger
import Home from "@/pages/home";
import Setup from "@/pages/setup";
import Analysis from "@/pages/analysis";
import Results from "@/pages/results";
import Auth from "@/pages/auth";
import Coach from "@/pages/coach";
import NotFound from "@/pages/not-found";
import SignatureLibrary from "@/pages/signature-library";
import SignatureSetup from "@/pages/signature-setup";
import SignatureAnalysis from "@/pages/signature-analysis";
import SignatureResults from "@/pages/signature-results";
import SignatureLearn from "@/pages/signature-learn";

const queryClient = new QueryClient();

function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Route path={path} component={Component} />;
}

function AthleteRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (user.role === "coach") {
    return <Redirect to="/coach" />;
  }

  return <Route path={path} component={Component} />;
}

function CoachRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (user.role !== "coach") {
    return <Redirect to="/setup" />;
  }

  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <AthleteRoute path="/setup" component={Setup} />
      <AthleteRoute path="/analysis" component={Analysis} />
      <ProtectedRoute path="/results/:sessionId" component={Results} />
      <CoachRoute path="/coach" component={Coach} />
      <AthleteRoute path="/signature-moves" component={SignatureLibrary} />
      <AthleteRoute path="/signature-setup/:moveId" component={SignatureSetup} />
      <AthleteRoute path="/signature-learn/:moveId" component={SignatureLearn} />
      <AthleteRoute path="/signature-analysis/:moveId" component={SignatureAnalysis} />
      <ProtectedRoute path="/signature-results/:sessionId" component={SignatureResults} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SessionProvider>
            <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
              {/* Layer 1: Global Multi-Sports Action Background Image */}
              <div 
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
                style={{
                  backgroundImage: `url('/sports_hero_background.png')`,
                  filter: "brightness(0.65) contrast(1.15) saturate(1.2)",
                }}
              />

              {/* Layer 2: Global Radial Dot Grid & Vignette Overlay */}
              <div
                className="fixed inset-0 z-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                  backgroundSize: "36px 36px",
                  backgroundPosition: "0 0",
                }}
              />
              <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/60 via-background/40 to-background/75 pointer-events-none" />

              {/* Page Content */}
              <div className="relative z-10">
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
              </div>
            </div>
          </SessionProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
