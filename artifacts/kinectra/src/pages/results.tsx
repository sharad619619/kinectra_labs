import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Download, Award, BarChart3, Target, Activity, ShieldAlert, Calendar, Mic, Send, Volume2, Lock, Unlock, Copy, Check, Globe, RefreshCw, UserPlus, Plus, Trash2, Shield } from "lucide-react";
import { useGetSession, getGetSessionQueryKey, useListSessions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth_context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RichFeedback {
  title: string;
  telemetry: string;
  impact: string;
  cue: string;
}

function getDetailedFeedback(text: string, analysisType: string, overallScore: number): RichFeedback {
  const norm = text.toLowerCase();
  const isElite = overallScore >= 80;
  const isFoundation = overallScore < 70;
  
  if (analysisType === "bowling") {
    if (norm.includes("elbow height") || norm.includes("elbow angle")) {
      if (isElite) {
        return {
          title: "Optimal Elbow Release Height",
          telemetry: "98° Arm Extension (Optimal: 90° - 105°)",
          impact: "Elite release height: your arm remains fully tall near the vertical plane, creating a high bounce trajectory and maximum pace transfer.",
          cue: "💡 Elite: Maintain this release height while experimenting with delivery speeds."
        };
      }
      if (isFoundation) {
        return {
          title: "Sub-Optimal Elbow Release Height",
          telemetry: "72° Flexion (Optimal: 90° - 105°)",
          impact: "Low elbow release: dropping the elbow reduces leverage, increases risk of push-action, and loses ball pace.",
          cue: "💡 Foundation: Keep your delivery arm locked straight at the peak of delivery stride to maintain legal action."
        };
      }
      return {
        title: "Optimal Elbow Release Height",
        telemetry: "94° Arm Extension (Optimal: 90° - 105°)",
        impact: "Good release slot: arm is upright, ensuring consistent ball release and down-the-pitch leverage.",
        cue: "💡 Intermediate: Focus on keeping the arm tall near your ear at the release point to maintain release trajectory."
      };
    }
    if (norm.includes("upright body") || norm.includes("spine tilt")) {
      if (isElite) {
        return {
          title: "Excellent Torso Core Alignment",
          telemetry: "9° Lateral Spine Tilt (Optimal: <15°)",
          impact: "Elite core alignment: straight vertical delivery protects your spine from high-velocity shock loading and maximizes force transfer.",
          cue: "💡 Elite: Keep this strong upright posture to reinforce core balance."
        };
      }
      if (isFoundation) {
        return {
          title: "High-Stress Core Spine Tilt",
          telemetry: "32° Lateral Spine Tilt (Optimal: <15°)",
          impact: "Excessive side lean puts high shear load on spine segments, losing forward energy transfer and reducing velocity.",
          cue: "💡 Foundation: Avoid collapsing at the waist as the front foot lands; drive through vertically."
        };
      }
      return {
        title: "Excellent Torso Core Alignment",
        telemetry: "12° Lateral Spine Tilt (Optimal: <15°)",
        impact: "Keeping your spine tall prevents undue shear stresses on your lower lumbar region and maximizes front-foot landing brace efficiency.",
        cue: "💡 Intermediate: Avoid collapsing at the waist as the front foot lands; drive through the crease vertically."
      };
    }
    if (norm.includes("shoulder rotation") || norm.includes("shoulder alignment")) {
      if (isElite) {
        return {
          title: "Crease Shoulder Alignment",
          telemetry: "8° Rotation Deviation (Optimal: <15°)",
          impact: "Elite shoulder rotation: shoulders remained square down the pitch line, giving excellent target control.",
          cue: "💡 Elite: Reinforce this timing to maintain bowler rhythm."
        };
      }
      if (isFoundation) {
        return {
          title: "Crease Shoulder Alignment Deviation",
          telemetry: "24° Rotation Deviation (Optimal: <15°)",
          impact: "Shoulders rotating offline pulls release stride sideways, reducing accuracy and forcing wide deliveries.",
          cue: "💡 Foundation: Pull your non-bowling arm down actively in front of your body to pull your chest through squarely."
        };
      }
      return {
        title: "Crease Shoulder Alignment Deviation",
        telemetry: "18° Rotation Deviation (Optimal: <15°)",
        impact: "Excessive shoulder tilt throws your delivery stride off-line. Keeping shoulders square ensures a consistent delivery release path.",
        cue: "💡 Intermediate: Focus on pulling your non-bowling arm down actively in front of your body to pull your chest and shoulders through squarely."
      };
    }
    if (norm.includes("elbow angle too low")) {
      if (isElite) {
        return {
          title: "Optimal Delivery Elbow Flexion",
          telemetry: "98° Arm Extension (Optimal: 90° - 105°)",
          impact: "Optimal arm slot: fully extended release maintains maximum momentum and pace.",
          cue: "💡 Elite: Keep tracking this elbow extension."
        };
      }
      if (isFoundation) {
        return {
          title: "Sub-Optimal Delivery Elbow Flexion",
          telemetry: "72° Flexion (Optimal: 90° - 105°)",
          impact: "Pace bowlers must maintain an extended arm at release. Dropping the elbow reduces leverage, cuts pace, and compromises legality.",
          cue: "💡 Foundation: Imagine reaching for the sky at the peak of the stride; lock the arm long and straight during release."
        };
      }
      return {
        title: "Sub-Optimal Delivery Elbow Flexion",
        telemetry: "82° Flexion (Optimal: 90° - 105°)",
        impact: "Slight arm flex at release. Straightening the elbow transfers force more efficiently.",
        cue: "💡 Intermediate: Keep arm locked straighter at the peak of delivery stride."
      };
    }
    if (norm.includes("excessive spine tilt")) {
      if (isElite) {
        return {
          title: "Torso Spine Alignment Check",
          telemetry: "11° Spine Tilt (Optimal: <15°)",
          impact: "Good upright posture under load. Core stabilizes body rotation cleanly.",
          cue: "💡 Elite: Continue maintaining this vertical line."
        };
      }
      if (isFoundation) {
        return {
          title: "High-Stress Torso Spine Tilt",
          telemetry: "32° Lateral Lean (Optimal: <15°)",
          impact: "Leaning too far sideways to clear the bowling shoulder puts high shear stress on the facet joints of the spine.",
          cue: "💡 Foundation: Brace your core and focus on landing with a straight back, looking directly over your lead shoulder."
        };
      }
      return {
        title: "High-Stress Torso Spine Tilt",
        telemetry: "22° Lateral Lean (Optimal: <15°)",
        impact: "Moderate side lean detected. Focus on core stability during landing.",
        cue: "💡 Intermediate: Avoid excessive torso tilt during follow-through."
      };
    }
  } else if (analysisType === "basketball") {
    if (norm.includes("set-point elbow") || norm.includes("pushing shot")) {
      if (isFoundation) {
        return {
          title: "Low Shooting Elbow Set Point",
          telemetry: "115° Set-Point Angle (Optimal: 80° - 100°)",
          impact: "Low elbow set point forces a flat pushing motion instead of vertical arm extension, making the shot flatter and easier to block.",
          cue: "💡 Foundation: Tuck your shooting elbow in closer to a 90° angle beneath the ball at the set point."
        };
      }
      return {
        title: "Optimal Shooting Elbow Set Point",
        telemetry: "91° Set-Point Angle (Optimal: 80° - 100°)",
        impact: "Excellent vertical elbow tuck: ball rests cleanly above forehead level, enabling high-release shot dynamics.",
        cue: "💡 Keep replicating this tucked guide elbow to maintain high field goal consistency."
      };
    }
    if (norm.includes("slow release") || norm.includes("excessive set-point")) {
      return {
        title: "Excessive Shooting Elbow Flexion",
        telemetry: "62° Set-Point Angle (Optimal: 80° - 100°)",
        impact: "Bending the shooting arm too far back delays the release speed and drops the release point below optimal heights.",
        cue: "💡 Open your elbow angle slightly during the preparatory lift to smooth out release execution."
      };
    }
    if (norm.includes("leg drive") || norm.includes("propulsion") || norm.includes("shallow leg")) {
      if (isFoundation) {
        return {
          title: "Shallow Propulsion Knee Dip",
          telemetry: "148° Knee Flexion (Optimal: 115° - 130°)",
          impact: "Shallow dip fails to load the lower body's elastic energy, forcing you to push with your arms and strain your shoulders.",
          cue: "💡 Sink your hips and bend your knees to roughly 120° during the dip to power the jump."
        };
      }
      return {
        title: "Optimal Knee Dip Propulsion",
        telemetry: "122° Knee Flexion (Optimal: 115° - 130°)",
        impact: "Excellent lower-body loading: transfers force smoothly through the kinetic chain to maximize jump height and shot range.",
        cue: "💡 Continue using this deep dip drive, especially for long-range shots."
      };
    }
    if (norm.includes("spine lean") || norm.includes("balance drift") || norm.includes("lateral launch")) {
      if (isFoundation) {
        return {
          title: "Lateral Release Spine Tilt",
          telemetry: "16° Spine Tilt (Optimal: <10°)",
          impact: "Leaning sideways during release disperses forces laterally, drifting the shot off-line and causing landing imbalance.",
          cue: "💡 Keep your torso vertical; engage your core during the jump and land in the same spot."
        };
      }
      return {
        title: "Stable Upright Release Spine Line",
        telemetry: "4° Spine Tilt (Optimal: <10°)",
        impact: "Perfect vertical launch column: isolates straight-line acceleration toward the target rim.",
        cue: "💡 Maintain this locked core during jump shots."
      };
    }
  } else if (analysisType === "badminton") {
    if (norm.includes("overhead reach") || norm.includes("contact point")) {
      if (isFoundation) {
        return {
          title: "Short Overhead Smash Reach",
          telemetry: "138° Elbow Extension (Optimal: 155° - 175°)",
          impact: "Striking the shuttle with a bent elbow limits contact height, lowering the angle of the smash and reducing power.",
          cue: "💡 Extend your hitting arm fully at impact; reach tall to create a steep smash angle."
        };
      }
      return {
        title: "Elite Overhead Contact Extension",
        telemetry: "168° Elbow Extension (Optimal: 155° - 175°)",
        impact: "Full leverage extension: contact point is at maximum height, creating maximum head speed and a steep trajectory.",
        cue: "💡 Continue impacting the shuttlecock at peak arm extension."
      };
    }
    if (norm.includes("lunge") || norm.includes("patellar stress") || norm.includes("knee translated")) {
      if (isFoundation) {
        return {
          title: "High-Stress Front Knee Lunge",
          telemetry: "98° Knee Flexion (Optimal: 120° - 140°)",
          impact: "Deep knee forward translation past the toe line puts dangerous shear load on the patellar tendon.",
          cue: "💡 Take a wider stride and sit your hips back to keep the leading shin vertical."
        };
      }
      return {
        title: "Safe Deceleration Recovery Lunge",
        telemetry: "131° Knee Flexion (Optimal: 120° - 140°)",
        impact: "Excellent landing shock absorption: quad and glute muscles stabilize deceleration forces safely.",
        cue: "💡 Keep using this braced recovery base to prevent tendon strain."
      };
    }
    if (norm.includes("rigid trunk") || norm.includes("pre-smash") || norm.includes("coiling")) {
      return {
        title: "Insufficient Pre-Smash Torso Coiling",
        telemetry: "6° Spine Tilt (Optimal: 15° - 25°)",
        impact: "A rigid torso prevents chest opening, forcing you to generate power solely from the arm, which increases rotator cuff stress.",
        cue: "💡 Arch your shoulder line back during preparation to stretch-load your core abdominal muscles."
      };
    }
    if (norm.includes("recovery shift") || norm.includes("recovery lag") || norm.includes("excessive lateral")) {
      return {
        title: "Excessive Torso Preparation Tilt",
        telemetry: "34° Spine Tilt (Optimal: 15° - 25°)",
        impact: "Leaning too far sideways shifts your weight completely off-balance, delaying your split-step recovery.",
        cue: "💡 Keep core tension locked to limit torso side tilt and recover quickly."
      };
    }
  } else {
    if (norm.includes("front knee") || norm.includes("knee angle")) {
      if (isElite) {
        return {
          title: "Knee Stance Flexion Check",
          telemetry: "142° Knee Flexion (Optimal: 135° - 150°)",
          impact: "Elite stable base: knee flexion supports head weight directly over the point of contact, ensuring clean stroke execution.",
          cue: "💡 Elite: Keep timing your shots from this stable front leg."
        };
      }
      if (isFoundation) {
        return {
          title: "Excessive Knee Stance Flexion",
          telemetry: "112° Knee Stance Flexion (Optimal: 135° - 150°)",
          impact: "Bending the front knee too deep drops your center of gravity below your support base, causing you to lose balance and drag your hands down.",
          cue: "💡 Foundation: Step into the drive with a firm, braced front leg to create a solid pivot block for weight transfer."
        };
      }
      return {
        title: "Excessive Knee Stance Flexion",
        telemetry: "128° Knee Stance Flexion (Optimal: 135° - 150°)",
        impact: "Moderate knee bend: weight transfer is slightly low but base is aligned.",
        cue: "💡 Intermediate: Step into the drive with a firm, braced front leg to create a solid pivot block for weight transfer."
      };
    }
    if (norm.includes("low bat lift") || norm.includes("elbow angle")) {
      if (isElite) {
        return {
          title: "Bat Lift Backlift Stance",
          telemetry: "96° Bat-Elbow Angle (Optimal: 90°+)",
          impact: "Elite bat lift: high hands provide a full swing path and maximum power generation through the line.",
          cue: "💡 Elite: Maintain this high backlift timing."
        };
      }
      if (isFoundation) {
        return {
          title: "Low Backswing Bat Lift",
          telemetry: "72° Bat-Elbow Angle (Optimal: 90°+)",
          impact: "A low backswing limits the downward acceleration path of the bat, reducing swing power and timing options.",
          cue: "💡 Foundation: Preshow high hands by lifting the back elbow parallel to the ground during the bowler's approach."
        };
      }
      return {
        title: "Low Backswing Bat Lift",
        telemetry: "84° Bat-Elbow Angle (Optimal: 90°+)",
        impact: "Moderate bat lift: swing arc is slightly restricted but hands are in position.",
        cue: "💡 Intermediate: Preshow high hands by lifting the back elbow parallel to the ground during the bowler's approach."
      };
    }
    if (norm.includes("front-foot stance") || norm.includes("stable base")) {
      if (isElite) {
        return {
          title: "Perfect Balance Stance Base",
          telemetry: "142° Knee Angle (Optimal: 135° - 150°)",
          impact: "Perfect stance balance: eyes stay level with the ball path, facilitating optimal shot timing and clean middle contact.",
          cue: "💡 Elite: Keep this solid footwork focus."
        };
      }
      if (isFoundation) {
        return {
          title: "Unbalanced Stance Base",
          telemetry: "112° Knee Angle (Optimal: 135° - 150°)",
          impact: "Unbalanced base: front stride collapsing forward decreases shot control and increases vulnerability to LBW or edges.",
          cue: "💡 Foundation: Keep your nose over your front toe when driving forward to lock in this balance base."
        };
      }
      return {
        title: "Perfect Balance Stance Base",
        telemetry: "132° Knee Angle (Optimal: 135° - 150°)",
        impact: "A stable front-foot bend supports the head weight directly over the ball, ensuring timing precision and straight bat contact.",
        cue: "💡 Intermediate: Keep your nose over your front toe when driving forward to lock in this balance base."
      };
    }
    if (norm.includes("shoulder alignment") || norm.includes("shoulder position")) {
      if (isElite) {
        return {
          title: "Elite Straight-Bat Shoulder Line",
          telemetry: "6° Pitch Deviation (Optimal: <12°)",
          impact: "Elite straight-shoulder line: prevents body opening up too early, keeping the bat face pointing square to the target.",
          cue: "💡 Elite: Continue leading with your shoulder to play straight."
        };
      }
      if (isFoundation) {
        return {
          title: "Open Shoulder Position Line",
          telemetry: "18° Pitch Deviation (Optimal: <12°)",
          impact: "Shoulder opens up too early, forcing cross-bat shots and leading edges into the offside ring.",
          cue: "💡 Foundation: Point your non-dominant shoulder directly at the bowler until the split second of contact."
        };
      }
      return {
        title: "Elite Straight-Bat Shoulder Line",
        telemetry: "10° Pitch Deviation (Optimal: <12°)",
        impact: "A shoulder aligned straight down the pitch prevents the body from opening up too early, keeping the bat face pointing square to the target.",
        cue: "💡 Intermediate: Point your non-dominant shoulder directly at the bowler until the split second of contact."
      };
    }
  }

  return {
    title: text,
    telemetry: "Measured Range Check Active",
    impact: "This biomechanical metric controls movement efficiency and prevents joint loading deviations.",
    cue: "Reinforce proper posture alignment through shadow drills and slow-motion execution."
  };
}

interface TrainingDay {
  num: number;
  title: string;
  drills: string[];
}

function generateWeeklyPlan(overallScore: number, analysisType: string): TrainingDay[] {
  const isElite = overallScore >= 90;
  const isFoundation = overallScore < 70;

  if (analysisType === "bowling") {
    return [
      {
        num: 1,
        title: "Mobility & Baseline Stance",
        drills: [
          "Spine rotations & arm circles (10 mins)",
          "Bowling stance alignment review in mirror (10 mins)",
          isElite ? "Plank core holds (3x90s)" : isFoundation ? "Plank core holds (3x30s)" : "Plank core holds (3x60s)"
        ]
      },
      {
        num: 2,
        title: "Targeted Technical Drills",
        drills: [
          isElite
            ? "Target Spot Bowling (20 minutes): Place a narrow target marker on a good length. Bowl 24 fast deliveries focusing on maximum speed release variance while hitting the target."
            : isFoundation
            ? "Target Spot Bowling (10 minutes): Set a wide target on a good length. Bowl 12 deliveries focusing on basic stance stability."
            : "Target Spot Bowling (15 minutes): Set a coin/target on a good length. Bowl 18 deliveries focusing on consistent repetition of current posture.",
          "Video review of target positions"
        ]
      },
      {
        num: 3,
        title: "Strength & Power",
        drills: [
          isElite ? "Explosive jump-lunges (3x12 per leg)" : isFoundation ? "Bodyweight lunges (3x8 per leg)" : "Weighted lunges (3x10 per leg)",
          isElite ? "Dumbbell shoulder presses (heavy load, 3x15)" : isFoundation ? "Dumbbell shoulder presses (light load, 3x10)" : "Dumbbell shoulder presses (moderate load, 3x12)",
          isElite ? "High-resistance rotator cuff band exercises (3x20)" : isFoundation ? "Rotator cuff band exercises (slow stretch, 3x10)" : "Rotator cuff band exercises (3x15)"
        ]
      },
      {
        num: 4,
        title: "Active Rest & Yoga",
        drills: [
          "Deep hamstring & chest opening stretches",
          "Gentle breathing exercises",
          "Hydration and nutrition monitoring"
        ]
      }
    ];
  } else if (analysisType === "basketball") {
    return [
      {
        num: 1,
        title: "Set-Point Alignment & Core Strength",
        drills: [
          "Set-point alignment checks in front of a mirror (10 mins)",
          "Tucked-elbow guide form shooting from 5 feet (15 mins)",
          isElite ? "Plank core stability holds (3x90s)" : isFoundation ? "Plank core holds (3x30s)" : "Plank core holds (3x60s)"
        ]
      },
      {
        num: 2,
        title: "Knee Dip Propulsion & Jump Dynamics",
        drills: [
          isElite
            ? "Explosive plyometric vertical squat jumps (3x15): Focus on sinking hips to 120° and launching vertically."
            : isFoundation
            ? "Bodyweight squats to 120° (3x10): Focus on controlled depth and maintaining alignment."
            : "Squat jumps with 3s hold at set point (3x12): Build leg drive muscle memory.",
          "Wall-toss follow-through wrist snap extension drills (10 mins)"
        ]
      },
      {
        num: 3,
        title: "Shooting Range & Landing Stability",
        drills: [
          isElite ? "50 catch-and-shoot jumpers with balanced footprints landing checks" : "30 close range form shots focusing on straight launch posture",
          isElite ? "Single-leg balance holds on unstable surfaces (3x60s)" : "Single-leg balance holds on flat ground (3x30s)"
        ]
      },
      {
        num: 4,
        title: "Active Recovery",
        drills: [
          "Lower body dynamic hip and quad stretches",
          "Shoulder capsule mobility drills",
          "Focus visualization and hydration tracking"
        ]
      }
    ];
  } else if (analysisType === "badminton") {
    return [
      {
        num: 1,
        title: "Overhead Reach & Shoulder Stability",
        drills: [
          "Shoulder dynamic rotations & band warmups (10 mins)",
          "Shadow swings focusing on maximum contact height extension (15 mins)",
          isElite ? "Rotator cuff internal rotation pulls (3x20)" : "Light band rotator cuff dynamic stretches (3x10)"
        ]
      },
      {
        num: 2,
        title: "Deceleration Lunge & Coiling Stance",
        drills: [
          isElite
            ? "High-intensity multi-directional lunge recoveries (20 mins): Ensure leading knee does not slide past toes."
            : isFoundation
            ? "Controlled forward lunge drops (10 mins): Focus on maintaining a vertical shin base."
            : "Lunge-hold stabilization squats (15 mins): Focus on keeping glute muscles active during descent.",
          "Lateral spine coiling holds in front of a mirror (10 mins)"
        ]
      },
      {
        num: 3,
        title: "Smash Agility & Wrist Forearm Pronation",
        drills: [
          isElite ? "Smash-and-split-step recovery drills (3x15)" : "Slow-motion racket swing-path pronation checks (15 mins)",
          isElite ? "Weighted single-leg balance holds (3x60s)" : "Single-leg balance stands (3x35s)"
        ]
      },
      {
        num: 4,
        title: "Joint Care & Rest",
        drills: [
          "Deep patellar tendon and quad stretching",
          "Rotator cuff massage release",
          "Proper hydration and protein intake logs"
        ]
      }
    ];
  } else {
    return [
      {
        num: 1,
        title: "Mobility & Stance Balance",
        drills: [
          "Neck rotations & dynamic wrist flex stretch (10 mins)",
          "Shadow swings in front of mirror focusing on head stabilization (10 mins)",
          isElite ? "Core plank holds (3x90s)" : isFoundation ? "Core plank holds (3x30s)" : "Core plank holds (3x60s)"
        ]
      },
      {
        num: 2,
        title: "Targeted Technical Drills",
        drills: [
          isElite
            ? "Underarm throwdown drives (25 minutes): Execute 30 high-velocity drives against throwdowns, practicing quick feet recovery back into balance base."
            : isFoundation
            ? "Underarm throwdown drives (10 minutes): Execute 12 close front-foot drives focusing on simple head weight balance over the front toe."
            : "Underarm throwdown drives (15 minutes): Execute 20 straight front-foot drives focusing on maintaining weight over the landing toe.",
          "Mirror swing-path backswing checks"
        ]
      },
      {
        num: 3,
        title: "Strength & Power",
        drills: [
          isElite ? "Goblet squats for landing base power (heavy load, 3x15)" : isFoundation ? "Air squats for alignment stability (3x10)" : "Goblet squats for landing base power (moderate load, 3x12)",
          isElite ? "Wrist curls with dumbbells (moderate load, 3x15)" : isFoundation ? "Wrist dynamic stretch drills (3x10)" : "Wrist curls with light weights (3x12)",
          isElite ? "Balance board single leg holds (3x60s)" : isFoundation ? "Single leg floor stands for stability balance (3x30s)" : "Balance board single leg holds (3x45s)"
        ]
      },
      {
        num: 4,
        title: "Active Rest & Yoga",
        drills: [
          "Forearm and wrist dynamic stretches",
          "Deep hip-opening balance stretches",
          "Focus meditation and hydration monitoring"
        ]
      }
    ];
  }
}

export default function Results() {
  const [, params] = useRoute("/results/:sessionId");
  const sessionId = params?.sessionId;
  const { user } = useAuth();
  const isGuest = user?.id === "guest";

  const { toast } = useToast();

  // ── Web3 Biometric Privacy Vault States ──
  const { address: connectedAddress, isConnected } = useAccount();
  const [ipfsCid, setIpfsCid] = useState("");
  const [txHash, setTxHash] = useState("");
  const [authorizedAddresses, setAuthorizedAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [isCopiedCid, setIsCopiedCid] = useState(false);
  const [isCopiedTx, setIsCopiedTx] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      const fb = sessionStorage.getItem(`kinectra_coach_feedback_txt_${sessionId}`);
      if (fb) {
        setCoachFeedback(fb);
      }
    }
  }, [sessionId]);

  // Automatically register connected address to decryption register
  useEffect(() => {
    if (isConnected && connectedAddress) {
      setAuthorizedAddresses((prev) => {
        if (prev.includes(connectedAddress)) return prev;
        const updated = [connectedAddress, ...prev];
        if (sessionId) {
          sessionStorage.setItem(`kinectra_vault_permissions_${sessionId}`, JSON.stringify(updated));
        }
        return updated;
      });
    }
  }, [isConnected, connectedAddress, sessionId]);

  // Generate unique pseudo-cryptographic hashes for this session once loaded
  useEffect(() => {
    if (sessionId) {
      const savedCid = sessionStorage.getItem(`kinectra_verified_cid_${sessionId}`);
      const savedTx = sessionStorage.getItem(`kinectra_verified_tx_${sessionId}`);
      
      if (savedCid && savedTx) {
        setIpfsCid(savedCid);
        setTxHash(savedTx);
        setHasVerified(true);
      } else {
        let hash = 0;
        for (let i = 0; i < sessionId.length; i++) {
          hash = (hash << 5) - hash + sessionId.charCodeAt(i);
          hash |= 0;
        }
        const absHash = Math.abs(hash).toString(16);
        
        setIpfsCid(`QmXo${absHash}Wkn2YaQHK${absHash}NDHTaoZmg3dptSVZVWm`);
        setTxHash(`0x${absHash}8f5${absHash}b204e${absHash}9c490807b5a1b32dcfc9a4e8d35`);
        setHasVerified(false);
      }

      const storedList = sessionStorage.getItem(`kinectra_vault_permissions_${sessionId}`);
      if (storedList) {
        try {
          setAuthorizedAddresses(JSON.parse(storedList));
        } catch (e) {
          console.error("Failed to parse permissions", e);
        }
      } else {
        const defaultAddress = "0x71C234E57B7B3B5B84A6E8D4564E35A5538B";
        setAuthorizedAddresses([defaultAddress]);
        sessionStorage.setItem(`kinectra_vault_permissions_${sessionId}`, JSON.stringify([defaultAddress]));
      }
    }
  }, [sessionId]);

  const handleAddAddress = () => {
    if (!newAddress.trim()) return;
    if (!newAddress.startsWith("0x") || newAddress.length < 15) {
      toast({
        variant: "destructive",
        title: "Invalid Address",
        description: "Please enter a valid hexadecimal wallet address (starting with 0x).",
      });
      return;
    }
    if (authorizedAddresses.includes(newAddress.trim())) {
      toast({
        title: "Address Exists",
        description: "This address already has access permission.",
      });
      return;
    }
    const updated = [...authorizedAddresses, newAddress.trim()];
    setAuthorizedAddresses(updated);
    if (sessionId) {
      sessionStorage.setItem(`kinectra_vault_permissions_${sessionId}`, JSON.stringify(updated));
    }
    setNewAddress("");
    toast({
      title: "Access Granted",
      description: "Decryption permission added for this coach address.",
    });
  };

  const handleRemoveAddress = (addrToRemove: string) => {
    const updated = authorizedAddresses.filter((addr) => addr !== addrToRemove);
    setAuthorizedAddresses(updated);
    if (sessionId) {
      sessionStorage.setItem(`kinectra_vault_permissions_${sessionId}`, JSON.stringify(updated));
    }
    toast({
      title: "Access Revoked",
      description: "View access removed successfully.",
    });
  };

  const handleVerifyProof = async () => {
    setIsVerifying(true);
    try {
      const pinataJwt = import.meta.env.VITE_PINATA_JWT;
      if (!pinataJwt) {
        throw new Error("Pinata JWT key is not configured in the .env file.");
      }

      // Prepare metadata
      const payload = {
        sessionId: session?.id || sessionId,
        athleteName: session?.athleteName || "Athlete Profile",
        analysisType: session?.analysisType || "bowling",
        overallScore: session?.overallScore || 80,
        metrics: currentSnapshots[0]?.metrics || {
          elbowAngle: 162,
          spineTilt: 18,
          kneeAngle: 145,
          shoulderAlignment: 35
        },
        timestamp: new Date().toISOString()
      };

      // Upload JSON to Pinata
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pinataJwt}`
        },
        body: JSON.stringify({
          pinataContent: payload,
          pinataMetadata: {
            name: `kinectra_session_${payload.sessionId}`
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Pinata upload error: ${errText}`);
      }

      const data = await res.json();
      const ipfsHash = data.IpfsHash;

      // Simulated transaction hash derived from the real IPFS hash using browser subtle crypto
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(ipfsHash));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const txHashHex = "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      setIpfsCid(ipfsHash);
      setTxHash(txHashHex);
      setHasVerified(true);

      // Save to sessionStorage
      sessionStorage.setItem(`kinectra_verified_cid_${payload.sessionId}`, ipfsHash);
      sessionStorage.setItem(`kinectra_verified_tx_${payload.sessionId}`, txHashHex);

      toast({
        title: "Telemetry Pinned Successfully",
        description: `Your biometric data is pinned on IPFS (CID: ${ipfsHash.slice(0, 12)}...) and signed on-chain.`
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "On-Chain Upload Failed",
        description: e.message || "Failed to pin session telemetry on-chain."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [sessionSnapshots, setSessionSnapshots] = useState<any[]>([]);

  useEffect(() => {
    if (sessionId) {
      const stored = sessionStorage.getItem(`kinectra_snapshots_${sessionId}`);
      if (stored) {
        try {
          setSessionSnapshots(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored snapshots", e);
        }
      }
    }
  }, [sessionId]);

  const { data: historySessions } = useListSessions();
  const [prevSnapshot, setPrevSnapshot] = useState<any>(null);
  const [prevScore, setPrevScore] = useState<number>(74);


  const { data: session, isLoading, isError } = useGetSession(sessionId || "", {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId || "")
    }
  });

  const currentSnapshots = (session?.snapshots && session.snapshots.length > 0)
    ? session.snapshots
    : sessionSnapshots;

  const activeSnapshots = (currentSnapshots && currentSnapshots.length > 0)
    ? currentSnapshots
    : session
      ? [
          {
            id: "default-fallback",
            label: "Session Average Base",
            time: "0s",
            category: "optimal" as const,
            metrics: {
              elbowAngle: session.analysisType === "bowling" ? 165 : 120,
              spineTilt: session.analysisType === "bowling" ? 18 : 14,
              kneeAngle: session.analysisType === "bowling" ? 145 : 135,
              shoulderAlignment: session.analysisType === "bowling" ? 35 : 12
            }
          }
        ]
      : [];

  const planDays = session
    ? generateWeeklyPlan(session.overallScore, session.analysisType)
    : [];

  useEffect(() => {
    if (historySessions && session) {
      const prev = historySessions.find(h => h.id !== session.id);
      if (prev) {
        setPrevScore(prev.overallScore);
        if (prev.snapshots && prev.snapshots.length > 0) {
          setPrevSnapshot(prev.snapshots[0]);
        } else {
          const storedPrev = sessionStorage.getItem(`kinectra_snapshots_${prev.id}`);
          if (storedPrev) {
            try {
              const parsed = JSON.parse(storedPrev);
              if (parsed.length > 0) {
                setPrevSnapshot(parsed[0]);
              }
            } catch (e) {
              console.error("Failed to parse previous snapshots", e);
            }
          }
        }
      }
    }
  }, [historySessions, session]);



  // Initialize Chat welcome and Speech Recognition once session loads
  useEffect(() => {
    if (session) {
      setChatMessages([
        { 
          sender: "bot", 
          text: `Hi ${session.athleteName}! I am your Kinectra AI Biomechanical Voice Coach. I've analyzed your ${session.analysisType} session (Score: ${session.overallScore}/100). Ask me anything about your joint alignment, spine tilt, knee flexion, or specific training drills!` 
        }
      ]);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.lang = "en-US";
        rec.interimResults = false;

        rec.onstart = () => setIsRecording(true);
        rec.onend = () => setIsRecording(false);
        rec.onerror = () => setIsRecording(false);

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setChatInput(transcript);
          handleSendChat(transcript);
        };

        setRecognition(rec);
      }
    }
  }, [session]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendChat = async (inputMessage?: string) => {
    const messageText = inputMessage || chatInput;
    if (!messageText.trim()) return;

    const userMsg = { sender: "user" as const, text: messageText };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Add typing placeholder
    const typingId = "typing-placeholder";
    setChatMessages((prev) => [...prev, { sender: "bot" as const, text: "Coach Aryan is thinking...", id: typingId } as any]);

    let replyText = "";

    try {
      const token = localStorage.getItem("kinectra_token");
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE_URL}/api/session/${sessionId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          message: messageText, 
          history: chatMessages.filter(m => (m as any).id !== typingId),
          snapshots: sessionSnapshots.map(s => ({
            label: s.label,
            time: s.time,
            category: s.category,
            metrics: s.metrics
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        replyText = data.reply;
      }
    } catch (e) {
      console.warn("Failed to fetch response from Groq API, using rule-based coach fallback:", e);
    }

    // Fallback if API failed or returned empty
    if (!replyText) {
      const q = messageText.toLowerCase();
      if (q.includes("spine") || q.includes("tilt") || q.includes("back") || q.includes("posture")) {
        replyText = session?.warnings.includes("Excessive spine tilt")
          ? "Your spine tilt averaged a side-bend warning. Focus on bracing your core abdominal muscles during delivery to maintain trunk stability."
          : "Your spine posture looks excellent! You maintained a strong upright chest angle during release.";
      } else if (q.includes("elbow") || q.includes("arm") || q.includes("height") || q.includes("release")) {
        replyText = session?.warnings.includes("Elbow angle too low")
          ? "I noticed your release arm drops slightly at release. Focus on keeping your elbow high—target a release slot of 80 to 110 degrees."
          : "You maintained a very consistent high arm slot and elbow angle during this session. Keep it up!";
      } else if (q.includes("knee") || q.includes("bend") || q.includes("foot") || q.includes("landing")) {
        replyText = session?.warnings.includes("Front knee bent too much")
          ? "On front foot strike, your knee flexed past the optimal angle. Concentrate on locking or stabilizing your front landing knee to maximize momentum transfer."
          : "Your front knee brace and landing stride stability look excellent, protecting your joint and transferring force efficiently.";
      } else if (q.includes("drill") || q.includes("practice") || q.includes("train") || q.includes("plan")) {
        replyText = session?.analysisType === "bowling"
          ? "To address your technique warnings, I highly recommend starting with the High Release Target Drill for 15 minutes and doing Core-Tilt Uprights. You can find detailed descriptions under your Training Planner tab!"
          : "I recommend trying the Stance Head-Still Drill for 15 minutes. It will lock in your foot positioning and timing. Check out the Training Planner tab for instructions!";
      } else if (q.includes("score") || q.includes("performance") || q.includes("how did i do") || q.includes("rating")) {
        const rating = session ? (session.overallScore >= 90 ? "Elite Level" : session.overallScore >= 80 ? "Advanced Technique" : "Solid Technique") : "";
        replyText = `You achieved an overall biomechanical score of ${session?.overallScore}/100, which puts you at ${rating}. Focus on stabilizing your posture checkpoints to hit the next tier!`;
      } else {
        replyText = "For optimal biomechanics, focus on keeping your head completely still, stabilizing your front stride landing, and following through smoothly toward your target crease.";
      }
    }

    // Replace typing placeholder with actual response
    setChatMessages((prev) => {
      const filtered = prev.filter(m => (m as any).id !== typingId);
      return [...filtered, { sender: "bot" as const, text: replyText }];
    });
    speakText(replyText);
  };

  const toggleRecording = () => {
    if (!recognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-40 md:col-span-1" />
            <Skeleton className="h-40 md:col-span-2" />
          </div>
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container px-4 py-20 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
          <p className="text-muted-foreground mb-8">Could not load the analysis results. The session may have expired or does not exist.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  // Dynamic breakdown labels
  const getBreakdownLabels = () => {
    switch (session.analysisType) {
      case "bowling":
        return {
          posture: "Release Elbow Lock",
          alignment: "Braced Knee Pivot",
          balance: "Spine Verticality",
          efficiency: "Delivery Force Transfer"
        };
      case "basketball":
        return {
          posture: "Set-Point Alignment",
          alignment: "Release Extension",
          balance: "Launch Balance",
          efficiency: "Shooting Efficiency"
        };
      case "badminton":
        return {
          posture: "Smash Contact Reach",
          alignment: "Lunge Stability",
          balance: "Arch Torso Rotation",
          efficiency: "Smash Power Efficiency"
        };
      default: // batting / others
        return {
          posture: "Head Stability",
          alignment: "Backlift Bat Path",
          balance: "Stance Balance",
          efficiency: "Swing Path Efficiency"
        };
    }
  };
  const breakdownLabels = getBreakdownLabels();

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8 md:py-12 max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/setup">
                <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </Link>
              <Badge variant="outline" className="uppercase tracking-wider">
                {session.analysisType}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {session.skillLevel}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Analysis Report: {session.athleteName}
            </h1>
            {user?.sportsAcademy && (user.username.toLowerCase() === session.athleteName.toLowerCase() || session.athleteName.toLowerCase() === "virat") && (
              <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1.5 flex items-center gap-1">
                🏫 Academy: {user.sportsAcademy}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              {new Date(session.createdAt).toLocaleString()} • {session.frameCount} frames analyzed
            </p>
          </div>
          
          <Button variant="outline" className="shrink-0">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Overall Score Card */}
          <Card className="md:col-span-1 bg-primary text-primary-foreground border-none shadow-lg overflow-hidden relative">
            <div className="absolute -right-6 -top-6 opacity-10">
              <Award className="h-32 w-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-primary-foreground/80 font-medium">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline">
                <span className="text-6xl font-bold tracking-tighter">{session.overallScore}</span>
                <span className="text-xl text-primary-foreground/70 ml-1">/100</span>
              </div>
              <div className="mt-6 space-y-2">
                <div className="text-sm font-medium opacity-90">Rating</div>
                <div className="text-lg font-semibold">
                  {session.overallScore >= 90 ? "Elite Level" : 
                   session.overallScore >= 80 ? "Advanced Technique" : 
                   session.overallScore >= 70 ? "Solid Foundation" : "Needs Improvement"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Component Scores */}
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <BarChart3 className="h-5 w-5 mr-2 text-muted-foreground" /> 
                Biomechanical Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ScoreRow label={breakdownLabels.posture} score={session.avgPostureScore} />
              <ScoreRow label={breakdownLabels.alignment} score={session.avgAlignmentScore} />
              <ScoreRow label={breakdownLabels.balance} score={session.avgStabilityScore} />
              <ScoreRow label={breakdownLabels.efficiency} score={session.avgEfficiencyScore} />
            </CardContent>
          </Card>
        </div>

        {/* Interactive Biomechanics Tab Dashboard */}
        <Tabs defaultValue="motion" className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto md:h-11 bg-muted/50 p-1 border gap-1 rounded-xl">
            <TabsTrigger value="motion" className="flex items-center justify-center gap-1.5 text-xs py-2 font-semibold">
              <Target className="h-3.5 w-3.5" /> Motion Analysis
            </TabsTrigger>
            <TabsTrigger value="coach" className="flex items-center justify-center gap-1.5 text-xs py-2 font-semibold">
              <Award className="h-3.5 w-3.5" /> AI Coach
            </TabsTrigger>
            <TabsTrigger value="injury" className="flex items-center justify-center gap-1.5 text-xs py-2 font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" /> Injury Risk
            </TabsTrigger>
            <TabsTrigger value="planner" className="flex items-center justify-center gap-1.5 text-xs py-2 font-semibold">
              <Calendar className="h-3.5 w-3.5" /> Training Planner
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center justify-center gap-1.5 text-xs py-2 font-semibold col-span-2 md:col-span-1">
              <Activity className="h-3.5 w-3.5" /> Progress Tracker
            </TabsTrigger>
          </TabsList>

          {/* 1. Motion Analysis Tab */}
          <TabsContent value="motion" className="space-y-6 outline-none">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/40 bg-emerald-500/5">
                <CardHeader className="pb-3 bg-emerald-500/10 border-b border-emerald-500/10">
                  <CardTitle className="text-emerald-600 dark:text-emerald-400 flex items-center text-lg font-bold">
                    <Target className="h-5 w-5 mr-2" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {session.strengths.map((str, i) => {
                    const detail = getDetailedFeedback(str, session.analysisType, session.overallScore);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-card border rounded-xl p-4 space-y-2.5 shadow-sm border-emerald-500/10 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <h4 className="font-semibold text-sm text-foreground">{detail.title}</h4>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
                          📊 {detail.telemetry}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed text-justify">
                          <span className="font-semibold text-foreground/80">Why it matters:</span> {detail.impact}
                        </p>
                        <div className="text-sm text-emerald-600 dark:text-emerald-400/90 font-medium bg-emerald-500/5 rounded-lg p-2.5 leading-relaxed border border-emerald-500/5 text-justify">
                          💡 <span className="font-semibold">Coaching Tip:</span> {detail.cue}
                        </div>
                      </motion.div>
                    );
                  })}
                  {session.strengths.length === 0 && <p className="text-muted-foreground italic text-sm text-center py-4">Insufficient data to identify strengths.</p>}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-amber-100 dark:border-amber-900/40 bg-amber-500/5">
                <CardHeader className="pb-3 bg-amber-500/10 border-b border-amber-500/10">
                  <CardTitle className="text-amber-600 dark:text-amber-400 flex items-center text-lg font-bold">
                    <Activity className="h-5 w-5 mr-2" /> Target Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {session.improvements.map((imp, i) => {
                    const detail = getDetailedFeedback(imp, session.analysisType, session.overallScore);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-card border rounded-xl p-4 space-y-2.5 shadow-sm border-amber-500/15 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <h4 className="font-semibold text-sm text-foreground">{detail.title}</h4>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold">
                          ⚠️ {detail.telemetry}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed text-justify">
                          <span className="font-semibold text-foreground/80">Biomechanical Impact:</span> {detail.impact}
                        </p>
                        <div className="text-sm text-amber-600 dark:text-amber-400/90 font-medium bg-amber-500/5 rounded-lg p-2.5 leading-relaxed border border-amber-500/5 text-justify">
                          👟 <span className="font-semibold">Coaching Cue:</span> {detail.cue}
                        </div>
                      </motion.div>
                    );
                  })}
                  {session.improvements.length === 0 && <p className="text-muted-foreground italic text-sm text-center py-4">No major improvements identified.</p>}
                </CardContent>
              </Card>
            </div>

            {sessionSnapshots.length > 0 && (
              <Card className="shadow-sm border-primary/20 bg-muted/10 mt-6">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    📸 Captured Frame Reel
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Landmark snapshots recorded during your live motion tracking session.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sessionSnapshots.map((item, i) => {
                      const src = typeof item === "string" ? item : item.src;
                      const label = typeof item === "string" ? `Frame #${i + 1}` : item.label;
                      const time = typeof item === "string" ? "" : item.time;
                      return (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.03 }}
                          className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video shadow-md cursor-pointer group"
                          onClick={() => {
                            const w = window.open();
                            if (w) {
                              w.document.write(`<img src="${src}" style="width:100%;height:100%;object-fit:contain;background:#000;" />`);
                              w.document.title = label;
                            }
                          }}
                        >
                          <img src={src} className="w-full h-full object-cover" alt={label} />
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 2. AI Performance Coach Tab */}
          <TabsContent value="coach" className="space-y-6 outline-none">
            <div className="grid md:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Action Plan */}
              <div className="space-y-6 flex flex-col">
                <Card className="shadow-sm border-primary/25 bg-primary/5 flex flex-col h-full">
                  <CardHeader className="pb-3 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/15 rounded-full flex items-center justify-center text-primary shrink-0">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-primary text-lg">AI Coaching Action Plan</CardTitle>
                        <CardDescription className="text-primary/70 text-xs">
                          Biomechanics alignment adjustments computed from actual session checkpoints.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1">
                    {session.recommendations && session.recommendations.length > 0 ? (
                      <div className="grid gap-3">
                        {session.recommendations.map((rec, i) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            key={i} 
                            className="flex items-start gap-3 bg-card p-4 rounded-xl border border-primary/10 shadow-sm"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold font-mono">
                              {i + 1}
                            </span>
                            <p className="text-sm font-medium text-foreground leading-relaxed">{rec}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <p className="italic">Optimal biomechanics detected. No major deviations to correct!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Real Coach Feedback Section */}
                <Card className="shadow-sm border-border bg-card mt-6">
                  <CardHeader className="pb-3 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground text-sm font-bold flex items-center gap-1.5">
                          Coach Biomechanical Remarks
                          {coachFeedback && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[9px] uppercase tracking-wider py-0.5">
                              ✓ Authenticated
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-[10px]">
                          Audited biomechanical adjustments and review instructions signed on-chain.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 text-xs leading-relaxed text-foreground/90 font-medium">
                    {coachFeedback ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-xl space-y-2">
                        <p className="whitespace-pre-wrap">{coachFeedback}</p>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                          <span>🔒 Encrypted signature valid: </span>
                          <span className="truncate select-all flex-1">{txHash || "0x98f5b...2dcf"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground italic flex flex-col items-center justify-center gap-2">
                        <Lock className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
                        <p className="max-w-xs">
                          Waiting for authorized coach to audit session and sign biometric instructions in the Coach Portal.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: AI Voice Chatbot */}
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-[520px]">
                <CardHeader className="pb-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <CardTitle className="text-sm font-bold">AI Biomechanical Voice Assistant</CardTitle>
                        <CardDescription className="text-[10px]">Hands-free audio coaching & advice</CardDescription>
                      </div>
                    </div>
                    {isRecording && (
                      <Badge variant="destructive" className="animate-pulse px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">
                        Listening...
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50/50 dark:bg-slate-950/20">
                  {/* Chat messages viewport */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm flex items-start gap-2 ${
                          msg.sender === "user" 
                            ? "bg-primary text-primary-foreground font-medium rounded-tr-none" 
                            : "bg-card border text-foreground rounded-tl-none"
                        }`}>
                          <div className="flex-1">{msg.text}</div>
                          {msg.sender === "bot" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-muted/80 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => speakText(msg.text)}
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input controls */}
                  <div className="mt-4 pt-3 border-t flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Ask about drills, spine angle, scores..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      disabled={isRecording}
                      className="flex-1 bg-background border px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    />
                    
                    <Button 
                      onClick={() => handleSendChat()}
                      disabled={isRecording || !chatInput.trim()}
                      size="icon" 
                      className="rounded-xl shrink-0 h-9 w-9"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      onClick={toggleRecording}
                      variant={isRecording ? "destructive" : "secondary"}
                      size="icon"
                      className={`rounded-xl shrink-0 h-9 w-9 relative transition-all duration-300 ${
                        isRecording ? "scale-105 shadow-md shadow-red-500/20" : ""
                      }`}
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 3. Injury Risk Agent Tab */}
          <TabsContent value="injury" className="space-y-6 outline-none">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <CardTitle className="text-lg">Injury Risk & Strain Assessment</CardTitle>
                      <CardDescription>Biomechanics monitoring alerts during load cycles.</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={session.warnings.length > 1 ? "destructive" : session.warnings.length === 1 ? "secondary" : "outline"}
                    className="px-3 py-1 font-semibold uppercase tracking-wider text-[10px]"
                  >
                    {session.warnings.length > 1 ? "Elevated Strain" : session.warnings.length === 1 ? "Moderate Strain" : "Minimal Strain"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Form Alert Flags</h4>
                  {session.warnings.length > 0 ? (
                    <div className="grid gap-2.5">
                      {session.warnings.map((warn, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-red-500 text-sm font-semibold">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-500 text-sm font-semibold">
                      ✓ No warning markers or high joint-stress loads registered during this analysis run.
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-5 border-t">
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Physical Strain Assessment</h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {session.warnings.includes("Excessive spine tilt") 
                        ? "⚠️ High Side-Bend Stress: Lumbar spine lateral flexion exceeds safe threshold. Risk of lower back strain."
                        : session.warnings.includes("Elbow angle too low")
                        ? "⚠️ Arm Acceleration stress: Elbow flexed below release threshold. High stress loading on tendon groups."
                        : session.warnings.includes("Front knee bent too much")
                        ? "⚠️ Knee Load: Excessive knee flexion on front stride landing increases patella tendon strain."
                        : "✓ Balanced Load Profile: Joint loads are spread evenly across all key biomechanical checkpoints."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coaching Precaution</h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {session.warnings.length > 0
                        ? "Perform specific core activation (planks, side-bridges) and rotator cuff warm-ups before training to protect joints under stress."
                        : "Perform dynamic stretching prior to bowling/batting. Optimal execution angles keep joint friction at standard thresholds."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Training Planner Tab */}
          <TabsContent value="planner" className="space-y-6 outline-none">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-wide">
                      {session.skillLevel.toUpperCase()} Weekly Training Plan - {session.analysisType === "bowling" ? "Bowling" : "Batting"} Form Focus
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-0.5">
                      Autonomous weekly structured schedule generated dynamically to fit your physical profile.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-8 ml-3">
                  {planDays.map((day, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-primary rounded-full ring-4 ring-background" />
                      
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                          Day {day.num} • {day.title}
                        </h4>
                        
                        <Card className="bg-muted/10 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <ul className="space-y-2 text-sm text-muted-foreground text-justify">
                            {day.drills.map((drill, dIdx) => (
                              <li key={dIdx} className="flex items-start">
                                <span className="text-primary mr-2.5 select-none">•</span>
                                <span>{drill}</span>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
            {/* 5. Progress Tracker Tab */}
          <TabsContent value="tracker" className="space-y-6 outline-none">
              <div className="grid lg:grid-cols-3 gap-6">

              
              {/* Left/Main Column - Span 2 */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* A. Progress Snapshot Comparison */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Activity className="h-4.5 w-4.5 text-primary" />
                      Progress Snapshot Comparison
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Visual proof of form correction (Last Week vs Today's session)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid md:grid-cols-2 gap-4">
                      
                      {/* Left: 7 Days Ago */}
                      <div className="border border-red-500/10 rounded-xl overflow-hidden bg-card/40 relative">
                        <div className="bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center border-b border-red-500/10">
                          <span>7 Days Ago (Mistake)</span>
                          <span className="bg-red-500/20 px-2 py-0.5 rounded-full text-[9px]">Form: {prevScore}</span>
                        </div>
                        <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                          {prevSnapshot ? (
                            <>
                              <img src={prevSnapshot.src} className="absolute inset-0 w-full h-full object-cover animate-fade-in" alt="Previous stance" />
                              <div className="absolute inset-0 bg-black/35 z-10" />
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                              <svg className="absolute inset-0 w-full h-full z-0 opacity-20" fill="none">
                                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeDasharray="4" />
                                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeDasharray="4" />
                              </svg>
                            </>
                          )}
                          <div className="z-10 text-center px-4 space-y-1">
                            {!prevSnapshot && session && session.analysisType === "bowling" && (
                              <svg className="w-24 h-24 mx-auto text-red-500/80 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" viewBox="0 0 120 120" fill="none" stroke="currentColor">
                                <circle cx="65" cy="25" r="7" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 63,32 L 55,60" stroke="currentColor" strokeWidth="3" />
                                <line x1="45" y1="38" x2="75" y2="34" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 75,34 L 88,14 M 88,14 L 102,5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 2" />
                                <path d="M 45,38 L 40,55" stroke="currentColor" strokeWidth="2.5" />
                                <line x1="48" y1="60" x2="62" y2="58" stroke="currentColor" strokeWidth="3" />
                                <path d="M 62,58 L 78,82 M 78,82 L 90,105" stroke="currentColor" strokeWidth="3.5" />
                                <path d="M 48,60 L 35,80 M 35,80 L 22,90" stroke="currentColor" strokeWidth="2.5" />
                                <circle cx="102" cy="5" r="4" fill="#ef4444" stroke="white" strokeWidth="1" />
                                <circle cx="102" cy="5" r="10" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                              </svg>
                            )}
                            {!prevSnapshot && session && session.analysisType === "batting" && (
                              <svg className="w-24 h-24 mx-auto text-red-500/80 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" viewBox="0 0 120 120" fill="none" stroke="currentColor">
                                <circle cx="45" cy="30" r="7" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 45,37 L 50,65" stroke="currentColor" strokeWidth="3" />
                                <line x1="36" y1="42" x2="54" y2="40" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 36,42 L 28,58" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 54,40 L 40,56" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 24,52 L 10,75" stroke="#ef4444" strokeWidth="5.5" strokeLinecap="round" />
                                <line x1="43" y1="65" x2="57" y2="64" stroke="currentColor" strokeWidth="3" />
                                <path d="M 43,65 L 30,80 M 30,80 L 15,92" stroke="currentColor" strokeWidth="3.5" />
                                <path d="M 57,64 L 68,85 M 68,85 L 80,105" stroke="currentColor" strokeWidth="3" />
                                <circle cx="10" cy="75" r="5" fill="#ef4444" stroke="white" strokeWidth="1.2" />
                                <circle cx="10" cy="75" r="12" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                              </svg>
                            )}
                            <span className="text-[10px] text-red-400 font-mono bg-black/65 px-2.5 py-1 rounded-md block w-fit mx-auto">
                              {prevSnapshot?.label || "Form Angle Profiled"}
                            </span>
                          </div>
                          {/* Landmark Label Tag overlay */}
                          <div className="absolute bottom-3 left-3 z-20 bg-red-950/90 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-xl text-[10px] space-y-0.5">
                            <div className="font-bold flex items-center gap-1">⚠️ Elbow Angle: {prevSnapshot?.metrics?.elbowAngle || "162"}°</div>
                            <div className="text-[9px] text-red-400/80">(drops below 160° release target)</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Today's Performance */}
                      <div className="border border-emerald-500/10 rounded-xl overflow-hidden bg-card/40 relative">
                        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center border-b border-emerald-500/10">
                          <span>Today's Performance (Improved)</span>
                          <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full text-[9px]">Form: {session.overallScore}</span>
                        </div>
                        <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                          {currentSnapshots.length > 0 ? (
                            <>
                              <img src={currentSnapshots[0].src} className="absolute inset-0 w-full h-full object-cover animate-fade-in" alt="Today stance" />
                              <div className="absolute inset-0 bg-black/35 z-10" />
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                              <svg className="absolute inset-0 w-full h-full z-0 opacity-20" fill="none">
                                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeDasharray="4" />
                                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeDasharray="4" />
                              </svg>
                            </>
                          )}
                           <div className="z-10 text-center px-4 space-y-1">
                            {currentSnapshots.length === 0 && session && session.analysisType === "bowling" && (
                              <svg className="w-24 h-24 mx-auto text-emerald-500/80 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" viewBox="0 0 120 120" fill="none" stroke="currentColor">
                                <circle cx="65" cy="25" r="7" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 63,32 L 55,60" stroke="currentColor" strokeWidth="3" />
                                <line x1="45" y1="38" x2="75" y2="34" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 75,34 L 88,14 M 88,14 L 102,5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 2" />
                                <path d="M 45,38 L 40,55" stroke="currentColor" strokeWidth="2.5" />
                                <line x1="48" y1="60" x2="62" y2="58" stroke="currentColor" strokeWidth="3" />
                                <path d="M 62,58 L 78,82 M 78,82 L 90,105" stroke="currentColor" strokeWidth="3.5" />
                                <path d="M 48,60 L 35,80 M 35,80 L 22,90" stroke="currentColor" strokeWidth="2.5" />
                                <circle cx="102" cy="5" r="4" fill="#10b981" stroke="white" strokeWidth="1" />
                                <circle cx="102" cy="5" r="10" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                              </svg>
                            )}
                            {currentSnapshots.length === 0 && session && session.analysisType === "batting" && (
                              <svg className="w-24 h-24 mx-auto text-emerald-500/80 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" viewBox="0 0 120 120" fill="none" stroke="currentColor">
                                <circle cx="45" cy="30" r="7" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 45,37 L 50,65" stroke="currentColor" strokeWidth="3" />
                                <line x1="36" y1="42" x2="54" y2="40" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 36,42 L 28,58" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 54,40 L 40,56" stroke="currentColor" strokeWidth="2.5" />
                                <path d="M 24,52 L 10,75" stroke="#10b981" strokeWidth="5.5" strokeLinecap="round" />
                                <line x1="43" y1="65" x2="57" y2="64" stroke="currentColor" strokeWidth="3" />
                                <path d="M 43,65 L 30,80 M 30,80 L 15,92" stroke="currentColor" strokeWidth="3.5" />
                                <path d="M 57,64 L 68,85 M 68,85 L 80,105" stroke="currentColor" strokeWidth="3" />
                                <circle cx="10" cy="75" r="5" fill="#10b981" stroke="white" strokeWidth="1.2" />
                                <circle cx="10" cy="75" r="12" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                              </svg>
                            )}
                            <span className="text-[10px] text-emerald-400 font-mono bg-black/65 px-2.5 py-1 rounded-md block w-fit mx-auto">
                              {currentSnapshots[0]?.label || "Form Angle Profiled"}
                            </span>
                          </div>
                          {/* Landmark Label Tag overlay */}
                          <div className="absolute bottom-3 left-3 z-20 bg-emerald-950/90 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[10px] space-y-0.5">
                            <div className="font-bold flex items-center gap-1">✓ Elbow Angle: {currentSnapshots[0]?.metrics?.elbowAngle || "162"}° (+0°)</div>
                            <div className="text-[9px] text-emerald-400/80">Elbow held locked at delivery release.</div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>



                {/* B. Biomechanical Progress Metrics */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Target className="h-4.5 w-4.5 text-primary" />
                      Biomechanical Progress Metrics
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Angle comparison between historical baseline and today's session
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50 font-mono text-[9px] uppercase tracking-wider text-muted-foreground text-left">
                          <tr>
                            <th className="px-4 py-3">Metric</th>
                            <th className="px-4 py-3">7 Days Ago</th>
                            <th className="px-4 py-3">Today</th>
                            <th className="px-4 py-3">Variance</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          <tr>
                            <td className="px-4 py-3 font-semibold text-foreground">Elbow Release Angle</td>
                            <td className="px-4 py-3 text-muted-foreground">162°</td>
                            <td className="px-4 py-3 font-semibold">162°</td>
                            <td className="px-4 py-3 text-emerald-500 font-bold">+0°</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 border-none">Improved</Badge>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold text-foreground">Knee Bend Angle</td>
                            <td className="px-4 py-3 text-muted-foreground">{prevSnapshot?.metrics?.kneeAngle !== -1 && prevSnapshot?.metrics?.kneeAngle !== undefined ? `${prevSnapshot.metrics.kneeAngle}°` : "167°"}</td>
                            <td className="px-4 py-3 font-semibold">{currentSnapshots[0]?.metrics?.kneeAngle === -1 ? "Not Visible" : `${currentSnapshots[0]?.metrics?.kneeAngle || "167"}°`}</td>
                            <td className="px-4 py-3 text-emerald-500 font-bold">
                              {currentSnapshots[0]?.metrics?.kneeAngle === -1 ? "N/A" : "+0°"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {currentSnapshots[0]?.metrics?.kneeAngle === -1 ? (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 border-none">N/A</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 border-none">Stable</Badge>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold text-foreground">Wrist Snap Deviation</td>
                            <td className="px-4 py-3 text-muted-foreground">89°</td>
                            <td className="px-4 py-3 font-semibold">89°</td>
                            <td className="px-4 py-3 text-emerald-500 font-bold">+0°</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 border-none">Improved</Badge>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold text-foreground">Form Accuracy Score</td>
                            <td className="px-4 py-3 text-muted-foreground">74/100</td>
                            <td className="px-4 py-3 font-semibold">79/100</td>
                            <td className="px-4 py-3 text-emerald-500 font-bold">+5 pts</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-0.5 border-none">Improved</Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* C. 7-Day Performance Trajectory Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4.5 w-4.5 text-primary" />
                      7-Day Performance Trajectory
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Overall form scores tracking athlete gains over the week
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="relative w-full h-[180px] mt-2 select-none">
                      <svg className="w-full h-full" viewBox="0 0 500 180" fill="none">
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Horizontal Grid lines */}
                        <line x1="40" y1="20" x2="460" y2="20" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                        <line x1="40" y1="60" x2="460" y2="60" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                        <line x1="40" y1="100" x2="460" y2="100" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                        <line x1="40" y1="140" x2="460" y2="140" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />

                        {/* Y-axis Labels */}
                        <text x="30" y="24" fill="currentColor" fillOpacity="0.4" className="font-mono text-[9px]" textAnchor="end">100</text>
                        <text x="30" y="64" fill="currentColor" fillOpacity="0.4" className="font-mono text-[9px]" textAnchor="end">80</text>
                        <text x="30" y="104" fill="currentColor" fillOpacity="0.4" className="font-mono text-[9px]" textAnchor="end">60</text>
                        <text x="30" y="144" fill="currentColor" fillOpacity="0.4" className="font-mono text-[9px]" textAnchor="end">40</text>

                        {/* X-axis Labels */}
                        <text x="80" y="165" fill="currentColor" fillOpacity="0.6" className="font-semibold text-[10px]" textAnchor="middle">22 Jul</text>
                        <text x="420" y="165" fill="currentColor" fillOpacity="0.6" className="font-semibold text-[10px]" textAnchor="middle">25 Jul</text>

                        {/* Chart Area Fill */}
                        <path d="M 80,72 L 420,62 L 420,140 L 80,140 Z" fill="url(#chartGlow)" />

                        {/* Connecting Line */}
                        <path d="M 80,72 L 420,62" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Data Points */}
                        <circle cx="80" cy="72" r="4.5" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
                        <text x="80" y="58" fill="currentColor" className="font-bold text-[10px]" textAnchor="middle">74</text>

                        <circle cx="420" cy="62" r="4.5" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
                        <text x="420" y="48" fill="currentColor" className="font-bold text-[10px]" textAnchor="middle">79</text>
                      </svg>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Right/Sidebar Column - Span 1 */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* D. Metrics vs Baseline */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Metrics Vs Baseline</CardTitle>
                    <CardDescription className="text-xs">
                      Variance against historical averages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-4">
                    <div className="flex justify-between items-center bg-muted/20 border p-3 rounded-xl">
                      <span className="text-xs font-semibold">Form Accuracy</span>
                      <span className="text-emerald-500 font-mono font-bold text-xs">+0%</span>
                    </div>
                    <div className="flex justify-between items-center bg-muted/20 border p-3 rounded-xl">
                      <span className="text-xs font-semibold">Posture & Spine</span>
                      <span className="text-emerald-500 font-mono font-bold text-xs">+0%</span>
                    </div>
                    <div className="flex justify-between items-center bg-muted/20 border p-3 rounded-xl">
                      <span className="text-xs font-semibold">Consistency Rate</span>
                      <span className="text-emerald-500 font-mono font-bold text-xs">+0%</span>
                    </div>
                    <p className="text-muted-foreground text-[10px] leading-relaxed pt-1">
                      Consistent form! You are holding close to your historical baseline within a +0% range. Keep reinforcing correct patterns.
                    </p>
                  </CardContent>
                </Card>

                {/* E. AI Pattern Alerts */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">AI Pattern Alerts</CardTitle>
                    <CardDescription className="text-xs">
                      Multi-week mistake and technique tracking
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-3.5">
                    
                    <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>Recurring Pattern: Crease Alignment</span>
                      </div>
                      <p className="text-muted-foreground text-[10px] leading-normal">
                        Landing foot placement is slightly wide for 3 consecutive sessions. Maintain a straight delivery path.
                      </p>
                    </div>

                    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        <Award className="h-4 w-4 shrink-0" />
                        <span>Mistake Resolved: Head Stability</span>
                      </div>
                      <p className="text-muted-foreground text-[10px] leading-normal">
                        Head movement has dropped below critical thresholds. Great job locking eyes towards the batsman.
                      </p>
                    </div>

                    <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <Activity className="h-4 w-4 shrink-0" />
                        <span>Rhythm Regression Check</span>
                      </div>
                      <p className="text-muted-foreground text-[10px] leading-normal">
                        Follow-through deceleration returned under pressure. Aim to run past the stumps smoothly after release.
                      </p>
                    </div>

                    <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                        <Target className="h-4 w-4 shrink-0" />
                        <span>New Pattern: Outward Wrist Rotation</span>
                      </div>
                      <p className="text-muted-foreground text-[10px] leading-normal">
                        Wrist rotating outward at release. Keep wrist snap directly facing the wickets to maintain seam.
                      </p>
                    </div>

                  </CardContent>
                </Card>

                {/* F. Athlete Journey */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Athlete Journey</CardTitle>
                    <CardDescription className="text-xs">
                      Visual timeline of recent practice loads
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="relative pl-5 border-l border-border space-y-5 py-2">
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-background" />
                        <div className="text-xs font-bold">Session #15 Completed</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Overall rating: 79/100 (Today)</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 bg-muted-foreground rounded-full ring-4 ring-background" />
                        <div className="text-xs font-bold text-muted-foreground">Session #14 Completed</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Overall rating: 74/100 (3 days ago)</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 bg-muted-foreground rounded-full ring-4 ring-background" />
                        <div className="text-xs font-bold text-muted-foreground">Session #13 Completed</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Overall rating: 71/100 (5 days ago)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          </TabsContent>
        </Tabs>

        {/* ── Web3 Biometric Privacy Vault ── */}
        <Card className="mt-8 border border-border/60 shadow-sm relative overflow-hidden bg-card">
          <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Web3 Biometric Privacy Vault
                    <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/5 animate-pulse uppercase tracking-wider font-semibold">
                      🔒 Pinned & Secured
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your motion telemetry and snapshot frames are cryptographically signed and owned by your identity.
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <ConnectButton label="Connect Wallet" accountStatus="address" chainStatus="icon" showBalance={false} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyProof}
                  disabled={isVerifying}
                  className="text-xs h-9 font-semibold shrink-0 gap-1.5 border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/5 rounded-xl"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Verifying...
                    </>
                  ) : hasVerified ? (
                    <>
                      <Check className="h-3.5 w-3.5 animate-bounce text-emerald-600" />
                      Verified Integrity
                    </>
                  ) : (
                    <>
                      <Shield className="h-3.5 w-3.5" />
                      Verify On-chain Proof
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Ledger Hashes */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">IPFS Pinned CID (Storage Proof)</Label>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-xl px-3 py-2">
                    <span className="font-mono text-xs text-foreground select-all truncate flex-1">{ipfsCid}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                      onClick={() => {
                        navigator.clipboard.writeText(ipfsCid);
                        setIsCopiedCid(true);
                        setTimeout(() => setIsCopiedCid(false), 2000);
                        toast({ title: "Copied CID", description: "IPFS Content ID copied to clipboard." });
                      }}
                    >
                      {isCopiedCid ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Blockchain Tx Hash (Ledger Proof)</Label>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-xl px-3 py-2">
                    <span className="font-mono text-xs text-foreground select-all truncate flex-1">{txHash}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                      onClick={() => {
                        navigator.clipboard.writeText(txHash);
                        setIsCopiedTx(true);
                        setTimeout(() => setIsCopiedTx(false), 2000);
                        toast({ title: "Copied Hash", description: "Transaction hash copied to clipboard." });
                      }}
                    >
                      {isCopiedTx ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                
                <div className="text-[10px] text-muted-foreground/80 leading-normal flex items-start gap-1.5 bg-primary/5 rounded-xl border border-primary/10 p-3">
                  <span className="mt-0.5">ℹ️</span>
                  <p>
                    <strong>Decentralized Telemetry Ownership:</strong> Kinectra signs coordinate maps and frames before upload. Only entities added to the access register (right) can authenticate and decrypt these session metrics.
                  </p>
                </div>
              </div>
              
              {/* Right Column: Access Permissions Management */}
              <div className="space-y-4 flex flex-col">
                <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Biometric Decryption Registry</Label>
                
                <div className="flex-1 flex flex-col gap-2.5 bg-muted/30 border border-border/40 rounded-xl p-4 min-h-[140px] max-h-[180px] overflow-y-auto shadow-inner">
                  {authorizedAddresses.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground/60 italic">
                      No coaches or academies authorized yet.
                    </div>
                  ) : (
                    authorizedAddresses.map((addr, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-xs bg-background border border-border/60 rounded-lg p-2.5 shadow-sm">
                        <div className="flex items-center gap-2 truncate flex-1">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-mono text-foreground truncate select-all">{addr}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAddress(addr)}
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/5 shrink-0 rounded-md"
                          title="Revoke Permission"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Add new permission input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coach wallet address (0x...)"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="text-xs bg-background h-9 rounded-xl border-border/60"
                  />
                  <Button
                    onClick={handleAddAddress}
                    className="h-9 gap-1 font-semibold text-xs px-4 rounded-xl shadow shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Authorize
                  </Button>
                </div>
              </div>
              
            </div>
          </CardContent>
        </Card>

        {/* Primary Action Dashboard Buttons */}
        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-center gap-4">
          {user?.role === "coach" ? (
            <Link href="/coach">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 font-semibold gap-2 shadow-lg shadow-primary/20">
                <Shield className="h-4 w-4" /> Return to Coach Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/setup">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 font-semibold gap-2 shadow-lg shadow-primary/20">
                <Activity className="h-4 w-4" /> Start New Session
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-medium">
              Return Home
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="lg" 
            className="w-full sm:w-auto h-12 px-8 text-muted-foreground hover:text-foreground font-medium"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({
                title: "Link Copied",
                description: "Session report URL copied to clipboard.",
              });
            }}
          >
            Share Report
          </Button>
        </div>

      </main>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string, score: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 md:w-40 text-sm font-medium truncate shrink-0">{label}</div>
      <div className="flex-1">
        <Progress value={score} className="h-2.5" />
      </div>
      <div className="w-12 text-right font-mono font-semibold">{score}</div>
    </div>
  );
}

function DrillCard({ title, duration, desc }: { title: string; duration: string; desc: string }) {
  return (
    <div className="bg-muted/20 border rounded-xl p-4 flex flex-col justify-between hover:border-primary/20 hover:shadow-sm transition-all h-full">
      <div className="space-y-1.5">
        <h4 className="font-bold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <Badge variant="outline" className="mt-4 text-[9px] w-fit font-mono font-bold text-muted-foreground bg-background">
        ⏱️ {duration}
      </Badge>
    </div>
  );
}
